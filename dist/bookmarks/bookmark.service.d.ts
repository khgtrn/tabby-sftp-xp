import { Bookmark } from './bookmark.model';
/** Persists user-defined path bookmarks to `~/.config/tabby-sftp/bookmarks.json`. */
export declare class BookmarkService {
    #private;
    get all$(): import("rxjs").Observable<Bookmark[]>;
    get all(): Bookmark[];
    load(): Promise<Bookmark[]>;
    add(name: string, path: string, side: Bookmark['side']): Promise<Bookmark>;
    update(id: string, changes: Partial<Pick<Bookmark, 'name' | 'path' | 'side'>>): Promise<void>;
    remove(id: string): Promise<void>;
}
