import { Injectable } from '@angular/core';
import { ConfigProvider } from 'tabby-core';
import { getDownloadDir, getTempDir } from '../core/paths';

/**
 * Provide configuration settings for the SFTP-XP plugin.
 * @hidden
 */
@Injectable()
export class SftpXpConfigProvider extends ConfigProvider {
  defaults = {
    sftpXp: {
      theme: 'dark',
      iconStyle: 'colored',
      defaultDownloadFolder: getDownloadDir(),
      tempFolder: getTempDir(),
      maxCacheSizeMB: 512,
      openFileSizeLimitMB: 10,
      autoUpload: true,
      confirmDelete: true,
      showHiddenFiles: true,
    },
  };
}
