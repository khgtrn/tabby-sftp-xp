import { Injectable } from '@angular/core';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { shellQuotePosix } from './shell-quote';

const escapeForAppleScriptString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/** Builds the `osascript -e ...` argv for privileged-copying `tempPath` onto `targetPath` on macOS. Exported standalone so its quoting can be checked without spawning a process. */
export function buildMacSudoCommandArgs(targetPath: string, tempPath: string): string[] {
  const shellCommand = `dd if=${shellQuotePosix(tempPath)} of=${shellQuotePosix(targetPath)} status=none`;
  const script = `do shell script "${escapeForAppleScriptString(shellCommand)}" with administrator privileges`;
  return ['-e', script];
}

function runProcess(command: string, args: string[], stdin?: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
      }
    });
    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

/**
 * Writes a local file with elevated privileges via the OS's native
 * authentication prompt (`pkexec` on Linux, `osascript` on macOS). Not
 * supported on Windows — check `isSupported` before offering this.
 */
@Injectable({ providedIn: 'root' })
export class PrivilegedWriteService {
  static readonly isSupported = process.platform === 'linux' || process.platform === 'darwin';

  async writeLocalFile(targetPath: string, content: Buffer): Promise<void> {
    if (process.platform === 'linux') {
      await runProcess('pkexec', ['dd', `of=${targetPath}`, 'status=none'], content);
      return;
    }
    if (process.platform === 'darwin') {
      const tempPath = path.join(os.tmpdir(), `sftp-xp-sudo-${randomBytes(16).toString('hex')}`);
      await fsp.writeFile(tempPath, content, { mode: 0o600, flag: 'wx' });
      try {
        await runProcess('osascript', buildMacSudoCommandArgs(targetPath, tempPath));
      } finally {
        await fsp.rm(tempPath, { force: true });
      }
      return;
    }
    throw new Error('Elevated save is not supported on this platform.');
  }
}
