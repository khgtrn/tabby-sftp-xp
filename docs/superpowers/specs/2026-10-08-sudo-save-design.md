# Sudo-save on permission-denied (design spec)

## Goal

When saving a file (local or remote) fails because of insufficient
permissions, offer to retry the write with elevated privileges — the
same flow users get from "Edit as Administrator" style tools on
desktop Linux, applied to both the local filesystem and remote SFTP
editing that this plugin provides.

## Scope

- Local files opened in the editor tab.
- Remote files opened through a **standalone SFTP-XP connection**
  (new entry point introduced by this spec, backed by the `ssh2`
  package, which exposes a real exec channel on the same SSH
  connection).
- Remote files opened through the existing "open SFTP-XP from an
  active SSH tab" button are **out of scope** for the sudo retry
  itself (see Constraints) — they keep today's behavior unchanged.
- Windows is out of scope for the local sudo retry (no `sudo`/`pkexec`
  equivalent is attempted; the retry option simply does not appear).

## Background / constraints discovered during brainstorming

1. **Two independent remote connection kinds exist in this codebase:**
   - `TabbySftpFileSystem` (`src/sftp/tabby-sftp-filesystem.ts`) wraps
     a session obtained from an **already-open SSH terminal tab**
     (`tab.sshSession.openSFTP()`). Tabby's current nightly backs this
     with a Rust transport ("russh"); the only capability exposed to
     this plugin is `openSFTP()`. There is no way for this plugin to
     execute an arbitrary remote command (e.g. `sudo`) over that
     session with the APIs currently available.
   - `SftpConnection` (`src/sftp/sftp.service.ts`) wraps a
     **standalone** connection opened directly by this plugin via the
     `ssh2` npm package. It holds the raw `ssh2.Client`, which exposes
     `.exec()` — a real way to run a privileged command on the same
     SSH connection used for the file transfer.
   - Consequence: remote sudo-retry is only implemented for
     `SftpConnection`. For `TabbySftpFileSystem`, no new behavior is
     added; the existing generic error dialog (which already shows
     the real underlying message, e.g. "Permission denied") is
     sufficient and is left untouched.

2. **The standalone `SftpConnection` flow is currently dead code.**
   `FilePanelComponent.promptConnect()` opens `ConnectDialogComponent`
   but nothing calls `promptConnect()`. `ExplorerTabComponent`'s
   `connectionOptions` input (which drives `connect()`/retry UI) is
   never populated by any caller. The only live way to open an
   `ExplorerTabComponent` today is the "SFTP-XP" button added to an
   active SSH terminal tab (`src/tabby/terminal-decorator.ts`), which
   always produces a `TabbySftpFileSystem`.

   This spec therefore includes wiring up a real entry point for
   standalone connections (Part A below), because without it the
   remote sudo-retry feature (Part C) would have no reachable code
   path to attach to.

3. **Error shapes for permission-denied:**
   - Local (Node `fs/promises`): `error.code === 'EACCES'` or
     `'EPERM'`.
   - Remote via `ssh2` SFTP: `error.code === 3`
     (`SFTP.STATUS_CODE.PERMISSION_DENIED`, verified in
     `ssh2/lib/protocol/SFTP.js`).
   - Remote via `TabbySftpFileSystem`: unknown/unreliable shape — not
     relied on, since no new behavior is added for this path.

## Non-goals

- No support for elevating `TabbySftpFileSystem` (tab-derived)
  connections.
- No Windows local elevation (no UAC/`runas` integration).
- No persistent storage of any sudo/login password to disk; passwords
  only ever live in memory for the duration of a single retry
  operation.
- No change to the normal (non-permission-error) save/upload flow.

## Part A — Standalone SFTP-XP connection entry point

Adds a first-class way to open a remote SFTP-XP tab without first
opening an SSH terminal tab, using Tabby's native profile system
(`ProfileProvider` from `tabby-core`).

### `SftpXpConnectionProfileProvider`

New file `src/sftp/sftp-connection-profile.provider.ts`:

