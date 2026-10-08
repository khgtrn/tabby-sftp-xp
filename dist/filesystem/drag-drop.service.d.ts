import { IFileSystem } from './models';
export interface DragPayloadEntry {
    path: string;
    isDirectory: boolean;
}
export interface DragPayload {
    fs: IFileSystem;
    entries: DragPayloadEntry[];
}
/** Shared drag payload so an entry dragged out of one panel can be dropped onto the other. */
export declare class DragDropService {
    #private;
    set(payload: DragPayload): void;
    get(): DragPayload | null;
    clear(): void;
}
