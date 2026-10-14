import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import type { FileEntry, IFileSystem } from '../filesystem/models';
import template from './path-input.component.html';
import styles from './path-input.component.scss';

/** Keeps `/` and drive roots like `C:/`, strips the trailing slash elsewhere. */
export function trimTrailingSlash(p: string): string {
  if (p === '/' || /^[A-Za-z]:\/$/.test(p)) {
    return p;
  }
  const trimmed = p.replace(/\/+$/, '');
  return /^[A-Za-z]:$/.test(trimmed) ? `${trimmed}/` : trimmed || '/';
}

/** Same grouping as the file list: hidden folders, folders, hidden files, files. */
const suggestionGroup = (e: FileEntry): number =>
  (e.isDirectory ? 0 : 2) + (e.name.startsWith('.') ? 0 : 1);

/**
 * Text input for a full path that suggests the children of the directory being typed.
 * Arrow keys move, Tab/Enter accept a suggestion, Escape closes the list.
 */
@Component({
  selector: 'sftp-xp-path-input',
  template,
  styles: [styles],
})
export class PathInputComponent implements AfterViewInit {
  @ViewChild('input', { static: true }) input!: ElementRef<HTMLInputElement>;

  @Input() fs!: IFileSystem;
  @Input() value = '';
  /** Folders are always suggested; files only when enabled (e.g. a symlink destination). */
  @Input() includeFiles = false;
  @Input() inputId?: string;
  @Input() placeholder = '';
  @Input() autofocus = false;
  @Output() valueChange = new EventEmitter<string>();
  /** Enter pressed with no suggestion highlighted. */
  @Output() confirm = new EventEmitter<void>();
  /** Escape pressed while the suggestion list is already closed. */
  @Output() cancel = new EventEmitter<void>();
  @Output() inputBlur = new EventEmitter<void>();

  suggestions: FileEntry[] = [];
  activeIndex = -1;

  /** Directory listings fetched while typing, reset every time the input gains focus. */
  #cache = new Map<string, Promise<FileEntry[]>>();
  #request = 0;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (this.autofocus) {
      queueMicrotask(() => this.input.nativeElement.focus());
    }
  }

  onFocus(): void {
    this.#cache.clear();
  }

  onBlur(): void {
    this.#clear();
    this.inputBlur.emit();
  }

  onInput(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
    void this.#load(value);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.suggestions.length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!count) {
          return;
        }
        event.preventDefault();
        this.activeIndex =
          event.key === 'ArrowDown'
            ? (this.activeIndex + 1) % count
            : (this.activeIndex - 1 + count) % count;
        this.#scrollActiveIntoView();
        break;
      case 'Tab':
        if (!count) {
          return;
        }
        event.preventDefault();
        this.accept(Math.max(this.activeIndex, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0) {
          this.accept(this.activeIndex);
        } else {
          this.#clear();
          this.confirm.emit();
        }
        break;
      case 'Escape':
        if (count) {
          // Keep the Escape away from surrounding handlers such as a modal's dismiss.
          event.preventDefault();
          event.stopPropagation();
          this.#clear();
        } else {
          this.cancel.emit();
        }
        break;
    }
  }

  /** Completes the typed segment; folders keep suggesting their own children. */
  accept(index: number): void {
    const entry = this.suggestions[index];
    if (!entry) {
      return;
    }
    const base = this.value.slice(0, this.value.lastIndexOf('/') + 1);
    if (entry.isDirectory) {
      this.onInput(`${base}${entry.name}/`);
    } else {
      this.#clear();
      this.value = `${base}${entry.name}`;
      this.valueChange.emit(this.value);
    }
  }

  async #load(value: string): Promise<void> {
    const request = ++this.#request;
    const slash = value.lastIndexOf('/');
    if (slash < 0) {
      this.#clear();
      return;
    }
    const dir = trimTrailingSlash(value.slice(0, slash + 1));
    const partial = value.slice(slash + 1).toLowerCase();

    let entries: FileEntry[];
    try {
      let listing = this.#cache.get(dir);
      if (!listing) {
        listing = this.fs.list(dir);
        this.#cache.set(dir, listing);
      }
      entries = await listing;
    } catch {
      this.#cache.delete(dir);
      entries = [];
    }
    // Ignore stale results when the user kept typing or left the input meanwhile.
    if (request !== this.#request) {
      return;
    }
    this.suggestions = entries
      .filter(
        (e) => (this.includeFiles || e.isDirectory) && e.name.toLowerCase().startsWith(partial),
      )
      .sort(
        (a, b) =>
          suggestionGroup(a) - suggestionGroup(b) ||
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      )
      .slice(0, 100);
    this.activeIndex = -1;
    // fs.list() may resolve outside Angular's zone.
    this.changeDetector.detectChanges();
  }

  #clear(): void {
    this.#request++;
    this.suggestions = [];
    this.activeIndex = -1;
  }

  #scrollActiveIntoView(): void {
    queueMicrotask(() =>
      this.input.nativeElement.parentElement
        ?.querySelector('.path-suggestion--active')
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }
}
