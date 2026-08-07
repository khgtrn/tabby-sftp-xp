import { IFileSystem } from '../filesystem/models';
export interface ClipboardEntry {
    op: 'copy' | 'cut';
    fs: IFileSystem;
    path: string;
    isDirectory: boolean;
}
/** Shared clipboard so copy/cut can be pasted across the local and remote panels. */
export declare class ClipboardService {
    #private;
    set(entry: ClipboardEntry): void;
    get(): ClipboardEntry | null;
    clear(): void;
}
//# sourceMappingURL=clipboard.service.d.ts.map