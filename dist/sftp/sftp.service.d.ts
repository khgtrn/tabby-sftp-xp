import { Client, SFTPWrapper } from 'ssh2';
import { Readable, Writable } from 'stream';
import { FileEntry, IFileSystem, SftpConnectionOptions } from '../filesystem/models';
/** A single, live SFTP session over its own dedicated SSH2 connection. */
export declare class SftpConnection implements IFileSystem {
    #private;
    private readonly client;
    private readonly sftp;
    readonly kind: "remote";
    constructor(client: Client, sftp: SFTPWrapper);
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
    disconnect(): void;
}
/** Opens and keeps track of dedicated SFTP connections, independent of any terminal session. */
export declare class SftpConnectionManager {
    #private;
    connect(options: SftpConnectionOptions): Promise<SftpConnection>;
    disconnect(connection: SftpConnection): void;
}
//# sourceMappingURL=sftp.service.d.ts.map