import { Injectable } from '@angular/core';
import * as fsp from 'fs/promises';
import * as nodePath from 'path';
import { ConfigService } from 'tabby-core';
import { IFileSystem } from '../filesystem/models';

/** Handles the remote file -> local temp file -> editor -> remote file workflow. */
@Injectable({ providedIn: 'root' })
export class EditorCacheService {
  readonly #sessionDirs = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  get #tempRoot(): string {
    return this.config.store.sftpXp.tempFolder;
  }

  /** Downloads a remote file into a session-scoped local temp file. */
  async download(fs: IFileSystem, remotePath: string, sessionTag: string): Promise<string> {
    const localPath = await this.#localPathFor(remotePath, sessionTag);
    const data = await fs.readFile(remotePath);
    await fsp.writeFile(localPath, data);
    return localPath;
  }

  /** Uploads an edited local temp file back to its remote path. */
  async upload(fs: IFileSystem, localPath: string, remotePath: string): Promise<void> {
    const data = await fsp.readFile(localPath);
    await fs.writeFile(remotePath, data);
  }

  async readLocal(localPath: string): Promise<string> {
    return fsp.readFile(localPath, 'utf-8');
  }

  async writeLocal(localPath: string, content: string): Promise<void> {
    await fsp.writeFile(localPath, content, 'utf-8');
  }

  async cleanupSession(sessionTag: string): Promise<void> {
    const sessionDir =
      this.#sessionDirs.get(sessionTag) ?? nodePath.join(this.#tempRoot, sessionTag);

    await fsp.rm(sessionDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    this.#sessionDirs.delete(sessionTag);
  }

  async #localPathFor(remotePath: string, sessionTag: string): Promise<string> {
    const safeName = remotePath.replace(/^\/+/, '').replace(/[/\\:]/g, '_') || 'file';
    const dir = nodePath.join(this.#tempRoot, sessionTag);
    this.#sessionDirs.set(sessionTag, dir);
    await fsp.mkdir(dir, { recursive: true });
    return nodePath.join(dir, safeName);
  }
}
