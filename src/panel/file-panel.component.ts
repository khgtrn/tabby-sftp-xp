import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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
import { DragDropService } from '../filesystem/drag-drop.service';
import { isWritable, modeToSymbolicString } from '../filesystem/models';
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
  @ViewChild('fileList', { static: true }) fileListEl!: ElementRef<HTMLDivElement>;

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
  selectedPaths = new Set<string>();
  draggingPaths = new Set<string>();
  dragOverEntryPath: string | null = null;
  isListDropTarget = false;

  #history: string[] = [];
  #historyIndex = -1;
  #anchorPath: string | null = null;

  // Drag-to-select-range: only armed when the mousedown starts outside any file row
  // (background/header), so it never fights with the native file drag-and-drop below.
  #marqueeStartClientY: number | null = null;
  #marqueeAnchorIndex: number | null = null;
  #marqueeActive = false;
  #marqueeJustFinished = false;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly notifications: NotificationsService,
    private readonly platform: PlatformService,
    private readonly app: AppService,
    private readonly config: ConfigService,
    private readonly bookmarkService: BookmarkService,
    private readonly transfer: TransferService,
    private readonly clipboard: ClipboardService,
    private readonly dragDrop: DragDropService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.bookmarkService.load();
    const start = this.initialPath ?? (await this.fs.home());
    await this.#navigate(start);
  }

  async #navigate(newPath: string, pushHistory = true): Promise<void> {
    if (newPath !== this.path) {
      this.selectedPaths = new Set();
      this.#anchorPath = null;
    }
    this.loading = true;
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
      this.notifications.error(getErrorMessage(error));
    } finally {
      this.loading = false;
      // The SFTP session's callbacks (ssh2 / Tabby's SSH backend) resolve outside
      // Angular's zone, so without this the view stays stuck on "Loading..." until
      // some unrelated zone-patched event (e.g. a click) forces the next CD pass.
      this.changeDetector.detectChanges();
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
    if (target === this.path) {
      return;
    }
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

  getPermissions(entry: FileEntry): string {
    return modeToSymbolicString(entry);
  }

  // -- Context menu -----------------------------------------------------

  showEmptyAreaMenu(event: MouseEvent): void {
    event.preventDefault();
    this.selectedPaths = new Set();
    this.#anchorPath = null;
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
    if (!this.selectedPaths.has(entry.path)) {
      this.selectedPaths = new Set([entry.path]);
      this.#anchorPath = entry.path;
    }
    this.focusPanel();

    const count = this.selectedPaths.size;
    if (count > 1) {
      const items: MenuItemOptions[] = [
        { label: `Delete ${count} items (Delete)`, click: () => this.deleteSelection() },
        { label: `Copy ${count} items (Ctrl+C)`, click: () => this.copySelection() },
        { label: `Cut ${count} items (Ctrl+X)`, click: () => this.cutSelection() },
        { label: 'Refresh', click: () => this.refresh() },
      ];
      this.platform.popupContextMenu(items, event);
      return;
    }

    const items: MenuItemOptions[] = entry.isDirectory
      ? [
          { label: 'Open', click: () => this.#navigate(entry.path) },
          { label: 'Rename', click: () => this.rename(entry) },
          { label: 'Delete (Delete)', click: () => this.deleteSelection() },
          { label: 'New Folder', click: () => this.#createFolder(entry.path) },
          { label: 'New File', click: () => this.#createFile(entry.path) },
          { label: 'Permissions', click: () => this.editPermissions(entry) },
          { label: 'Properties', click: () => this.showProperties(entry) },
          { label: 'Copy (Ctrl+C)', click: () => this.copySelection() },
          { label: 'Cut (Ctrl+X)', click: () => this.cutSelection() },
          { label: 'Refresh', click: () => this.refresh() },
          { label: 'Copy Path', click: () => this.copyPath(entry) },
        ]
      : [
          { label: 'Edit', click: () => this.editFile(entry) },
          { label: 'Rename', click: () => this.rename(entry) },
          { label: 'Delete (Delete)', click: () => this.deleteSelection() },
          { label: 'Permissions', click: () => this.editPermissions(entry) },
          { label: 'Properties', click: () => this.showProperties(entry) },
          { label: 'Copy (Ctrl+C)', click: () => this.copySelection() },
          { label: 'Cut (Ctrl+X)', click: () => this.cutSelection() },
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

  async deleteSelection(): Promise<void> {
    const selected = this.#getSelectedEntries();
    if (!selected.length) {
      return;
    }
    const message =
      selected.length === 1 ? `Delete "${selected[0].name}"?` : `Delete ${selected.length} items?`;
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message,
      buttons: ['Delete', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
    });
    if (result.response !== 0) {
      return;
    }
    try {
      for (const entry of selected) {
        await this.fs.remove(entry.path, entry.isDirectory);
      }
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
    this.selectedPaths = new Set();
    await this.refresh();
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

  #getSelectedEntries(): FileEntry[] {
    return this.entries.filter((entry) => this.selectedPaths.has(entry.path));
  }

  copySelection(): void {
    const paths = this.#getSelectedEntries().map((entry) => entry.path);
    if (!paths.length) {
      return;
    }
    this.clipboard.set({ op: 'copy', fs: this.fs, paths });
  }

  cutSelection(): void {
    const paths = this.#getSelectedEntries().map((entry) => entry.path);
    if (!paths.length) {
      return;
    }
    this.clipboard.set({ op: 'cut', fs: this.fs, paths });
  }

  isCut(entry: FileEntry): boolean {
    const clipboardEntry = this.clipboard.get();
    return (
      clipboardEntry?.op === 'cut' &&
      clipboardEntry.fs === this.fs &&
      clipboardEntry.paths.includes(entry.path)
    );
  }

  cancelCut(): void {
    if (this.clipboard.get()?.op === 'cut') {
      this.clipboard.clear();
    }
  }

  /** Plain click selects one item; Ctrl/Cmd toggles it; Shift selects the range from the anchor. */
  onEntryClick(event: MouseEvent, entry: FileEntry): void {
    if (event.shiftKey && this.#anchorPath) {
      const anchorIndex = this.filteredEntries.findIndex((item) => item.path === this.#anchorPath);
      const targetIndex = this.filteredEntries.findIndex((item) => item.path === entry.path);
      if (anchorIndex !== -1 && targetIndex !== -1) {
        const [start, end] =
          anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        this.selectedPaths = new Set(
          this.filteredEntries.slice(start, end + 1).map((item) => item.path),
        );
      } else {
        this.selectedPaths = new Set([entry.path]);
        this.#anchorPath = entry.path;
      }
    } else if (event.ctrlKey || event.metaKey) {
      const next = new Set(this.selectedPaths);
      if (next.has(entry.path)) {
        next.delete(entry.path);
      } else {
        next.add(entry.path);
      }
      this.selectedPaths = next;
      this.#anchorPath = entry.path;
    } else {
      this.selectedPaths = new Set([entry.path]);
      this.#anchorPath = entry.path;
    }
    this.focusPanel();
  }

  isSelected(entry: FileEntry): boolean {
    return this.selectedPaths.has(entry.path);
  }

  focusPanel(): void {
    this.panelRoot.nativeElement.focus({ preventScroll: true });
  }

  onFileListClick(event: MouseEvent): void {
    if (this.#marqueeJustFinished) {
      return;
    }
    if (event.target === event.currentTarget) {
      this.selectedPaths = new Set();
      this.#anchorPath = null;
    }
    this.focusPanel();
  }

  // -- Drag-to-select-range (marquee) --------------------------------------
  // Only arms when the mousedown starts outside any `.file-row`, so it never
  // competes with the native file drag-and-drop started from a row.

  onFileListMouseDown(event: MouseEvent): void {
    if (event.button !== 0 || !this.filteredEntries.length) {
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest('.file-row')) {
      return;
    }
    event.preventDefault();
    this.#marqueeStartClientY = event.clientY;
    window.addEventListener('mousemove', this.#onMarqueeMouseMove);
    window.addEventListener('mouseup', this.#onMarqueeMouseUp, { once: true });
  }

  #onMarqueeMouseMove = (event: MouseEvent): void => {
    if (this.#marqueeStartClientY === null) {
      return;
    }
    if (!this.#marqueeActive) {
      if (Math.abs(event.clientY - this.#marqueeStartClientY) < 4) {
        return;
      }
      this.#marqueeActive = true;
      this.#marqueeAnchorIndex = this.#rowIndexAtPoint(this.#marqueeStartClientY);
    }
    this.#updateMarqueeSelection(event.clientY);
  };

  #onMarqueeMouseUp = (): void => {
    window.removeEventListener('mousemove', this.#onMarqueeMouseMove);
    if (this.#marqueeActive) {
      this.#marqueeJustFinished = true;
      this.focusPanel();
      setTimeout(() => {
        this.#marqueeJustFinished = false;
      }, 0);
    }
    this.#marqueeActive = false;
    this.#marqueeAnchorIndex = null;
    this.#marqueeStartClientY = null;
  };

  #rowIndexAtPoint(clientY: number): number {
    const rows = this.fileListEl.nativeElement.querySelectorAll<HTMLElement>('.file-row');
    if (!rows.length) {
      return -1;
    }
    const containerRect = this.fileListEl.nativeElement.getBoundingClientRect();
    if (clientY <= containerRect.top) {
      return 0;
    }
    if (clientY >= containerRect.bottom) {
      return rows.length - 1;
    }
    for (let i = 0; i < rows.length; i++) {
      if (clientY < rows[i].getBoundingClientRect().bottom) {
        return i;
      }
    }
    return rows.length - 1;
  }

  #updateMarqueeSelection(clientY: number): void {
    if (this.#marqueeAnchorIndex === null) {
      return;
    }
    const currentIndex = this.#rowIndexAtPoint(clientY);
    if (currentIndex === -1) {
      return;
    }
    const [start, end] =
      this.#marqueeAnchorIndex <= currentIndex
        ? [this.#marqueeAnchorIndex, currentIndex]
        : [currentIndex, this.#marqueeAnchorIndex];
    this.selectedPaths = new Set(this.filteredEntries.slice(start, end + 1).map((e) => e.path));
    this.#anchorPath = this.filteredEntries[this.#marqueeAnchorIndex]?.path ?? null;
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (this.#isEditableTarget(event.target) || event.repeat) {
      return;
    }

    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    const hasSelection = this.selectedPaths.size > 0;

    if (modifier && key === 'c' && hasSelection) {
      event.preventDefault();
      this.copySelection();
    } else if (modifier && key === 'x' && hasSelection) {
      event.preventDefault();
      this.cutSelection();
    } else if (modifier && key === 'v' && this.clipboard.get()) {
      event.preventDefault();
      void this.#paste();
    } else if (event.key === 'Delete' && hasSelection) {
      event.preventDefault();
      void this.deleteSelection();
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
      for (const sourcePath of clip.paths) {
        if (clip.op === 'copy') {
          await this.transfer.copy(clip.fs, sourcePath, this.fs, this.path);
        } else {
          await this.transfer.move(clip.fs, sourcePath, this.fs, this.path);
        }
      }
      if (clip.op === 'cut') {
        this.clipboard.clear();
      }
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  // -- Drag & drop (upload/download between the local and remote panels) --

  onEntryDragStart(event: DragEvent, entry: FileEntry): void {
    // Dragging a row that's already part of a multi-selection carries the whole
    // selection; dragging an unselected row selects and drags just that one.
    if (!this.selectedPaths.has(entry.path) || this.selectedPaths.size <= 1) {
      this.selectedPaths = new Set([entry.path]);
      this.#anchorPath = entry.path;
    }
    const dragged = this.#getSelectedEntries();
    this.dragDrop.set({
      fs: this.fs,
      entries: dragged.map((item) => ({ path: item.path, isDirectory: item.isDirectory })),
    });
    this.draggingPaths = new Set(dragged.map((item) => item.path));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', entry.name);
    }
  }

  onEntryDragEnd(): void {
    this.draggingPaths = new Set();
    this.dragOverEntryPath = null;
    this.isListDropTarget = false;
    this.dragDrop.clear();
  }

  onEntryDragOver(event: DragEvent, entry: FileEntry): void {
    if (!entry.isDirectory || !this.dragDrop.get()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.dragOverEntryPath = entry.path;
  }

  onEntryDragLeave(entry: FileEntry): void {
    if (this.dragOverEntryPath === entry.path) {
      this.dragOverEntryPath = null;
    }
  }

  async onEntryDrop(event: DragEvent, entry: FileEntry): Promise<void> {
    if (!entry.isDirectory) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.dragOverEntryPath = null;
    await this.#handleDrop(entry.path, entry);
  }

  onListDragOver(event: DragEvent): void {
    if (!this.dragDrop.get()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isListDropTarget = true;
  }

  onListDragLeave(): void {
    this.isListDropTarget = false;
  }

  async onListDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isListDropTarget = false;
    await this.#handleDrop(this.path);
  }

  async #handleDrop(destDir: string, knownDestEntry?: FileEntry): Promise<void> {
    const payload = this.dragDrop.get();
    this.dragDrop.clear();
    if (!payload) {
      return;
    }

    // Best-effort only: if we can't confidently resolve the destination's mode bits,
    // proceed anyway and let the actual write surface a real permission error.
    const destEntry = knownDestEntry ?? (await this.#resolveEntryForPermissionCheck(destDir));
    if (destEntry && !isWritable(destEntry)) {
      this.notifications.error(`No write permission on "${destEntry.name || destDir}"`);
      return;
    }

    try {
      for (const item of payload.entries) {
        if (payload.fs === this.fs) {
          // Dropped back into the folder it already lives in: nothing to do.
          if (payload.fs.dirname(item.path) === destDir) {
            continue;
          }
          const descendantPrefix = item.path.endsWith('/') ? item.path : `${item.path}/`;
          if (item.isDirectory && (destDir === item.path || destDir.startsWith(descendantPrefix))) {
            this.notifications.error("Can't move a folder into itself");
            continue;
          }
        }
        await this.transfer.copy(payload.fs, item.path, this.fs, destDir);
      }
      await this.refresh();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    }
  }

  // Prefers the parent's list() for mode bits (matches the Permissions column) over a
  // bare stat(), since some SFTP backends don't populate `mode` reliably on stat() alone.
  async #resolveEntryForPermissionCheck(dirPath: string): Promise<FileEntry | null> {
    try {
      const parent = this.fs.dirname(dirPath);
      if (parent !== dirPath) {
        const siblings = await this.fs.list(parent);
        const known = siblings.find((sibling) => sibling.path === dirPath);
        if (known) {
          return known;
        }
      }
      return await this.fs.stat(dirPath);
    } catch {
      return null;
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
