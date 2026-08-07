import { OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from 'tabby-core';
export type SftpXpTheme = 'light' | 'dark';
/** Keeps the persisted plugin theme in sync with the plugin UI and overlays. */
export declare class SftpXpThemeService implements OnDestroy {
    #private;
    private readonly config;
    constructor(config: ConfigService);
    /** Emits after the persisted configuration changes. */
    get changed$(): Observable<void>;
    get current(): SftpXpTheme;
    apply(theme: SftpXpTheme): void;
    applyConfiguredTheme(): void;
    ngOnDestroy(): void;
}
//# sourceMappingURL=theme.service.d.ts.map