import { Injectable } from '@angular/core';
import { IFileSystem } from '../filesystem/models';

export interface ClipboardEntry {
  op: 'copy' | 'cut';
  fs: IFileSystem;
  path: string;
  isDirectory: boolean;
}

/** Shared clipboard so copy/cut can be pasted across the local and remote panels. */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  #entry: ClipboardEntry | null = null;

  set(entry: ClipboardEntry): void {
    this.#entry = entry;
  }

  get(): ClipboardEntry | null {
    return this.#entry;
  }

  clear(): void {
    this.#entry = null;
  }
}
