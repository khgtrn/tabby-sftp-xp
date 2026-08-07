import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AppService, BaseTabComponent, NotificationsService, PlatformService } from 'tabby-core';
import { getErrorMessage } from '../core/errors';
import { IFileSystem } from '../filesystem/models';
import { TabbySftpFileSystem } from '../sftp/tabby-sftp-filesystem';
import { SftpXpThemeService } from '../theme/theme.service';
import { EditorCacheService } from './editor-cache.service';
import template from './editor-tab.component.html';
import styles from './editor-tab.component.scss';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  go: 'go',
  rs: 'rust',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
  ini: 'ini',
  toml: 'ini',
  conf: 'ini',
  dockerfile: 'dockerfile',
};

/** Tab hosting a Monaco editor to edit a local or (downloaded) remote file, per Function.md. */
@Component({
  selector: 'sftp-xp-editor-tab',
  template,
  styles: [styles],
})
export class EditorTabComponent extends BaseTabComponent implements OnInit, OnDestroy {
  fs!: IFileSystem;
  filePath!: string;
  fileName!: string;

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  dirty = false;
  saving = false;
  loading = true;
  loadError: string | null = null;
  connectionLostMessage: string | null = null;

  #editor: any = null;
  #localPath!: string;
  #sessionTag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  #themeSubscription = new Subscription();
  #connectionSubscription = new Subscription();
  #monaco: any = null;
  #cleanupPromise: Promise<void> | null = null;

  constructor(
    injector: Injector,
    private readonly app: AppService,
    private readonly editorCache: EditorCacheService,
    private readonly notifications: NotificationsService,
    private readonly platform: PlatformService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly theme: SftpXpThemeService,
  ) {
    super(injector);
    this.#themeSubscription.add(this.#themeChanged());
  }

  async ngOnInit(): Promise<void> {
    this.setTitle(this.fileName);
    this.icon = 'fas fa-file-code';
    if (this.fs instanceof TabbySftpFileSystem) {
      this.#connectionSubscription.add(
        this.fs.disconnected$.subscribe((reason) => this.#handleDisconnect(reason)),
      );
    }
    try {
      let content: string;
      if (this.fs.kind === 'local') {
        this.#localPath = this.filePath;
        content = (await this.fs.readFile(this.filePath)).toString('utf-8');
      } else {
        this.#localPath = await this.editorCache.download(this.fs, this.filePath, this.#sessionTag);
        content = await this.editorCache.readLocal(this.#localPath);
      }

      // Monaco must measure a visible, fully laid-out container when it is created.
      // Creating it while editorHost has [hidden] produces a tiny initial viewport.
      this.loading = false;
      this.changeDetector.detectChanges();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await this.#initMonaco(content);
    } catch (error) {
      const message = getErrorMessage(error);
      this.loadError = message;
      this.notifications.error(`Could not open file: ${message}`);
    } finally {
      this.loading = false;
    }
  }

  async #initMonaco(content: string): Promise<void> {
    const monaco = await import('monaco-editor');
    this.#monaco = monaco;
    this.#editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: content,
      language: this.#detectLanguage(this.fileName),
      automaticLayout: true,
      theme: this.theme.current === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: true },
      fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
      fontSize: 14,
      lineHeight: 22,
      letterSpacing: 0.2,
      padding: {
        top: 10,
        bottom: 10,
      },
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
    });
    this.#editor.onDidChangeModelContent(() => {
      this.dirty = true;
    });
    this.#editor.layout();
  }

  #themeChanged(): Subscription {
    return this.theme.changed$.subscribe(() => {
      this.#monaco?.editor.setTheme(this.theme.current === 'dark' ? 'vs-dark' : 'vs');
    });
  }

  #detectLanguage(name: string): string {
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : name.toLowerCase();
    return LANGUAGE_BY_EXTENSION[ext] ?? 'plaintext';
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.hasFocus && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.save();
    }
  }

  async save(): Promise<boolean> {
    if (!this.#editor || this.saving) {
      return false;
    }
    this.saving = true;
    try {
      const content = this.#editor.getValue();
      await this.editorCache.writeLocal(this.#localPath, content);
      if (this.fs instanceof TabbySftpFileSystem && !this.fs.connected) {
        this.notifications.error(
          `Cannot upload ${this.fileName}: the parent SSH connection is disconnected. Changes remain in this editor.`,
        );
        return false;
      }
      if (this.fs.kind === 'remote') {
        await this.editorCache.upload(this.fs, this.#localPath, this.filePath);
      }
      this.dirty = false;
      this.notifications.notice(`Saved ${this.fileName}`);
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      const action = await this.platform.showMessageBox({
        type: 'error',
        message: `Failed to upload file: ${message}`,
        buttons: ['Retry', 'Discard', 'Keep local'],
        defaultId: 0,
        cancelId: 2,
      });
      if (action.response === 0) {
        this.saving = false;
        return this.save();
      }
      return false;
    } finally {
      this.saving = false;
    }
  }

  #handleDisconnect(reason: string): void {
    this.connectionLostMessage = reason;
    this.setTitle(`${this.fileName} (disconnected)`);
    this.changeDetector.detectChanges();

    if (this.#editor && this.#localPath) {
      void this.editorCache.writeLocal(this.#localPath, this.#editor.getValue()).catch((error) => {
        this.notifications.error(`Could not preserve the local editor cache: ${getErrorMessage(error)}`);
      });
    }
  }

  async close(): Promise<void> {
    await this.app.closeTab(this, true);
  }

  async saveAndClose(): Promise<void> {
    if (!this.dirty || (await this.save())) {
      await this.#cleanupBeforeClose();
      await this.app.closeTab(this, false);
    }
  }

  async canClose(): Promise<boolean> {
    if (!this.dirty) {
      await this.#cleanupBeforeClose();
      return true;
    }
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message: `"${this.fileName}" has unsaved changes. Close and discard them?`,
      buttons: ['Close', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
    });
    if (result.response !== 0) {
      return false;
    }
    await this.#cleanupBeforeClose();
    return true;
  }

  async #cleanupBeforeClose(): Promise<void> {
    this.#editor?.dispose();
    this.#editor = null;

    if (this.fs?.kind !== 'remote') {
      return;
    }

    this.#cleanupPromise ??= this.editorCache.cleanupSession(this.#sessionTag).catch((error) => {
      this.notifications.error(`Could not clean up the temporary file: ${getErrorMessage(error)}`);
    });
    await this.#cleanupPromise;
  }

  ngOnDestroy(): void {
    this.#themeSubscription.unsubscribe();
    this.#connectionSubscription.unsubscribe();
    this.#editor?.dispose();
    if (this.fs?.kind === 'remote') {
      void this.#cleanupBeforeClose();
    }
    super.ngOnDestroy();
  }
}
