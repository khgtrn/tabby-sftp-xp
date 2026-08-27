import { Injectable } from '@angular/core';
import { IFileSystem } from './models';

export interface DragPayload {
  fs: IFileSystem;
  path: string;
  isDirectory: boolean;
}

/** Shared drag payload so an entry dragged out of one panel can be dropped onto the other. */
@Injectable({ providedIn: 'root' })
export class DragDropService {
  #payload: DragPayload | null = null;

  set(payload: DragPayload): void {
    this.#payload = payload;
  }

  get(): DragPayload | null {
    return this.#payload;
  }

  clear(): void {
    this.#payload = null;
  }
}
