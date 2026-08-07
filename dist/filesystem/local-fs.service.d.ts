import { Readable, Writable } from 'stream';
import { FileEntry, IFileSystem } from './models';
/** Filesystem implementation backed by the local machine (Node `fs`). */
export declare class LocalFsService implements IFileSystem {
    #private;
    readonly kind: "local";
    home(): Promise<string>;
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
//# sourceMappingURL=local-fs.service.d.ts.map