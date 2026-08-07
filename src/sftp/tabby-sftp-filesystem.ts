import { Readable, Writable } from 'stream';
import type { FileEntry, IFileSystem } from '../filesystem/models';

/** Minimal subset of Tabby's SFTP API used by this adapter. */
export interface TabbySftpFile {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  isSymlink: boolean;
  mode: number;
  size: number;
  modified: Date;
}

interface TabbySftpFileHandle {
  read(): Promise<Uint8Array>;
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface TabbySftpSession {
  readdir(path: string): Promise<TabbySftpFile[]>;
  stat(path: string): Promise<TabbySftpFile>;
  open(path: string, mode: number): Promise<TabbySftpFileHandle>;
  rmdir(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  chmod(path: string, mode: string | number): Promise<void>;
}

// SFTP v3 open flags used by russh (the transport behind Tabby's SSH plugin).
const OPEN_READ = 0x00000001;
const OPEN_WRITE = 0x00000002;
const OPEN_CREATE = 0x00000008;
const OPEN_TRUNCATE = 0x00000010;
type SFTPFileHandle = Awaited<ReturnType<TabbySftpSession['open']>>;

/** Adapts Tabby's already-authenticated SFTP session to SFTP-XP's filesystem API. */
export class TabbySftpFileSystem implements IFileSystem {
  readonly kind = 'remote' as const;

  constructor(
    private readonly session: TabbySftpSession,
    private readonly homePath: string,
  ) {}

  async home(): Promise<string> {
    return this.homePath;
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    // SFTP readdir returns the directory's immediate children and their metadata
    // in one request; no per-entry stat or descendant traversal is necessary.
    return (await this.session.readdir(dirPath))
      .filter((entry) => entry.name !== '.' && entry.name !== '..')
      .map((entry) => this.#toFileEntry(entry));
  }

  async stat(entryPath: string): Promise<FileEntry> {
    return this.#toFileEntry(await this.session.stat(entryPath));
  }

  async mkdir(dirPath: string): Promise<void> {
    await this.session.mkdir(dirPath);
  }

  async createFile(filePath: string): Promise<void> {
    await this.writeFile(filePath, Buffer.alloc(0));
  }

  async remove(entryPath: string, isDirectory: boolean): Promise<void> {
    if (!isDirectory) {
      await this.session.unlink(entryPath);
      return;
    }
    for (const entry of await this.list(entryPath)) {
      await this.remove(entry.path, entry.isDirectory);
    }
    await this.session.rmdir(entryPath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.session.rename(oldPath, newPath);
  }

  async chmod(entryPath: string, mode: number): Promise<void> {
    await this.session.chmod(entryPath, mode);
  }

  async readFile(filePath: string): Promise<Buffer> {
    const handle = await this.session.open(filePath, OPEN_READ);
    const chunks: Buffer[] = [];
    try {
      while (true) {
        const chunk = await handle.read();
        if (!chunk.length) {
          break;
        }
        chunks.push(Buffer.from(chunk));
      }
    } finally {
      await handle.close();
    }
    return Buffer.concat(chunks);
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    const handle = await this.session.open(filePath, OPEN_WRITE | OPEN_CREATE | OPEN_TRUNCATE);
    try {
      await handle.write(data);
    } finally {
      await handle.close();
    }
  }

  createReadStream(filePath: string): Readable {
    let handle: SFTPFileHandle | null = null;
    const output = new Readable({ read: () => undefined });
    void (async () => {
      try {
        handle = await this.session.open(filePath, OPEN_READ);
        while (true) {
          const chunk = await handle.read();
          if (!chunk.length) {
            break;
          }
          output.push(Buffer.from(chunk));
        }
        output.push(null);
      } catch (error) {
        output.destroy(error instanceof Error ? error : new Error(String(error)));
      } finally {
        await handle?.close();
      }
    })();
    return output;
  }

  createWriteStream(filePath: string): Writable {
    const handle = this.session.open(filePath, OPEN_WRITE | OPEN_CREATE | OPEN_TRUNCATE);
    return new Writable({
      write: (chunk, _encoding, callback) => {
        void handle.then((file) => file.write(Buffer.from(chunk))).then(() => callback(), callback);
      },
      final: (callback) => {
        void handle.then((file) => file.close()).then(() => callback(), callback);
      },
    });
  }

  join(...parts: string[]): string {
    return parts.join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  dirname(path: string): string {
    const index = path.replace(/\/$/, '').lastIndexOf('/');
    return index <= 0 ? '/' : path.slice(0, index);
  }

  basename(path: string): string {
    return path.replace(/\/$/, '').split('/').pop() || '/';
  }

  #toFileEntry(entry: TabbySftpFile): FileEntry {
    return {
      name: entry.name,
      path: entry.fullPath,
      isDirectory: entry.isDirectory,
      isSymlink: entry.isSymlink,
      size: entry.size,
      mtime: entry.modified.getTime(),
      mode: entry.mode,
    };
  }
}
