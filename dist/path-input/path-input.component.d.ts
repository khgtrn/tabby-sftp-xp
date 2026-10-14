import { AfterViewInit, ChangeDetectorRef, ElementRef, EventEmitter } from '@angular/core';
import type { FileEntry, IFileSystem } from '../filesystem/models';
/** Keeps `/` and drive roots like `C:/`, strips the trailing slash elsewhere. */
export declare function trimTrailingSlash(p: string): string;
/**
 * Text input for a full path that suggests the children of the directory being typed.
 * Arrow keys move, Tab/Enter accept a suggestion, Escape closes the list.
 */
export declare class PathInputComponent implements AfterViewInit {
    #private;
    private readonly changeDetector;
    input: ElementRef<HTMLInputElement>;
    fs: IFileSystem;
    value: string;
    /** Folders are always suggested; files only when enabled (e.g. a symlink destination). */
    includeFiles: boolean;
    inputId?: string;
    placeholder: string;
    autofocus: boolean;
    valueChange: EventEmitter<string>;
    /** Enter pressed with no suggestion highlighted. */
    confirm: EventEmitter<void>;
    /** Escape pressed while the suggestion list is already closed. */
    cancel: EventEmitter<void>;
    inputBlur: EventEmitter<void>;
    suggestions: FileEntry[];
    activeIndex: number;
    constructor(changeDetector: ChangeDetectorRef);
    ngAfterViewInit(): void;
    onFocus(): void;
    onBlur(): void;
    onInput(value: string): void;
    onKeydown(event: KeyboardEvent): void;
    /** Completes the typed segment; folders keep suggesting their own children. */
    accept(index: number): void;
}
