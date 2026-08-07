import { Injectable } from '@angular/core';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as nodePath from 'path';
import { Readable, Writable } from 'stream';
import { FileEntry, IFileSystem } from './models';

/** Filesystem implementation backed by the local machine (Node `fs`). */
@Injectable({ providedIn: 'root' })
export class LocalFsService implements IFileSystem {
  readonly kind = 'local' as const;

  async home(): Promise<string> {
    return os.homedir();
  }

  async list(dirPath: string): Promise<FileEntry[]> {
    // `readdir` itself is shallow. Dirents also let us identify symlinks without
    // following them, keeping the listing to one metadata lookup per child.
    const children = await fsp.readdir(dirPath, { withFileTypes: true });
    const entries = await Promise.all(
      children.map(async (child) => {
        const entryPath = this.join(dirPath, child.name);
        try {
          const stats = await fsp.lstat(entryPath);
          return this.#toFileEntry(entryPath, stats, child.isDirectory(), child.isSymbolicLink());
        } catch {
          // The entry may disappear between readdir and lstat, or be inaccessible.
          return null;
        }
      }),
    );
    return entries.filter((entry): entry is FileEntry => entry !== null);
  }

  async stat(entryPath: string): Promise<FileEntry> {
    const stats = await fsp.lstat(entryPath);
    return this.#toFileEntry(entryPath, stats, stats.isDirectory(), stats.isSymbolicLink());
  }

  #toFileEntry(
    entryPath: string,
    stats: fs.Stats,
    isDirectory: boolean,
    isSymlink: boolean,
  ): FileEntry {
    return {
      name: this.basename(entryPath),
      path: entryPath,
      isDirectory,
      isSymlink,
      size: stats.size,
      mtime: stats.mtimeMs,
      mode: stats.mode & 0o777,
      owner: stats.uid,
      group: stats.gid,
    };
  }

  async mkdir(dirPath: string): Promise<void> {
    await fsp.mkdir(dirPath, { recursive: true });
  }

  async createFile(filePath: string): Promise<void> {
    const handle = await fsp.open(filePath, 'wx');
    await handle.close();
  }

  async remove(entryPath: string, isDirectory: boolean): Promise<void> {
    if (isDirectory) {
      await fsp.rm(entryPath, { recursive: true, force: true });
    } else {
      await fsp.unlink(entryPath);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsp.rename(oldPath, newPath);
  }

  async chmod(entryPath: string, mode: number): Promise<void> {
    await fsp.chmod(entryPath, mode);
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fsp.readFile(filePath);
  }

  async writeFile(filePath: string, data: Buffer): Promise<void> {
    await fsp.mkdir(this.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, data);
  }

  createReadStream(filePath: string): Readable {
    return fs.createReadStream(filePath);
  }

  createWriteStream(filePath: string): Writable {
    return fs.createWriteStream(filePath);
  }

  join(...parts: string[]): string {
    return nodePath
      .join(...parts)
      .split(nodePath.sep)
      .join('/');
  }

  dirname(p: string): string {
    return nodePath.dirname(p);
  }

  basename(p: string): string {
    return nodePath.basename(p);
  }
}
