import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  AppService,
  ConfigService,
  MenuItemOptions,
  NotificationsService,
  PlatformService,
} from 'tabby-core';
import { BookmarkManagerComponent } from '../bookmarks/bookmark-manager.component';
import { BookmarkService } from '../bookmarks/bookmark.service';
import { getErrorMessage } from '../core/errors';
import {
  ConnectDialogComponent,
  PermissionDialogComponent,
  PromptDialogComponent,
  PropertiesDialogComponent,
} from '../dialogs/dialogs.component';
import { EditorTabComponent } from '../editor/editor-tab.component';
import { ClipboardService } from '../filesystem/clipboard.service';
import type { FileEntry, IFileSystem } from '../filesystem/models';
import { TransferService } from '../filesystem/transfer.service';
import template from './file-panel.component.html';
import styles from './file-panel.component.scss';

@Component({
  selector: 'sftp-xp-file-panel',
  template,
  styles: [styles],
})
export class FilePanelComponent implements OnInit {
  @ViewChild('panelRoot', { static: true }) panelRoot!: ElementRef<HTMLDivElement>;

  @ViewChild('filterInput')
  set filterInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input && this.showFilter) {
      queueMicrotask(() => input.nativeElement.focus());
    }
  }

  @Input() fs!: IFileSystem;
  @Input() side: 'local' | 'remote' = 'local';
  @Input() initialPath: string | null = null;

  path = '/';
  editingPath: string | null = null;
  entries: FileEntry[] = [];
  filteredEntries: FileEntry[] = [];
  showFilter = false;
  filterText = '';
  loading = false;
  errorMessage: string | null = null;
  selectedEntryPath: string | null = null;

  #history: string[] = [];
  #historyIndex = -1;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly notifications: NotificationsService,
    private readonly platform: PlatformService,
    private readonly app: AppService,
    private readonly config: ConfigService,
    private readonly bookmarkService: BookmarkService,
    private readonly transfer: TransferService,
    private readonly clipboard: ClipboardService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.bookmarkService.load();
    const start = this.initialPath ?? (await this.fs.home());
    await this.#navigate(start);
  }

  async #navigate(newPath: string, pushHistory = true): Promise<void> {
    if (newPath !== this.path) {
      this.selectedEntryPath = null;
    }
    this.loading = true;
    this.errorMessage = null;
    try {
      const entries = await this.fs.list(newPath);
      this.path = newPath;
      this.entries = this.#sortEntries(entries);
      this.#updateFilteredList();
      if (pushHistory) {
        this.#history = this.#history.slice(0, this.#historyIndex + 1);
        this.#history.push(newPath);
        this.#historyIndex = this.#history.length - 1;
      }
    } catch (error) {
      const message = getErrorMessage(error);
      this.errorMessage = message;
      this.notifications.error(message);
    } finally {
      this.loading = false;
    }
  }

  #sortEntries(entries: FileEntry[]): FileEntry[] {
    const showHidden = this.config.store.sftpXp.showHiddenFiles;
    return entries
      .filter((e) => showHidden || !e.name.startsWith('.'))
      .sort(
        (a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name),
      );
  }

  canGoBack(): boolean {
    return this.#historyIndex > 0;
  }

  canGoForward(): boolean {
    return this.#historyIndex < this.#history.length - 1;
  }

  async goBack(): Promise<void> {
    if (!this.canGoBack()) {
      return;
    }
    this.#historyIndex--;
    await this.#navigate(this.#history[this.#historyIndex], false);
  }

  async goForward(): Promise<void> {
    if (!this.canGoForward()) {
      return;
    }
    this.#historyIndex++;
    await this.#navigate(this.#history[this.#historyIndex], false);
  }

  async goUp(): Promise<void> {
    await this.#navigate(this.fs.dirname(this.path));
  }

  async goHome(): Promise<void> {
    await this.#navigate(await this.fs.home());
  }

  async refresh(): Promise<void> {
    await this.#navigate(this.path, false);
  }

  editPath(): void {
    this.editingPath = this.path;
  }

  async confirmPath(): Promise<void> {
    if (this.editingPath === null) {
      return;
    }
    const target = this.editingPath;
    this.editingPath = null;
    await this.#navigate(target);
  }

  toggleFilter(): void {
    this.showFilter = !this.showFilter;
    if (!this.showFilter) {
      this.filterText = '';
    }
    this.#updateFilteredList();
  }

  onFilterChange(): void {
    this.#updateFilteredList();
  }

  #updateFilteredList(): void {
    if (!this.showFilter || !this.filterText.trim()) {
      this.filteredEntries = this.entries;
      return;
    }
    const q = this.filterText.toLowerCase();
    this.filteredEntries = this.entries.filter((e) => e.name.toLowerCase().includes(q));
  }

  async open(entry: FileEntry): Promise<void> {
    if (entry.isDirectory) {
      await this.#navigate(entry.path);
    } else {
      await this.editFile(entry);
    }
  }

  async editFile(entry: FileEntry): Promise<void> {
    const limitMB = this.config.store.sftpXp.openFileSizeLimitMB;

    if (limitMB > 0 && entry.size > limitMB * 1024 * 1024) {
      const result = await this.platform.showMessageBox({
        type: 'warning',
        message: `File "${entry.name}" greater than limit (${limitMB}MB). Still open?`,
        buttons: ['Open', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
      });
      if (result.response !== 0) {
        return;
      }
    }

    this.app.openNewTabRaw({
      type: EditorTabComponent,
      inputs: { fs: this.fs, filePath: entry.path, fileName: entry.name },
    });
  }

  getIcon(entry: FileEntry): string {
    const colored = this.config.store.sftpXp.iconStyle === 'colored';
    const colorClass = (color: string): string =>
      colored ? ` sftp-file-icon--${color}` : ' sftp-file-icon--mono';

    if (entry.isDirectory) {
      return `fas fa-folder sftp-file-icon${colorClass('folder')}`;
    }
    if (entry.isSymlink) {
      return `fas fa-link sftp-file-icon${colorClass('link')}`;
    }

    const extension = entry.name.includes('.') ? entry.name.split('.').pop()!.toLowerCase() : '';
    const codeExtensions = [
      'js',
      'jsx',
      'ts',
      'tsx',
      'html',
      'css',
      'scss',
      'json',
      'py',
      'php',
      'java',
      'go',
      'rs',
      'sh',
    ];
    if (codeExtensions.includes(extension)) {
      return `fas fa-file-code sftp-file-icon${colorClass('code')}`;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(extension)) {
      return `fas fa-file-image sftp-file-icon${colorClass('image')}`;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
      return `fas fa-file-archive sftp-file-icon${colorClass('archive')}`;
    }
    if (extension === 'pdf') {
      return `fas fa-file-pdf sftp-file-icon${colorClass('pdf')}`;
    }
    return `fas fa-file sftp-file-icon${colorClass('file')}`;
  }

  // -- Context menu -----------------------------------------------------

  showEmptyAreaMenu(event: MouseEvent): void {
    event.preventDefault();
    this.selectedEntryPath = null;
    this.focusPanel();
    const items: MenuItemOptions[] = [
      { label: 'New Folder', click: () => this.#createFolder() },
      { label: 'New File', click: () => this.#createFile() },
      { label: 'Refresh', click: () => this.refresh() },
    ];
    if (this.clipboard.get()) {
      items.push({ label: 'Paste (Ctrl+V)', click: () => this.#paste() });
    }
    if (this.clipboard.get()?.op === 'cut') {
      items.push({ label: 'Cancel Cut (Esc)', click: () => this.cancelCut() });
    }
    this.platform.popupContextMenu(items, event);
  }

  showEntryMenu(entry: FileEntry, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectEntry(entry);
    const items: MenuItemOptions[] = entry.isDirectory
      ? [
          { label: 'Open', click: () => this.#navigate(entry.path) },
          { label: 'Rename', click: () => this.rename(entry) },
          { label: 'Delete (Delete)', click: () => this.deleteEntry(entry) },
          { label: 'New Folder', click: () => this.#createFolder(entry.path) },
          { label: 'New File', click: () => this.#createFile(entry.path) },
          { label: 'Permissions', click: () => this.editPermissions(entry) },
          { label: 'Properties', click: () => this.showProperties(entry) },
          { label: 'Copy (Ctrl+C)', click: () => this.copyEntry(entry) },
          { label: 'Cut (Ctrl+X)', click: () => this.cutEntry(entry) },
          { label: 'Refresh', click: () => this.refresh() },
          { label: 'Copy Path', click: () => this.copyPath(entry) },
        ]
      : [
          { label: 'Edit', click: () => this.editFile(entry) },
          { label: 'Rename', click: () => this.rename(entry) },
          { label: 'Delete (Delete)', click: () => this.deleteEntry(entry) },
          { label: 'Permissions', click: () => this.editPermissions(entry) },
          { label: 'Properties', click: () => this.showProperties(entry) },
          { label: 'Copy (Ctrl+C)', click: () => this.copyEntry(entry) },
          { label: 'Cut (Ctrl+X)', click: () => this.cutEntry(entry) },
          { label: 'Copy Path', click: () => this.copyPath(entry) },
        ];
    this.platform.popupContextMenu(items, event);
  }

  async #createFolder(baseDir: string = this.path): Promise<void> {
    const modal = this.ngbModal.open(PromptDialogComponent);
    modal.componentInstance.title = 'New Folder Name';
    const name = await modal.result.catch(() => null);
    if (!name) {
      return;
    }
    try {
      await this.fs.mkdir(this.fs.join(baseDir, name));
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  async #createFile(baseDir: string = this.path): Promise<void> {
    const modal = this.ngbModal.open(PromptDialogComponent);
    modal.componentInstance.title = 'New File Name';
    const name = await modal.result.catch(() => null);
    if (!name) {
      return;
    }
    try {
      await this.fs.createFile(this.fs.join(baseDir, name));
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  async rename(entry: FileEntry): Promise<void> {
    const modal = this.ngbModal.open(PromptDialogComponent);
    modal.componentInstance.title = 'Rename';
    modal.componentInstance.value = entry.name;
    const name = await modal.result.catch(() => null);
    if (!name || name === entry.name) {
      return;
    }
    try {
      await this.fs.rename(entry.path, this.fs.join(this.fs.dirname(entry.path), name));
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  async deleteEntry(entry: FileEntry): Promise<void> {
    if (this.config.store.sftpXp.confirmDelete) {
      const result = await this.platform.showMessageBox({
        type: 'warning',
        message: `Delete "${entry.name}"?`,
        buttons: ['Delete', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
      });
      if (result.response !== 0) {
        return;
      }
    }
    try {
      await this.fs.remove(entry.path, entry.isDirectory);
      if (this.selectedEntryPath === entry.path) {
        this.selectedEntryPath = null;
      }
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  async editPermissions(entry: FileEntry): Promise<void> {
    const modal = this.ngbModal.open(PermissionDialogComponent);
    modal.componentInstance.entry = entry;
    const mode = await modal.result.catch(() => null);
    if (mode === null || mode === undefined) {
      return;
    }
    try {
      await this.fs.chmod(entry.path, mode);
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  showProperties(entry: FileEntry): void {
    const modal = this.ngbModal.open(PropertiesDialogComponent);
    modal.componentInstance.entry = entry;
  }

  copyEntry(entry: FileEntry): void {
    this.clipboard.set({
      op: 'copy',
      fs: this.fs,
      path: entry.path,
      isDirectory: entry.isDirectory,
    });
  }

  cutEntry(entry: FileEntry): void {
    this.clipboard.set({
      op: 'cut',
      fs: this.fs,
      path: entry.path,
      isDirectory: entry.isDirectory,
    });
  }

  isCut(entry: FileEntry): boolean {
    const clipboardEntry = this.clipboard.get();
    return (
      clipboardEntry?.op === 'cut' &&
      clipboardEntry.fs === this.fs &&
      clipboardEntry.path === entry.path
    );
  }

  cancelCut(): void {
    if (this.clipboard.get()?.op === 'cut') {
      this.clipboard.clear();
    }
  }

  selectEntry(entry: FileEntry): void {
    this.selectedEntryPath = entry.path;
    this.focusPanel();
  }

  isSelected(entry: FileEntry): boolean {
    return this.selectedEntryPath === entry.path;
  }

  focusPanel(): void {
    this.panelRoot.nativeElement.focus({ preventScroll: true });
  }

  onFileListClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.selectedEntryPath = null;
    }
    this.focusPanel();
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (this.#isEditableTarget(event.target) || event.repeat) {
      return;
    }

    const entry = this.entries.find((item) => item.path === this.selectedEntryPath);
    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && key === 'c' && entry) {
      event.preventDefault();
      this.copyEntry(entry);
    } else if (modifier && key === 'x' && entry) {
      event.preventDefault();
      this.cutEntry(entry);
    } else if (modifier && key === 'v' && this.clipboard.get()) {
      event.preventDefault();
      void this.#paste();
    } else if (event.key === 'Delete' && entry) {
      event.preventDefault();
      void this.deleteEntry(entry);
    } else if (event.key === 'Escape') {
      this.cancelCut();
    }
  }

  #isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement
      && !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  copyPath(entry: FileEntry): void {
    this.platform.setClipboard({ text: entry.path });
    this.notifications.notice('Path copied');
  }

  async #paste(): Promise<void> {
    const clip = this.clipboard.get();
    if (!clip) {
      return;
    }
    try {
      if (clip.op === 'copy') {
        await this.transfer.copy(clip.fs, clip.path, this.fs, this.path);
      } else {
        await this.transfer.move(clip.fs, clip.path, this.fs, this.path);
        this.clipboard.clear();
      }
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  // -- Bookmarks ----------------------------------------------------------

  openBookmarks(): void {
    const modal = this.ngbModal.open(BookmarkManagerComponent);
    modal.componentInstance.side = this.side;
    modal.componentInstance.onSelect = (path: string) => this.#navigate(path);
  }

  async addCurrentPathBookmark(): Promise<void> {
    const modal = this.ngbModal.open(PromptDialogComponent);
    modal.componentInstance.title = 'Bookmark Name';
    modal.componentInstance.value = this.fs.basename(this.path);
    const name = await modal.result.catch(() => null);
    if (!name) {
      return;
    }
    await this.bookmarkService.add(name, this.path, this.side);
    this.notifications.notice(`Added bookmark "${name}"`);
  }

  /** Only used by the remote panel when it needs to (re)connect. */
  async promptConnect(): Promise<Record<string, any> | null> {
    const modal = this.ngbModal.open(ConnectDialogComponent);
    return modal.result.catch(() => null);
  }
}
