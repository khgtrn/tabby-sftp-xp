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

/** Connect dialog: pick a saved bookmark or enter SFTP connection details manually. */
@Component({
  selector: 'sftp-xp-connect-dialog',
  styles: [dialogStyles],
  template: `
    <div class="modal-header">
      <div class="dialog-title">
        <span class="dialog-icon"><i class="fas fa-plug"></i></span>
        <div>
          <h5 class="modal-title">Connect to SFTP</h5>
          <div class="dialog-subtitle">Connect securely to a remote server.</div>
        </div>
      </div>
      <button class="dialog-close" type="button" title="Close" (click)="modal.dismiss()">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <div class="field-group">
        <label for="sftp-connect-host">Host</label>
        <input
          id="sftp-connect-host"
          type="text"
          class="form-control"
          [(ngModel)]="options.host"
          placeholder="example.com"
        />
      </div>
      <div class="row g-3 field-group">
        <div class="col-8">
          <label for="sftp-connect-user">Username</label>
          <input
            id="sftp-connect-user"
            type="text"
            class="form-control"
            [(ngModel)]="options.username"
          />
        </div>
        <div class="col-4">
          <label for="sftp-connect-port">Port</label>
          <input
            id="sftp-connect-port"
            type="number"
            class="form-control"
            [(ngModel)]="options.port"
          />
        </div>
      </div>
      <div class="field-group">
        <label for="sftp-connect-password">Password</label>
        <input
          id="sftp-connect-password"
          type="password"
          class="form-control"
          [(ngModel)]="options.password"
        />
      </div>
      <div class="field-group">
        <label for="sftp-connect-key">Private key <span>(optional)</span></label>
        <textarea
          id="sftp-connect-key"
          class="form-control"
          rows="3"
          [(ngModel)]="options.privateKey"
        ></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="modal.dismiss()">Cancel</button>
      <button
        class="btn btn-primary"
        [disabled]="!options.host || !options.username"
        (click)="connect()"
      >
        Connect
      </button>
    </div>
  `,
})
export class ConnectDialogComponent {
  options: { host: string; port: number; username: string; password: string; privateKey: string } =
    {
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKey: '',
    };

  constructor(public readonly modal: NgbActiveModal) {}

  connect(): void {
    this.modal.close({
      host: this.options.host,
      port: this.options.port || 22,
      username: this.options.username,
      password: this.options.password || undefined,
      privateKey: this.options.privateKey || undefined,
    });
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
            <td>{{ entry.mtime | date: 'medium' }}</td>
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
