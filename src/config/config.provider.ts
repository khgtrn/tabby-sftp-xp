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
      showHiddenFiles: true,
      editor: {
        theme: 'default',
        minimap: true,
        fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
        fontSize: 14,
        lineHeight: 1.5,
        letterSpacing: 1,
      },
    },
  };
}
