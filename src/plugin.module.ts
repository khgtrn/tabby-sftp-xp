import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import TabbyCoreModule, { ConfigProvider, ProfileProvider } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';
import { TerminalDecorator } from 'tabby-terminal';
import { BookmarkManagerComponent } from './bookmarks/bookmark-manager.component';
import { SftpXpConfigProvider } from './config/config.provider';
import {
  PermissionDialogComponent,
  PromptDialogComponent,
  PropertiesDialogComponent,
  SudoPasswordDialogComponent,
} from './dialogs/dialogs.component';
import { EditorTabComponent } from './editor/editor-tab.component';
import { ExplorerTabComponent } from './explorer/explorer-tab.component';
import { FilePanelComponent } from './panel/file-panel.component';
import { SftpXpConnectionProfileProvider } from './sftp/sftp-connection-profile.provider';
import { SftpXpProfileSettingsComponent } from './sftp/sftp-connection-profile-settings.component';
import { SftpXpSettingsTabProvider } from './settings/settings-tab.provider';
import { SftpXpSettingsTabComponent } from './settings/sftp-xp-settings-tab.component';
import { SftpXpTerminalDecorator } from './tabby/terminal-decorator';
import { SftpXpThemeService } from './theme/theme.service';

@NgModule({
  imports: [CommonModule, FormsModule, NgbModule, TabbyCoreModule],
  providers: [
    { provide: ConfigProvider, useClass: SftpXpConfigProvider, multi: true },
    { provide: TerminalDecorator, useClass: SftpXpTerminalDecorator, multi: true },
    // Hotkey is temporarily disabled.
    // { provide: HotkeyProvider, useClass: SftpXpHotkeyProvider, multi: true },
    { provide: SettingsTabProvider, useClass: SftpXpSettingsTabProvider, multi: true },
    { provide: ProfileProvider, useClass: SftpXpConnectionProfileProvider, multi: true },
  ],
  declarations: [
    ExplorerTabComponent,
    SftpXpProfileSettingsComponent,
    FilePanelComponent,
    EditorTabComponent,
    SftpXpSettingsTabComponent,
    BookmarkManagerComponent,
    PromptDialogComponent,
    PermissionDialogComponent,
    PropertiesDialogComponent,
    SudoPasswordDialogComponent,
  ],
})
export class SftpXpPluginModule {
  // Eagerly start theme synchronization as soon as the plugin is loaded.
  constructor(_theme: SftpXpThemeService) {}
}