```ts
interface SftpXpConnectionProfile extends Profile {
  options: SftpConnectionOptions;
}

class SftpXpConnectionProfileProvider extends ProfileProvider<SftpXpConnectionProfile> {
  id = 'sftp-xp-connection';
  name = 'SFTP-XP Connection';
  settingsComponent = SftpXpProfileSettingsComponent;

  async getBuiltinProfiles(): Promise<PartialProfile<SftpXpConnectionProfile>[]> {
    return [];
  }

  async getNewTabParameters(profile: SftpXpConnectionProfile) {
    return { type: ExplorerTabComponent, inputs: { connectionOptions: profile.options } };
  }

  getDescription(profile: PartialProfile<SftpXpConnectionProfile>): string {
    return profile.options?.host ?? '';
  }
}
```

Registered in `plugin.module.ts` as
`{ provide: ProfileProvider, useClass: SftpXpConnectionProfileProvider, multi: true }`.

This profile then shows up in Tabby's native "New Tab" selector
alongside SSH/Local/Serial profiles. Picking it (or a saved instance of
it) opens `ExplorerTabComponent` with `connectionOptions` set —
`ExplorerTabComponent.ngOnInit()` already calls
`this.connect(this.connectionOptions)` when that input is present, and
the template already renders connecting/error/retry states. No changes
are needed in `explorer-tab.component.ts`/`.html` for this part; that
code was already written for exactly this input but never reachable.

### `SftpXpProfileSettingsComponent`

