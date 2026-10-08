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
import type { MenuItemOptions } from 'tabby-core';
import {
  AppService,
  BaseTabComponent,
  NotificationsService,
  PlatformService,
} from 'tabby-core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { getErrorMessage, isPermissionError, isSftpPermissionDeniedError } from '../core/errors';
import { PrivilegedWriteService } from '../core/privileged-write.service';
import { SudoPasswordDialogComponent } from '../dialogs/dialogs.component';
import type { IFileSystem } from '../filesystem/models';
import { SftpConnection, SudoAuthError } from '../sftp/sftp.service';
import { TabbySftpFileSystem } from '../sftp/tabby-sftp-filesystem';
import { SftpXpThemeService } from '../theme/theme.service';
import { EditorCacheService } from './editor-cache.service';
import template from './editor-tab.component.html';
import styles from './editor-tab.component.scss';
import type { EditorThemeId } from './editor-themes';
import {
  registerEditorThemes,
  resolveEditorTheme,
} from './editor-themes';

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
  #settingsSubscription = new Subscription();
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
    private readonly privilegedWrite: PrivilegedWriteService,
    private readonly ngbModal: NgbModal,
  ) {
    super(injector);
    this.#themeSubscription.add(this.#themeChanged());
    this.#settingsSubscription.add(this.config.changed$.subscribe(() => this.#applyEditorSettings()));
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
    registerEditorThemes(monaco);
    const settings = this.#editorSettings();
    this.#editor = monaco.editor.create(this.editorHost.nativeElement, {
      value: content,
      language: this.#detectLanguage(this.fileName),
      automaticLayout: true,
      theme: resolveEditorTheme(settings.theme, this.theme.current),
      minimap: { enabled: settings.minimap },
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      letterSpacing: settings.letterSpacing,
      padding: {
        top: 10,
        bottom: 10,
      },
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      contextmenu: false,
    });
    this.#editor.onDidChangeModelContent(() => {
      this.dirty = true;
    });
    this.#registerClipboardActions(monaco);
    this.#editor.layout();
  }

  #registerClipboardActions(monaco: any): void {
    this.#editor.addAction({
      id: 'sftp-xp.copy',
      label: 'Copy',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Insert,
      ],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1,
      run: () => this.#copySelection(),
    });
    this.#editor.addAction({
      id: 'sftp-xp.cut',
      label: 'Cut',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
        monaco.KeyMod.Shift | monaco.KeyCode.Delete,
      ],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 2,
      run: () => this.#cutSelection(monaco),
    });
    this.#editor.addAction({
      id: 'sftp-xp.paste',
      label: 'Paste',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
        monaco.KeyMod.Shift | monaco.KeyCode.Insert,
      ],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 3,
      run: () => this.#pasteClipboard(),
    });
  }

  #copySelection(): void {
    const model = this.#editor?.getModel();
    const selection = this.#editor?.getSelection();
    if (!model || !selection) {
      return;
    }

    const text = selection.isEmpty()
      ? model.getLineContent(selection.startLineNumber) + model.getEOL()
      : model.getValueInRange(selection);
    this.platform.setClipboard({ text });
  }

  #cutSelection(monaco: any): void {
    const model = this.#editor?.getModel();
    const selection = this.#editor?.getSelection();
    if (!model || !selection) {
      return;
    }

    this.#copySelection();
    let range = selection;
    if (selection.isEmpty()) {
      const line = selection.startLineNumber;
      range = line < model.getLineCount()
        ? new monaco.Range(line, 1, line + 1, 1)
        : new monaco.Range(line, 1, line, model.getLineMaxColumn(line));
    }
    this.#replaceRange(range, 'clipboard.cut', '');
  }

  #pasteClipboard(): void {
    const selection = this.#editor?.getSelection();
    if (!selection) {
      return;
    }
    this.#replaceRange(selection, 'clipboard.paste', this.platform.readClipboard());
  }

  #replaceRange(range: any, source: string, text: string): void {
    this.#editor.pushUndoStop();
    this.#editor.executeEdits(source, [{ range, text, forceMoveMarkers: true }]);
    this.#editor.pushUndoStop();
    this.#editor.focus();
  }

  showEditorContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#editor) {
      return;
    }

    const items: MenuItemOptions[] = [
      { label: 'Cut (Ctrl+X)', click: () => this.#cutSelection(this.#monaco) },
      { label: 'Copy (Ctrl+C)', click: () => this.#copySelection() },
      { label: 'Paste (Ctrl+V)', enabled: !!this.platform.readClipboard(), click: () => this.#pasteClipboard() },
    ];
    this.platform.popupContextMenu(items, event);
  }

  #themeChanged(): Subscription {
    return this.theme.changed$.subscribe(() => {
      this.#applyEditorSettings();
    });
  }

  #editorSettings(): {
    theme: EditorThemeId;
    minimap: boolean;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
  } {
    const settings = this.config.store.sftpXp.editor;
    return {
      theme: settings.theme as EditorThemeId,
      minimap: settings.minimap,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      letterSpacing: settings.letterSpacing,
    };
  }

  #applyEditorSettings(): void {
    if (!this.#editor || !this.#monaco) {
      return;
    }
    const settings = this.#editorSettings();
    this.#monaco.editor.setTheme(resolveEditorTheme(settings.theme, this.theme.current));
    this.#editor.updateOptions({
      minimap: { enabled: settings.minimap },
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      letterSpacing: settings.letterSpacing,
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
    this.#editor.updateOptions({ readOnly: true });
    const content = this.#editor.getValue();
    try {
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
      const canSudoLocal =
        this.fs.kind === 'local' && isPermissionError(error) && PrivilegedWriteService.isSupported;
      const canSudoRemote = this.fs instanceof SftpConnection && isSftpPermissionDeniedError(error);
      const buttons = ['Retry', 'Discard', 'Keep local'];
      if (canSudoLocal || canSudoRemote) {
        buttons.push('Retry with sudo');
      }
      const action = await this.platform.showMessageBox({
        type: 'error',
        message: `Failed to upload file: ${message}`,
        buttons,
        defaultId: 0,
        cancelId: 2,
      });
      if (action.response === 0) {
        this.saving = false;
        this.#editor.updateOptions({ readOnly: false });
        return this.save();
      }
      if (canSudoLocal && action.response === 3) {
        // `await` here is load-bearing, not redundant: a bare
        // `return this.#retrySaveLocalWithSudo(content)` would let this
        // `catch` block's completion reach the `finally` below immediately
        // (synchronously), releasing `saving`/`readOnly` before the retry
        // actually finishes — `return await` suspends until the retry's
        // promise settles, so `finally` only runs once it's truly done.
        return await this.#retrySaveLocalWithSudo(content);
      }
      if (canSudoRemote && action.response === 3) {
        // Same reasoning as above.
        return await this.#retryUploadWithSudo(this.fs as SftpConnection, content);
      }
      return false;
    } finally {
      this.saving = false;
      this.#editor?.updateOptions({ readOnly: false });
    }
  }

  async #retrySaveLocalWithSudo(content: string): Promise<boolean> {
    try {
      await this.privilegedWrite.writeLocalFile(this.filePath, Buffer.from(content, 'utf-8'));
      this.dirty = false;
      this.notifications.notice(`Saved ${this.fileName}`);
      return true;
    } catch (error) {
      this.notifications.error(`Could not save with elevated privileges: ${getErrorMessage(error)}`);
      return false;
    }
  }

  async #retryUploadWithSudo(connection: SftpConnection, content: string): Promise<boolean> {
    const data = Buffer.from(content, 'utf-8');
    if (connection.password) {
      try {
        await connection.writePrivileged(this.filePath, data, connection.password);
        this.dirty = false;
        this.notifications.notice(`Saved ${this.fileName}`);
        return true;
      } catch (error) {
        if (!(error instanceof SudoAuthError)) {
          this.notifications.error(
            `Could not save with elevated privileges: ${getErrorMessage(error)}`,
          );
          return false;
        }
        // Login password didn't work as the sudo password; fall through to prompt.
      }
    }
    return this.#promptSudoPasswordAndRetry(connection, data);
  }

  async #promptSudoPasswordAndRetry(connection: SftpConnection, data: Buffer): Promise<boolean> {
    const modal = this.ngbModal.open(SudoPasswordDialogComponent);
    modal.componentInstance.message = `Enter the sudo password for this SFTP connection to save ${this.fileName}.`;
    const password = await modal.result.catch(() => null);
    if (!password) {
      this.notifications.error(`Save cancelled: changes to ${this.fileName} were not saved.`);
      return false;
    }
    try {
      await connection.writePrivileged(this.filePath, data, password);
      this.dirty = false;
      this.notifications.notice(`Saved ${this.fileName}`);
      return true;
    } catch (error) {
      if (error instanceof SudoAuthError) {
        this.notifications.error('Incorrect sudo password.');
        return this.#promptSudoPasswordAndRetry(connection, data);
      }
      this.notifications.error(`Could not save with elevated privileges: ${getErrorMessage(error)}`);
      return false;
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
    this.#settingsSubscription.unsubscribe();
    this.#connectionSubscription.unsubscribe();
    this.#editor?.dispose();
    if (this.fs?.kind === 'remote') {
      void this.#cleanupBeforeClose();
    }
    super.ngOnDestroy();
  }
}
