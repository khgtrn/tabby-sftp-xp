import { Readable, Writable } from 'stream';
import { Observable, ReplaySubject } from 'rxjs';
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
    /** Present on Tabby's SFTPSession; optional so older builds still work without link targets. */
    readlink?(path: string): Promise<string>;
    open(path: string, mode: number): Promise<TabbySftpFileHandle>;
    rmdir(path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    unlink(path: string): Promise<void>;
    chmod(path: string, mode: string | number): Promise<void>;
}
/** Subset of russh's exec channel, as returned by Tabby's `sshSession.ssh.activateChannel()`. */
interface SshExecChannel {
    readonly data$: Observable<Uint8Array>;
    readonly extendedData$: Observable<[number, Uint8Array]>;
    readonly closed$: Observable<void>;
    requestExec(command: string): Promise<void>;
    close(): Promise<void>;
}
/** Subset of russh's AuthenticatedSSHClient (`sshSession.ssh` in Tabby). */
export interface TabbySshClient {
    openSessionChannel(): Promise<unknown>;
    activateChannel(channel: unknown): Promise<SshExecChannel>;
}
/** Runs a command on the remote host and resolves with its combined stdout/stderr. */
export type RemoteExec = (command: string) => Promise<string>;
/** Opens a fresh exec channel on Tabby's existing SSH connection for each command. */
export declare function createRemoteExec(ssh: TabbySshClient): RemoteExec;
/** Adapts Tabby's already-authenticated SFTP session to SFTP-XP's filesystem API. */
export declare class TabbySftpFileSystem implements IFileSystem {
    #private;
    private readonly session;
    private readonly homePath;
    readonly kind: "remote";
    readonly disconnected$: ReplaySubject<string>;
    /**
     * Tabby's SFTP session (russh) has no symlink request, so links are created with
     * `ln -s` over the same SSH connection. Undefined when no exec channel is available.
     */
    readonly symlink?: (targetPath: string, linkPath: string) => Promise<void>;
    constructor(session: TabbySftpSession, homePath: string, exec?: RemoteExec);
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
