import { Injectable } from '@angular/core';
import type {
  BaseTabComponent,
  NewTabParameters,
  PartialProfile,
  Profile,
} from 'tabby-core';
import { ProfileProvider } from 'tabby-core';
import { ExplorerTabComponent } from '../explorer/explorer-tab.component';
import type { SftpConnectionOptions } from '../filesystem/models';
import { SftpXpProfileSettingsComponent } from './sftp-connection-profile-settings.component';

export interface SftpXpConnectionProfile extends Profile {
  options: SftpConnectionOptions;
}

/**
 * Lets a standalone SFTP-XP connection be opened straight from Tabby's "New
 * Tab" menu, with no SSH terminal tab required first.
 */
@Injectable()
export class SftpXpConnectionProfileProvider extends ProfileProvider<SftpXpConnectionProfile> {
  id = 'sftp-xp-connection';
  name = 'SFTP-XP Connection';
  settingsComponent = SftpXpProfileSettingsComponent;
  configDefaults = {
    options: {
      host: '',
      port: 22,
      username: '',
    },
  };

  async getBuiltinProfiles(): Promise<PartialProfile<SftpXpConnectionProfile>[]> {
    return [];
  }

  async getNewTabParameters(
    profile: SftpXpConnectionProfile,
  ): Promise<NewTabParameters<BaseTabComponent>> {
    return {
      type: ExplorerTabComponent,
      inputs: { connectionOptions: profile.options },
    };
  }

  getDescription(profile: PartialProfile<SftpXpConnectionProfile>): string {
    const host = profile.options?.host;
    if (!host) {
      return 'Not configured';
    }
    const username = profile.options?.username;
    return username ? `${username}@${host}` : host;
  }
}
