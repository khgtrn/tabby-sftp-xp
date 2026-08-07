import { OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationsService } from 'tabby-core';
import { Bookmark } from './bookmark.model';
import { BookmarkService } from './bookmark.service';
export declare class BookmarkManagerComponent implements OnInit {
    readonly modal: NgbActiveModal;
    private readonly bookmarkService;
    private readonly notifications;
    /** Which side triggered the dialog; new bookmarks default to this side. */
    side: 'local' | 'remote';
    /** Called by the panel when the user picks a bookmark to jump to. */
    onSelect: ((path: string) => void) | null;
    bookmarks: Bookmark[];
    editingId: string | null;
    editName: string;
    editPath: string;
    constructor(modal: NgbActiveModal, bookmarkService: BookmarkService, notifications: NotificationsService);
    ngOnInit(): Promise<void>;
    select(bookmark: Bookmark): void;
    startAdd(): void;
    startEdit(bookmark: Bookmark): void;
    cancelEdit(): void;
    save(): Promise<void>;
    remove(bookmark: Bookmark): Promise<void>;
}
