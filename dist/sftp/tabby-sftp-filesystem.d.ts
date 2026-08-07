import { Readable, Writable } from 'stream';
import { ReplaySubject } from 'rxjs';
import type { FileEntry, IFileSystem } from '../filesystem/models';
/** Minimal subset of Tabby's SFTP API used by this adapter. */
export interface TabbySftpFile {
    name: string;
    fullPath: string;
    isDirectory: boolean;
    isSymlink: boolean;
    mode: number;
    size: number;
    modified: Date;
}
interface TabbySftpFileHandle {
    read(): Promise<Uint8Array>;
    write(chunk: Uint8Array): Promise<void>;
    close(): Promise<void>;
}
export interface TabbySftpSession {
    readdir(path: string): Promise<TabbySftpFile[]>;
    stat(path: string): Promise<TabbySftpFile>;
    open(path: string, mode: number): Promise<TabbySftpFileHandle>;
    rmdir(path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    unlink(path: string): Promise<void>;
    chmod(path: string, mode: string | number): Promise<void>;
}
/** Adapts Tabby's already-authenticated SFTP session to SFTP-XP's filesystem API. */
export declare class TabbySftpFileSystem implements IFileSystem {
    #private;
    private readonly session;
    private readonly homePath;
    readonly kind: "remote";
    readonly disconnected$: ReplaySubject<string>;
    constructor(session: TabbySftpSession, homePath: string);
    get connected(): boolean;
    markDisconnected(reason: string): void;
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
    dirname(path: string): string;
    basename(path: string): string;
}
export {};
