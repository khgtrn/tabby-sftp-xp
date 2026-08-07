import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationsService } from 'tabby-core';
import template from './bookmark-manager.component.html';
import styles from './bookmark-manager.component.scss';
import { Bookmark } from './bookmark.model';
import { BookmarkService } from './bookmark.service';

@Component({
  selector: 'sftp-xp-bookmark-manager',
  template,
  styles: [styles],
})
export class BookmarkManagerComponent implements OnInit {
  /** Which side triggered the dialog; new bookmarks default to this side. */
  @Input() side: 'local' | 'remote' = 'local';
  /** Called by the panel when the user picks a bookmark to jump to. */
  @Input() onSelect: ((path: string) => void) | null = null;

  bookmarks: Bookmark[] = [];
  editingId: string | null = null;
  editName = '';
  editPath = '';

  constructor(
    public readonly modal: NgbActiveModal,
    private readonly bookmarkService: BookmarkService,
    private readonly notifications: NotificationsService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.bookmarkService.load();
    this.bookmarkService.all$.subscribe((list) => {
      this.bookmarks = list.filter((b) => b.side === 'both' || b.side === this.side);
    });
  }

  select(bookmark: Bookmark): void {
    this.onSelect?.(bookmark.path);
    this.modal.close();
  }

  startAdd(): void {
    this.editingId = 'new';
    this.editName = '';
    this.editPath = '';
  }

  startEdit(bookmark: Bookmark): void {
    this.editingId = bookmark.id;
    this.editName = bookmark.name;
    this.editPath = bookmark.path;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  async save(): Promise<void> {
    if (!this.editName.trim() || !this.editPath.trim()) {
      return;
    }
    if (this.editingId === 'new') {
      await this.bookmarkService.add(this.editName.trim(), this.editPath.trim(), this.side);
      this.notifications.notice(`Added bookmark "${this.editName.trim()}"`);
    } else if (this.editingId) {
      await this.bookmarkService.update(this.editingId, {
        name: this.editName.trim(),
        path: this.editPath.trim(),
      });
    }
    this.editingId = null;
  }

  async remove(bookmark: Bookmark): Promise<void> {
    await this.bookmarkService.remove(bookmark.id);
  }
}
