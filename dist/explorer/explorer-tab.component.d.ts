import { Injector, OnDestroy, OnInit } from '@angular/core';
import { BaseTabComponent, NotificationsService } from 'tabby-core';
import { LocalFsService } from '../filesystem/local-fs.service';
import { IFileSystem, SftpConnectionOptions } from '../filesystem/models';
import { SftpConnectionManager } from '../sftp/sftp.service';
/** Dual-pane explorer tab: local filesystem on the left, remote SFTP session on the right. */
export declare class ExplorerTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
    readonly localFs: LocalFsService;
    private readonly connectionManager;
    private readonly notifications;
    /** Set by whoever opens this tab (toolbar button / context menu) to auto-connect. */
    connectionOptions: SftpConnectionOptions | null;
    remoteFs: IFileSystem | null;
    connecting: boolean;
    connectError: string | null;
    constructor(injector: Injector, localFs: LocalFsService, connectionManager: SftpConnectionManager, notifications: NotificationsService);
    ngOnInit(): Promise<void>;
    connect(options: SftpConnectionOptions): Promise<void>;
    canClose(): Promise<boolean>;
    ngOnDestroy(): void;
}
