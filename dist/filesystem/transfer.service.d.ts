import { IFileSystem } from './models';
/**
 * Implements copy/cut between any two filesystems (local->local, remote->remote,
 * local->remote, remote->local), as described in Function.md.
 */
export declare class TransferService {
    #private;
    copy(source: IFileSystem, sourcePath: string, dest: IFileSystem, destDir: string): Promise<void>;
    move(source: IFileSystem, sourcePath: string, dest: IFileSystem, destDir: string): Promise<void>;
}
//# sourceMappingURL=transfer.service.d.ts.map