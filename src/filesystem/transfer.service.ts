import { Injectable } from '@angular/core';
import { pipeline } from 'stream/promises';
import { IFileSystem } from './models';

/**
 * Implements copy/cut between any two filesystems (local->local, remote->remote,
 * local->remote, remote->local), as described in Function.md.
 */
@Injectable({ providedIn: 'root' })
export class TransferService {
  async copy(
    source: IFileSystem,
    sourcePath: string,
    dest: IFileSystem,
    destDir: string,
  ): Promise<void> {
    const entry = await source.stat(sourcePath);
    const destPath = await this.#getAvailablePath(dest, destDir, entry.name, entry.isDirectory);
    await this.#copyToPath(source, sourcePath, entry, dest, destPath);
  }

  async #copyToPath(
    source: IFileSystem,
    sourcePath: string,
    entry: Awaited<ReturnType<IFileSystem['stat']>>,
    dest: IFileSystem,
    destPath: string,
  ): Promise<void> {
    if (entry.isDirectory) {
      await dest.mkdir(destPath);
      const children = await source.list(sourcePath);
      for (const child of children) {
        await this.#copyToPath(source, child.path, child, dest, dest.join(destPath, child.name));
      }
    } else {
      await pipeline(source.createReadStream(sourcePath), dest.createWriteStream(destPath));
    }
  }

  /**
   * Returns the original destination when it is free, otherwise inserts a numeric
   * suffix before the extension: file.txt -> file.1.txt -> file.2.txt.
   */
  async #getAvailablePath(
    dest: IFileSystem,
    destDir: string,
    name: string,
    isDirectory: boolean,
  ): Promise<string> {
    const existingNames = new Set((await dest.list(destDir)).map((entry) => entry.name));
    if (!existingNames.has(name)) {
      return dest.join(destDir, name);
    }

    const extensionIndex = isDirectory ? -1 : name.lastIndexOf('.');
    const hasExtension = extensionIndex > 0;
    const stem = hasExtension ? name.slice(0, extensionIndex) : name;
    const extension = hasExtension ? name.slice(extensionIndex) : '';

    for (let suffix = 1; ; suffix++) {
      const candidate = `${stem}.${suffix}${extension}`;
      if (!existingNames.has(candidate)) {
        return dest.join(destDir, candidate);
      }
    }
  }

  async move(
    source: IFileSystem,
    sourcePath: string,
    dest: IFileSystem,
    destDir: string,
  ): Promise<void> {
    if (source === dest) {
      const entry = await source.stat(sourcePath);
      const normalizedSourcePath = source.join(sourcePath);
      const normalizedDestPath = source.join(destDir, entry.name);
      const isSamePath =
        source.kind === 'local'
          ? normalizedSourcePath.toLowerCase() === normalizedDestPath.toLowerCase()
          : normalizedSourcePath === normalizedDestPath;

      // Pasting a cut entry back into its current directory only cancels the cut.
      // Calling SFTP rename(path, path) returns a generic Failure on many servers.
      if (isSamePath) {
        return;
      }

      await source.rename(sourcePath, normalizedDestPath);
      return;
    }
    await this.copy(source, sourcePath, dest, destDir);
    const entry = await source.stat(sourcePath);
    await source.remove(sourcePath, entry.isDirectory);
  }
}
