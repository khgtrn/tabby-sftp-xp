import { Readable, Writable } from 'stream';

/** A single file or directory entry, coming from either the local FS or a remote SFTP session. */
export interface FileEntry {
  name: string;
  /** Absolute, normalized path (always using `/` as separator). */
  path: string;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  /** Last modified time, ms since epoch. */
  mtime: number;
  /** POSIX permission bits, e.g. 0o755. */
  mode: number;
  owner?: string | number;
  group?: string | number;
}

/** Options needed to open a dedicated SFTP connection (independent of the SSH terminal session). */
export interface SftpConnectionOptions {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export type FileSystemKind = 'local' | 'remote';

/**
 * Common contract implemented by both the local filesystem and a remote SFTP session,
 * so the explorer panel UI can work with either side identically.
 */
export interface IFileSystem {
  readonly kind: FileSystemKind;
  home(): Promise<string>;
  /** Returns direct children only. Implementations must never traverse descendants. */
  list(dirPath: string): Promise<FileEntry[]>;
  stat(entryPath: string): Promise<FileEntry>;
  mkdir(dirPath: string): Promise<void>;
  createFile(filePath: string): Promise<void>;
  remove(entryPath: string, isDirectory: boolean): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  chmod(entryPath: string, mode: number): Promise<void>;
  readFile(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, data: Buffer): Promise<void>;
  createReadStream(filePath: string): Readable;
  createWriteStream(filePath: string): Writable;
  join(...parts: string[]): string;
  dirname(p: string): string;
  basename(p: string): string;
}

/** Result of a permission dialog / octal parsing helpers. */
export interface PosixPermissions {
  ownerRead: boolean;
  ownerWrite: boolean;
  ownerExecute: boolean;
  groupRead: boolean;
  groupWrite: boolean;
  groupExecute: boolean;
  otherRead: boolean;
  otherWrite: boolean;
  otherExecute: boolean;
}

export function modeToPermissions(mode: number): PosixPermissions {
  const bits = mode & 0o777;
  return {
    ownerRead: !!(bits & 0o400),
    ownerWrite: !!(bits & 0o200),
    ownerExecute: !!(bits & 0o100),
    groupRead: !!(bits & 0o040),
    groupWrite: !!(bits & 0o020),
    groupExecute: !!(bits & 0o010),
    otherRead: !!(bits & 0o004),
    otherWrite: !!(bits & 0o002),
    otherExecute: !!(bits & 0o001),
  };
}

export function permissionsToMode(p: PosixPermissions): number {
  let mode = 0;
  if (p.ownerRead) {
    mode |= 0o400;
  }
  if (p.ownerWrite) {
    mode |= 0o200;
  }
  if (p.ownerExecute) {
    mode |= 0o100;
  }
  if (p.groupRead) {
    mode |= 0o040;
  }
  if (p.groupWrite) {
    mode |= 0o020;
  }
  if (p.groupExecute) {
    mode |= 0o010;
  }
  if (p.otherRead) {
    mode |= 0o004;
  }
  if (p.otherWrite) {
    mode |= 0o002;
  }
  if (p.otherExecute) {
    mode |= 0o001;
  }
  return mode;
}

export function modeToOctalString(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, '0');
}
