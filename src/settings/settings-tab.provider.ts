import { Injectable } from '@angular/core';
import { SettingsTabProvider } from 'tabby-settings';
import { SftpXpSettingsTabComponent } from './sftp-xp-settings-tab.component';

/** @hidden */
@Injectable()
export class SftpXpSettingsTabProvider extends SettingsTabProvider {
  id = 'sftp-xp';
  icon = 'exchange-alt';
  title = 'SFTP Explorer';

  getComponentType(): any {
    return SftpXpSettingsTabComponent;
  }
}
