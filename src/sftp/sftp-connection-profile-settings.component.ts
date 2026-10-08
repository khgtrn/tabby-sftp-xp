import { Component, Input, OnInit } from '@angular/core';
import type { ProfileSettingsComponent } from 'tabby-core';
import dialogStyles from '../dialogs/dialogs.component.scss';
import type { SftpXpConnectionProfile } from './sftp-connection-profile.provider';

@Component({
  selector: 'sftp-xp-connection-profile-settings',
  styles: [dialogStyles],
  template: `
    <div class="field-group">
      <label for="sftp-xp-profile-host">Host</label>
      <input
        id="sftp-xp-profile-host"
        type="text"
        class="form-control"
        [(ngModel)]="profile.options.host"
        placeholder="example.com"
      />
    </div>
    <div class="row g-3 field-group">
      <div class="col-8">
        <label for="sftp-xp-profile-user">Username</label>
        <input
          id="sftp-xp-profile-user"
          type="text"
          class="form-control"
          [(ngModel)]="profile.options.username"
        />
      </div>
      <div class="col-4">
        <label for="sftp-xp-profile-port">Port</label>
        <input
          id="sftp-xp-profile-port"
          type="number"
          class="form-control"
          [(ngModel)]="profile.options.port"
        />
      </div>
    </div>
    <div class="field-group">
      <label for="sftp-xp-profile-password">Password <span>(optional if using a private key)</span></label>
      <input
        id="sftp-xp-profile-password"
        type="password"
        class="form-control"
        [(ngModel)]="profile.options.password"
      />
    </div>
    <div class="field-group">
      <label for="sftp-xp-profile-key">Private key <span>(optional)</span></label>
      <textarea
        id="sftp-xp-profile-key"
        class="form-control"
        rows="3"
        [(ngModel)]="profile.options.privateKey"
      ></textarea>
    </div>
  `,
})
export class SftpXpProfileSettingsComponent
  implements ProfileSettingsComponent<SftpXpConnectionProfile>, OnInit
{
  @Input() profile!: SftpXpConnectionProfile;
  @Input() save?: () => void;

  ngOnInit(): void {
    this.profile.options ??= { host: '', port: 22, username: '' };
  }
}
