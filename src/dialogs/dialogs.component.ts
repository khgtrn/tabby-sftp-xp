import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import type { FileEntry } from '../filesystem/models';
import { modeToPermissions, permissionsToMode, PosixPermissions } from '../filesystem/models';
import dialogStyles from './dialogs.component.scss';

/** Simple single-text-field prompt, used for rename / new file / new folder. */
@Component({
  selector: 'sftp-xp-prompt-dialog',
  styles: [dialogStyles],
  template: `
    <div class="modal-header">
      <div class="dialog-title">
        <span class="dialog-icon"><i class="fas fa-pen"></i></span>
        <h5 class="modal-title">{{ title }}</h5>
      </div>
      <button class="dialog-close" type="button" title="Close" (click)="modal.dismiss()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <input
        type="text"
        class="form-control"
        [(ngModel)]="value"
        (keydown.enter)="save()"
        autofocus
      />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
      <button class="btn btn-primary" [disabled]="!value.trim()" (click)="save()">Save</button>
    </div>
  `,
})
export class PromptDialogComponent {
  @Input() title = 'Enter a value';
  @Input() value = '';

  constructor(public readonly modal: NgbActiveModal) {}

  save(): void {
    if (this.value.trim()) {
      this.modal.close(this.value.trim());
    }
  }
}

/** Prompts for a sudo password when retrying a permission-denied remote save with elevated privileges. */
@Component({
  selector: 'sftp-xp-sudo-password-dialog',
  styles: [dialogStyles],
  template: `
    <div class="modal-header">
      <div class="dialog-title">
        <span class="dialog-icon"><i class="fas fa-user-shield"></i></span>
        <h5 class="modal-title">Sudo password required</h5>
      </div>
      <button class="dialog-close" type="button" title="Close" (click)="modal.dismiss()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <p class="dialog-subtitle">{{ message }}</p>
      <input
        type="password"
        class="form-control"
        [(ngModel)]="password"
        (keydown.enter)="save()"
        autofocus
      />
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
      <button class="btn btn-primary" [disabled]="!password" (click)="save()">Save with sudo</button>
    </div>
  `,
})
export class SudoPasswordDialogComponent {
  @Input() message = 'Enter the sudo password to save this file.';
  password = '';

  constructor(public readonly modal: NgbActiveModal) {}

  save(): void {
    if (this.password) {
      this.modal.close(this.password);
    }
  }
}

/** Linux-style rwx permission editor (Owner/Group/Other). */
@Component({
  selector: 'sftp-xp-permission-dialog',
  styles: [dialogStyles],
  template: `
    <div class="modal-header">
      <div class="dialog-title">
        <span class="dialog-icon"><i class="fas fa-shield-alt"></i></span>
        <div>
          <h5 class="modal-title">Permissions</h5>
          <div class="dialog-subtitle truncate">{{ entry.name }}</div>
        </div>
      </div>
      <button class="dialog-close" type="button" title="Close" (click)="modal.dismiss()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <table class="table table-sm text-center">
        <thead>
          <tr>
            <th></th>
            <th>Read</th>
            <th>Write</th>
            <th>Execute</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-start">Owner</td>
            <td><input type="checkbox" [(ngModel)]="perm.ownerRead" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.ownerWrite" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.ownerExecute" /></td>
          </tr>
          <tr>
            <td class="text-start">Group</td>
            <td><input type="checkbox" [(ngModel)]="perm.groupRead" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.groupWrite" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.groupExecute" /></td>
          </tr>
          <tr>
            <td class="text-start">Other</td>
            <td><input type="checkbox" [(ngModel)]="perm.otherRead" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.otherWrite" /></td>
            <td><input type="checkbox" [(ngModel)]="perm.otherExecute" /></td>
          </tr>
        </tbody>
      </table>
      <div class="octal-value">
        <span>Octal</span><code>{{ octal }}</code>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
      <button class="btn btn-primary" (click)="save()">Apply</button>
    </div>
  `,
})
export class PermissionDialogComponent {
  @Input() entry!: FileEntry;
  perm: PosixPermissions = modeToPermissions(0);

  constructor(public readonly modal: NgbActiveModal) {}

  ngOnInit(): void {
    this.perm = modeToPermissions(this.entry.mode);
  }

  get octal(): string {
    return permissionsToMode(this.perm).toString(8).padStart(3, '0');
  }

  save(): void {
    this.modal.close(permissionsToMode(this.perm));
  }
}

/** Read-only properties dialog (name/size/owner/group/dates/permissions). */
@Component({
  selector: 'sftp-xp-properties-dialog',
  styles: [dialogStyles],
  template: `
    <div class="modal-header">
      <div class="dialog-title">
        <span class="dialog-icon"><i class="fas fa-info"></i></span>
        <h5 class="modal-title">Properties</h5>
      </div>
      <button class="dialog-close" type="button" title="Close" (click)="modal.dismiss()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <table class="table properties-table">
        <tbody>
          <tr>
            <th>Name</th>
            <td>{{ entry.name }}</td>
          </tr>
          <tr>
            <th>Path</th>
            <td class="path-value">{{ entry.path }}</td>
          </tr>
          <tr>
            <th>Size</th>
            <td>{{ entry.isDirectory ? '—' : entry.size + ' bytes' }}</td>
          </tr>
          <tr>
            <th>Owner</th>
            <td>{{ entry.owner }}</td>
          </tr>
          <tr>
            <th>Group</th>
            <td>{{ entry.group }}</td>
          </tr>
          <tr>
            <th>Modified</th>
            <td>{{ entry.mtime | date: 'yyyy-MM-dd HH:mm:ss' }}</td>
          </tr>
          <tr>
            <th>Permissions</th>
            <td>{{ octal }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" (click)="modal.close()">Close</button>
    </div>
  `,
})
export class PropertiesDialogComponent {
  @Input() entry!: FileEntry;

  constructor(public readonly modal: NgbActiveModal) {}

  get octal(): string {
    return (this.entry.mode & 0o777).toString(8).padStart(3, '0');
  }
}
