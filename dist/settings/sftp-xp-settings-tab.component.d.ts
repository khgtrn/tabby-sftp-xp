import { OnDestroy } from '@angular/core';
import { ConfigService, PlatformService } from 'tabby-core';
import { SftpXpTheme, SftpXpThemeService } from '../theme/theme.service';
export declare class SftpXpSettingsTabComponent implements OnDestroy {
    #private;
    readonly config: ConfigService;
    private readonly platform;
    private readonly theme;
    constructor(config: ConfigService, platform: PlatformService, theme: SftpXpThemeService);
    pickDownloadFolder(): Promise<void>;
    pickTempFolder(): Promise<void>;
    save(): void;
    scheduleSave(): void;
    changeTheme(theme: SftpXpTheme): void;
    ngOnDestroy(): void;
}
