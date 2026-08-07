import { Injectable } from '@angular/core';
import * as fsp from 'fs/promises';
import { BehaviorSubject } from 'rxjs';
import { getBookmarksFile, getConfigDir } from '../core/paths';
import { Bookmark } from './bookmark.model';

/** Persists user-defined path bookmarks to `~/.config/tabby-sftp/bookmarks.json`. */
@Injectable({ providedIn: 'root' })
export class BookmarkService {
  #bookmarks$ = new BehaviorSubject<Bookmark[]>([]);
  #loaded = false;

  get all$() {
    return this.#bookmarks$.asObservable();
  }

  get all(): Bookmark[] {
    return this.#bookmarks$.value;
  }

  async load(): Promise<Bookmark[]> {
    if (this.#loaded) {
      return this.all;
    }
    try {
      const raw = await fsp.readFile(getBookmarksFile(), 'utf-8');
      this.#bookmarks$.next(JSON.parse(raw));
    } catch {
      this.#bookmarks$.next([]);
    }
    this.#loaded = true;
    return this.all;
  }

  async add(name: string, path: string, side: Bookmark['side']): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      path,
      side,
    };
    await this.#persist([...this.all, bookmark]);
    return bookmark;
  }

  async update(
    id: string,
    changes: Partial<Pick<Bookmark, 'name' | 'path' | 'side'>>,
  ): Promise<void> {
    await this.#persist(this.all.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  }

  async remove(id: string): Promise<void> {
    await this.#persist(this.all.filter((b) => b.id !== id));
  }

  async #persist(bookmarks: Bookmark[]): Promise<void> {
    await fsp.mkdir(getConfigDir(), { recursive: true });
    await fsp.writeFile(getBookmarksFile(), JSON.stringify(bookmarks, null, 2), 'utf-8');
    this.#bookmarks$.next(bookmarks);
  }
}
