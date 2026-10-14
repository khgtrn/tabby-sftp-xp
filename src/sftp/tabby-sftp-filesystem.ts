import { Readable, Writable } from 'stream';
import { Observable, ReplaySubject } from 'rxjs';
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
  /** Present on Tabby's SFTPSession; optional so older builds still work without link targets. */
  readlink?(path: string): Promise<string>;
  open(path: string, mode: number): Promise<TabbySftpFileHandle>;
  rmdir(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  chmod(path: string, mode: string | number): Promise<void>;
}

/** Subset of russh's exec channel, as returned by Tabby's `sshSession.ssh.activateChannel()`. */
interface SshExecChannel {
  readonly data$: Observable<Uint8Array>;
  readonly extendedData$: Observable<[number, Uint8Array]>;
  readonly closed$: Observable<void>;
  requestExec(command: string): Promise<void>;
  close(): Promise<void>;
}

/** Subset of russh's AuthenticatedSSHClient (`sshSession.ssh` in Tabby). */
export interface TabbySshClient {
  openSessionChannel(): Promise<unknown>;
  activateChannel(channel: unknown): Promise<SshExecChannel>;
}

/** Runs a command on the remote host and resolves with its combined stdout/stderr. */
export type RemoteExec = (command: string) => Promise<string>;

const EXEC_TIMEOUT_MS = 15_000;

/** Opens a fresh exec channel on Tabby's existing SSH connection for each command. */
export function createRemoteExec(ssh: TabbySshClient): RemoteExec {
  return async (command) => {
    const channel = await ssh.activateChannel(await ssh.openSessionChannel());
    const chunks: Uint8Array[] = [];
    const subscriptions = [
      channel.data$.subscribe((data) => chunks.push(data)),
      channel.extendedData$.subscribe(([, data]) => chunks.push(data)),
    ];
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Remote command timed out')),
          EXEC_TIMEOUT_MS,
        );
        const finish = () => {
          clearTimeout(timer);
          resolve();
        };
        subscriptions.push(channel.closed$.subscribe({ next: finish, complete: finish }));
        channel.requestExec(command).catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
    } finally {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      await channel.close().catch(() => undefined);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
  };
}

/** POSIX single-quote escaping for one shell argument. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const SYMLINK_OK_MARKER = '__SFTP_XP_SYMLINK_OK__';

// SFTP v3 open flags used by russh (the transport behind Tabby's SSH plugin).
const OPEN_READ = 0x00000001;
const OPEN_WRITE = 0x00000002;
const OPEN_CREATE = 0x00000008;
const OPEN_TRUNCATE = 0x00000010;
type SFTPFileHandle = Awaited<ReturnType<TabbySftpSession['open']>>;

/** Adapts Tabby's already-authenticated SFTP session to SFTP-XP's filesystem API. */
export class TabbySftpFileSystem implements IFileSystem {
  readonly kind = 'remote' as const;
  readonly disconnected$ = new ReplaySubject<string>(1);

  /**
   * Tabby's SFTP session (russh) has no symlink request, so links are created with
   * `ln -s` over the same SSH connection. Undefined when no exec channel is available.
   */
  readonly symlink?: (targetPath: string, linkPath: string) => Promise<void>;

  #connected = true;

  constructor(
    private readonly session: TabbySftpSession,
    private readonly homePath: string,
    exec?: RemoteExec,
  ) {
    if (exec) {
      this.symlink = async (targetPath, linkPath) => {
        // `ln` has no reliable exit status over this channel API, so success is a marker.
        const output = await exec(
          `ln -s -- ${shellQuote(targetPath)} ${shellQuote(linkPath)} && echo ${SYMLINK_OK_MARKER}`,
        );
        if (!output.includes(SYMLINK_OK_MARKER)) {
          throw new Error(output.trim() || 'Failed to create symlink');
        }
      };
    }
  }

  get connected(): boolean {
    return this.#connected;
  }

  markDisconnected(reason: string): void {
    if (!this.#connected) {
      return;
    }
    this.#connected = false;
    this.disconnected$.next(reason);
    this.disconnected$.complete();
  }

  async home(): Promise<string> {
    return this.homePath;
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    // SFTP readdir returns the directory's immediate children and their metadata
    // in one request; no per-entry stat or descendant traversal is necessary.
    const entries = (await this.session.readdir(dirPath))
      .filter((entry) => entry.name !== '.' && entry.name !== '..')
      .map((entry) => this.#toFileEntry(entry));
    await this.#resolveLinkTargets(entries);
    return entries;
  }

  /** One extra readlink request per symlink only; regular entries cost nothing. */
  async #resolveLinkTargets(entries: FileEntry[]): Promise<void> {
    const readlink = this.session.readlink?.bind(this.session);
    if (!readlink) {
      return;
    }
    await Promise.all(
      entries
        .filter((entry) => entry.isSymlink)
        .map(async (entry) => {
          entry.linkTarget = await readlink(entry.path).catch(() => undefined);
        }),
    );
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
