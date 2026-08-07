import { ChangeDetectorRef, ElementRef, Injector, OnDestroy, OnInit } from '@angular/core';
import { AppService, BaseTabComponent, NotificationsService, PlatformService } from 'tabby-core';
import { IFileSystem } from '../filesystem/models';
import { SftpXpThemeService } from '../theme/theme.service';
import { EditorCacheService } from './editor-cache.service';
/** Tab hosting a Monaco editor to edit a local or (downloaded) remote file, per Function.md. */
export declare class EditorTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
    #private;
    private readonly app;
    private readonly editorCache;
    private readonly notifications;
    private readonly platform;
    private readonly changeDetector;
    private readonly theme;
    fs: IFileSystem;
    filePath: string;
    fileName: string;
    editorHost: ElementRef<HTMLDivElement>;
    dirty: boolean;
    saving: boolean;
    loading: boolean;
    loadError: string | null;
    constructor(injector: Injector, app: AppService, editorCache: EditorCacheService, notifications: NotificationsService, platform: PlatformService, changeDetector: ChangeDetectorRef, theme: SftpXpThemeService);
    ngOnInit(): Promise<void>;
    onKeydown(event: KeyboardEvent): void;
    save(): Promise<boolean>;
    close(): Promise<void>;
    saveAndClose(): Promise<void>;
    canClose(): Promise<boolean>;
    ngOnDestroy(): void;
}
