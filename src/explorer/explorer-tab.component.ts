import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import { BaseTabComponent, NotificationsService } from 'tabby-core';
import { getErrorMessage } from '../core/errors';
import { LocalFsService } from '../filesystem/local-fs.service';
import { IFileSystem, SftpConnectionOptions } from '../filesystem/models';
import { SftpConnection, SftpConnectionManager } from '../sftp/sftp.service';
import template from './explorer-tab.component.html';
import styles from './explorer-tab.component.scss';

/** Dual-pane explorer tab: local filesystem on the left, remote SFTP session on the right. */
@Component({
  selector: 'sftp-xp-explorer-tab',
  template,
  styles: [styles],
})
export class ExplorerTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
  /** Set by whoever opens this tab (toolbar button / context menu) to auto-connect. */
  connectionOptions: SftpConnectionOptions | null = null;

  remoteFs: IFileSystem | null = null;
  connecting = false;
  connectError: string | null = null;

  constructor(
    injector: Injector,
    public readonly localFs: LocalFsService,
    private readonly connectionManager: SftpConnectionManager,
    private readonly notifications: NotificationsService,
  ) {
    super(injector);
  }

  async ngOnInit(): Promise<void> {
    this.icon = 'fas fa-exchange-alt';
    this.setTitle('SFTP Explorer');
    if (this.remoteFs) {
      this.setTitle('SFTP-XP');
    } else if (this.connectionOptions) {
      await this.connect(this.connectionOptions);
    }
  }

  async connect(options: SftpConnectionOptions): Promise<void> {
    this.connecting = true;
    this.connectError = null;
    try {
      this.remoteFs = await this.connectionManager.connect(options);
      this.setTitle(`SFTP: ${options.host}`);
    } catch (error) {
      const message = getErrorMessage(error);
      this.connectError = message;
      this.notifications.error(`Couldn't connect to SFTP: ${message}`);
    } finally {
      this.connecting = false;
    }
  }

  async canClose(): Promise<boolean> {
    return true;
  }

  ngOnDestroy(): void {
    if (this.remoteFs instanceof SftpConnection) {
      this.connectionManager.disconnect(this.remoteFs);
    }
    super.ngOnDestroy();
  }
}