New file `src/sftp/sftp-connection-profile-settings.component.ts`,
implementing `ProfileSettingsComponent<SftpXpConnectionProfile>`
(`profile` input + `save()` callback, per Tabby's convention). Reuses
the same fields `ConnectDialogComponent` has today: host, port,
username, password, private key. Edits `profile.options` directly.

### Cleanup

- Delete `ConnectDialogComponent` (`src/dialogs/dialogs.component.ts`)
  and its declaration in `plugin.module.ts`.
- Delete `FilePanelComponent.promptConnect()`
  (`src/panel/file-panel.component.ts`) — no longer called by anything.

## Part B — Local sudo-save

### Error classification

New helper in `src/core/errors.ts`:

```ts
export const isPermissionError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'EACCES' || code === 'EPERM';
};
```

### Elevation mechanism

New service `src/core/privileged-write.service.ts`
(`PrivilegedWriteService`), platform-gated:

- **Linux** (`process.platform === 'linux'`): spawn
  `pkexec dd of=<path> status=none`, write the file content to the
  child's stdin, close stdin, wait for exit. `pkexec` itself displays
  the native polkit authentication dialog (the familiar Ubuntu
  password prompt) — this plugin never sees or handles a password for
  the local case.
- **macOS** (`process.platform === 'darwin'`): write the content to a
  private temp file first, then spawn
  `osascript -e 'do shell script "dd if=<tmp> of=<path> status=none" with administrator privileges'`.
  macOS shows its own native administrator-privileges prompt
  (Touch ID / password). The temp file is removed afterwards
  regardless of outcome.
- **Windows**: method rejects immediately with a clear
  "not supported on Windows" error; callers must check
  `PrivilegedWriteService.isSupported` (a `platform !== 'win32'` check)
  before offering the retry button at all, so the button never
  appears there.

All paths/content are passed as discrete `spawn()` arguments or via
stdin/a temp file — never interpolated into a shell string — except
for the single `osascript`/AppleScript command string on macOS, where
the destination path is embedded; that path is shell-escaped (wrapped
in single quotes, embedded `'` replaced with `'\''`) since AppleScript's
`do shell script` itself invokes `/bin/sh -c`.

### Wiring into `save()`

In `editor-tab.component.ts`, in the existing `catch` block of
`save()`:

- If `this.fs.kind === 'local'` and `isPermissionError(error)` and
  `PrivilegedWriteService.isSupported`, add a `Retry with sudo` button
  to the existing `platform.showMessageBox` call.
- On that button: call
  `privilegedWrite.writeLocalFile(this.filePath, content)`. On
  success: `this.dirty = false`, notify "Saved", return `true`. On
  failure (user cancelled the polkit/osascript prompt, or any other
  error): show `notifications.error(...)` and leave the file dirty
  (no further retry loop).

## Part C — Remote sudo-save (standalone `ssh2` connections only)

### `SftpConnection` changes (`src/sftp/sftp.service.ts`)

- Constructor retains the `password` used to open the connection (only
  present when the user authenticated with a password, not a key):
  `constructor(client, sftp, password?: string)`.
- New method:
  ```ts
  async writePrivileged(remotePath: string, data: Buffer, password: string): Promise<void>
  ```
  Runs `sudo -S -p '' dd of='<escaped remotePath>' status=none` via
  `this.client.exec(...)`. Writes `password + '\n'` then `data` to the
  exec channel's stdin, then ends it. Collects stderr; on a non-zero
  exit:
  - If stderr matches `/incorrect password|try again|no password was provided/i`,
    throw a distinguished `SudoAuthError` (new small error class,
    defined next to `SftpConnection` in this same file) so the caller
    can tell "wrong password" from "any other remote failure" (disk
    full, read-only filesystem, `sudo` not installed, user not in
    sudoers, etc. — all of those still surface, just as a generic
    error).
  - Otherwise throw a generic `Error` with the captured stderr.
- `remotePath` is single-quoted with embedded `'` escaped to `'\''`
  before being placed in the command string (SSH exec always goes
  through the remote shell, unlike local `spawn`).

### Wiring into `save()`

In the `catch` block of `save()`, when `this.fs instanceof SftpConnection`
and the caught error has `.code === 3`:

- Add a `Retry with sudo` button to the message box.
- On that button, call a new private helper `#retryUploadWithSudo()`:
  1. If `this.fs.password` is set, try `writePrivileged(...)` with it
     silently (no prompt).
  2. On `SudoAuthError` (wrong password) or when no password was
     available, open `SudoPasswordDialogComponent` (new, modal) to ask
     for the sudo password, then retry `writePrivileged(...)` with
     whatever was entered. If that also throws `SudoAuthError`, show
     the dialog again (let the user retry or cancel) rather than
     giving up after one attempt.
  3. On success: `this.dirty = false`, notify "Saved".
  4. On any non-auth error, or if the user cancels the password
     dialog: show `notifications.error(...)` and leave the file
     dirty.

No sudo password (whether reused from the login password or typed
into the dialog) is cached across separate save attempts: each new
`Retry with sudo` click re-runs this same sequence from step 1, so a
manually-entered password is only ever held for the single retry that
used it.

### `SudoPasswordDialogComponent`

New file alongside the existing dialogs
(`src/dialogs/sudo-password-dialog.component.ts`), modeled on
`PromptDialogComponent` but with a masked `type="password"` input and
copy explaining why it's being asked ("Enter the sudo password for
`<user>@<host>` to save this file."). Resolves with the entered string
or `null` on cancel. The entered value is held only in local component
state and the brief in-memory lifetime of the retry call — never
logged, never written to config/disk.

## Part D — Shared `save()` structure

`save()`'s existing try/catch/finally shape is preserved. The catch
block gains, in order:

1. Classify the error (`isPermissionError` for local kind;
   `error.code === 3` for `SftpConnection`).
2. Build the message box's button list: always
   `['Retry', 'Discard', 'Keep local']`, plus `'Retry with sudo'`
   appended when applicable (keeping existing `defaultId`/`cancelId`
   indices meaningful since the new button is appended last).
3. Dispatch to the matching handler for the clicked button index.

No change to the `dirty`/`saving` state machine beyond what's
described above; the existing `Retry` button still just calls
`this.save()` recursively as today.

## Testing

This project has no automated test suite (`tsc --noEmit` is the only
mechanized check available in this sandbox; the real Electron app
cannot be launched here — see prior sessions). Verification is manual,
to be performed by the project owner:

- Part A: open "New Tab" in Tabby, confirm "SFTP-XP Connection"
  appears, create a profile, connect, confirm the remote panel loads
  exactly like the tab-derived one.
- Part B: on Linux and macOS, edit a root-owned local file, save,
  confirm the native elevation prompt appears and the save succeeds
  after entering the correct password; confirm cancelling the prompt
  leaves the file dirty with an error notice; confirm the button does
  not appear on Windows.
- Part C: via a standalone SFTP-XP connection, edit a root-owned
  remote file; save; confirm silent retry using the login password
  when it is correct; confirm the password dialog appears when it
  is wrong or when the connection used a key; confirm a wrong sudo
  password re-prompts rather than failing outright.
- Confirm opening SFTP-XP from an existing SSH tab and hitting a
  permission error still shows today's plain error dialog with no new
  button.
