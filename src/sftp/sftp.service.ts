import { Injectable } from '@angular/core'
import { Client, SFTPWrapper } from 'ssh2'
import { Readable, Writable } from 'stream'
import { randomBytes } from 'crypto'
import { FileEntry, IFileSystem, SftpConnectionOptions } from '../filesystem/models'
import { shellQuotePosix } from '../core/shell-quote'

/** Thrown by `SftpConnection.writePrivileged` specifically when `sudo` rejected the password, so callers can tell it apart from any other remote failure. */
export class SudoAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SudoAuthError'
  }
}

/** A single, live SFTP session over its own dedicated SSH2 connection. */
export class SftpConnection implements IFileSystem {
  readonly kind = 'remote' as const

  constructor(
    private readonly client: Client,
    private readonly sftp: SFTPWrapper,
    readonly password?: string,
  ) {}

  async home(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.sftp.realpath('.', (err, absPath) => {
        if (err) { reject(err); return }
        resolve(absPath)
      })
    })
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    const items = await new Promise<any[]>((resolve, reject) => {
      this.sftp.readdir(dirPath, (err, list) => {
        if (err) { reject(err); return }
        resolve(list)
      })
    })
    // ssh2 includes attributes in the shallow readdir response, so avoid an
    // additional lstat call for every direct child.
    return items
      .filter(item => item.filename !== '.' && item.filename !== '..')
      .map(item => this.#toFileEntry(this.join(dirPath, item.filename), item.attrs, item.filename))
  }

  async stat(entryPath: string): Promise<FileEntry> {
    const attrs = await new Promise<any>((resolve, reject) => {
      this.sftp.lstat(entryPath, (err, stats) => {
        if (err) { reject(err); return }
        resolve(stats)
      })
    })
    return this.#toFileEntry(entryPath, attrs, this.basename(entryPath))
  }

  async mkdir(dirPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.sftp.mkdir(dirPath, err => err ? reject(err) : resolve())
    })
  }

  async createFile(filePath: string): Promise<void> {
    await this.writeFile(filePath, Buffer.alloc(0))
  }

  async remove(entryPath: string, isDirectory: boolean): Promise<void> {
    if (isDirectory) {
      const entries = await this.list(entryPath)
      for (const entry of entries) {
        await this.remove(entry.path, entry.isDirectory)
      }
      await new Promise<void>((resolve, reject) => {
        this.sftp.rmdir(entryPath, err => err ? reject(err) : resolve())
      })
    } else {
      await new Promise<void>((resolve, reject) => {
        this.sftp.unlink(entryPath, err => err ? reject(err) : resolve())
      })
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.sftp.rename(oldPath, newPath, err => err ? reject(err) : resolve())
    })
  }

  async chmod(entryPath: string, mode: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.sftp.chmod(entryPath, mode, err => err ? reject(err) : resolve())
    })
  }

  async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = this.sftp.createReadStream(filePath)
      stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const stream = this.sftp.createWriteStream(filePath)
      stream.on('error', reject)
      stream.on('close', () => resolve())
      stream.end(data)
    })
  }

  /**
   * Re-attempts a write with `sudo`, over the same SSH connection. Stages
   * `data` in an unprivileged remote temp file (created exclusively, with
   * owner-only permissions set atomically — see the design notes above),
   * then copies it into place with a privileged `dd` that reads the temp
   * file by path — so the exec channel's stdin carries only the sudo
   * password, never file content.
   */
  async writePrivileged(remotePath: string, data: Buffer, password: string): Promise<void> {
    const tempPath = `/tmp/.sftp-xp-sudo-${randomBytes(16).toString('hex')}`
    let tempFileCreated = false
    try {
      await this.writeFileExclusive(tempPath, data)
      tempFileCreated = true
      await new Promise<void>((resolve, reject) => {
        const command = `sudo -S -p '' dd if=${shellQuotePosix(tempPath)} of=${shellQuotePosix(remotePath)} status=none`
        this.client.exec(command, (err, stream) => {
          if (err) {
            reject(err)
            return
          }
          let stderr = ''
          let exitCode: number | null = null
          // Drain stdout so the channel can reach 'close' — a paused
          // Readable that's never read never emits 'end', which ssh2's
          // channel-close handling waits on.
          stream.resume()
          stream.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString()
          })
          stream.on('exit', (code: number) => {
            exitCode = code
          })
          stream.on('close', () => {
            if (exitCode === 0) {
              resolve()
              return
            }
            if (/incorrect password|try again|no password was provided/i.test(stderr)) {
              reject(new SudoAuthError(stderr.trim() || 'Incorrect sudo password'))
            } else {
              reject(new Error(stderr.trim() || `sudo exited with code ${exitCode ?? 'unknown'}`))
            }
          })
          stream.stdin.write(`${password}\n`)
          stream.stdin.end()
        })
      })
    } finally {
      // Only clean up a file this call actually created — if
      // writeFileExclusive itself failed (e.g. a path collision), there is
      // nothing of ours to remove, and the path might belong to something
      // else entirely.
      if (tempFileCreated) {
        await this.remove(tempPath, false).catch(() => undefined)
      }
    }
  }

  /**
   * Creates `path` exclusively (fails rather than silently overwriting if it
   * already exists) with owner-only permissions set atomically at creation
   * — there is never a window where the file exists with more permissive
   * (e.g. default-umask) access.
   */
  private async writeFileExclusive(path: string, data: Buffer): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const stream = this.sftp.createWriteStream(path, { flags: 'wx', mode: 0o600 })
      stream.on('error', reject)
      stream.on('close', () => resolve())
      stream.end(data)
    })
  }

  createReadStream(filePath: string): Readable {
    return this.sftp.createReadStream(filePath) as unknown as Readable
  }

  createWriteStream(filePath: string): Writable {
    return this.sftp.createWriteStream(filePath) as unknown as Writable
  }

  join(...parts: string[]): string {
    return parts
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/'
  }

  dirname(p: string): string {
    const idx = p.replace(/\/$/, '').lastIndexOf('/')
    return idx <= 0 ? '/' : p.slice(0, idx)
  }

  basename(p: string): string {
    const parts = p.replace(/\/$/, '').split('/')
    return parts[parts.length - 1] || '/'
  }

  disconnect(): void {
    this.client.end()
  }

  #toFileEntry(path: string, attrs: any, name: string): FileEntry {
    const isDirectory = typeof attrs.isDirectory === 'function'
      ? attrs.isDirectory()
      : (attrs.mode & 0o170000) === 0o040000
    const isSymlink = typeof attrs.isSymbolicLink === 'function'
      ? attrs.isSymbolicLink()
      : (attrs.mode & 0o170000) === 0o120000
    return {
      name,
      path,
      isDirectory,
      isSymlink,
      size: attrs.size ?? 0,
      mtime: (attrs.mtime ?? 0) * 1000,
      mode: attrs.mode & 0o777,
      owner: attrs.uid,
      group: attrs.gid,
    }
  }
}

/** Opens and keeps track of dedicated SFTP connections, independent of any terminal session. */
@Injectable({ providedIn: 'root' })
export class SftpConnectionManager {
  #connections = new Map<string, SftpConnection>()

  async connect(options: SftpConnectionOptions): Promise<SftpConnection> {
    const client = new Client()
    const connection = await new Promise<SftpConnection>((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) { reject(err); return }
          resolve(new SftpConnection(client, sftp, options.password))
        })
      })
      client.on('error', reject)
      client.connect({
        host: options.host,
        port: options.port ?? 22,
        username: options.username,
        password: options.password,
        privateKey: options.privateKey,
        passphrase: options.passphrase,
        readyTimeout: 20000,
      })
    })
    const id = `${options.host}:${options.port ?? 22}:${options.username}:${Date.now()}`
    this.#connections.set(id, connection)
    return connection
  }

  disconnect(connection: SftpConnection): void {
    for (const [id, conn] of this.#connections.entries()) {
      if (conn === connection) {
        this.#connections.delete(id)
      }
    }
    connection.disconnect()
  }
}
