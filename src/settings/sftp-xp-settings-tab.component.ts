import { Component, OnDestroy } from '@angular/core';
import { ConfigService, PlatformService } from 'tabby-core';
import { SftpXpTheme, SftpXpThemeService } from '../theme/theme.service';
import template from './sftp-xp-settings-tab.component.html';
import styles from './sftp-xp-settings-tab.component.scss';

@Component({
  selector: 'sftp-xp-settings-tab',
  template,
  styles: [styles],
})
export class SftpXpSettingsTabComponent implements OnDestroy {
  #saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public readonly config: ConfigService,
    private readonly platform: PlatformService,
    private readonly theme: SftpXpThemeService,
  ) {}

  async pickDownloadFolder(): Promise<void> {
    const dir = await this.platform.pickDirectory();
    if (dir) {
      this.config.store.sftpXp.defaultDownloadFolder = dir;
      await this.config.save();
    }
  }

  async pickTempFolder(): Promise<void> {
    const dir = await this.platform.pickDirectory();
    if (dir) {
      this.config.store.sftpXp.tempFolder = dir;
      await this.config.save();
    }
  }

  save(): void {
    void this.config.save();
  }

  scheduleSave(): void {
    if (this.#saveTimer) {
      clearTimeout(this.#saveTimer);
    }
    this.#saveTimer = setTimeout(() => {
      this.#saveTimer = null;
      void this.config.save();
    }, 300);
  }

  changeTheme(theme: SftpXpTheme): void {
    this.theme.apply(theme);
    void this.config.save();
  }

  ngOnDestroy(): void {
    if (this.#saveTimer) {
      clearTimeout(this.#saveTimer);
      void this.config.save();
    }
  }
}
