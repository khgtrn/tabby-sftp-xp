import { ConfigService } from 'tabby-core';
import { IFileSystem } from '../filesystem/models';
/** Handles the remote file -> local temp file -> editor -> remote file workflow. */
export declare class EditorCacheService {
    #private;
    private readonly config;
    constructor(config: ConfigService);
    /** Downloads a remote file into a session-scoped local temp file. */
    download(fs: IFileSystem, remotePath: string, sessionTag: string): Promise<string>;
    /** Uploads an edited local temp file back to its remote path. */
    upload(fs: IFileSystem, localPath: string, remotePath: string): Promise<void>;
    readLocal(localPath: string): Promise<string>;
    writeLocal(localPath: string, content: string): Promise<void>;
    cleanupSession(sessionTag: string): Promise<void>;
}
//# sourceMappingURL=editor-cache.service.d.ts.map