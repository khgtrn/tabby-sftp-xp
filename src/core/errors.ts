/** Converts values thrown by third-party APIs into a safe message for the UI. */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** True for Node fs errors caused by insufficient permissions (EACCES/EPERM). */
export const isPermissionError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'EACCES' || code === 'EPERM';
};

/** True for the SFTP protocol's SSH_FX_PERMISSION_DENIED status (code 3), as thrown by ssh2. */
export const isSftpPermissionDeniedError = (error: unknown): boolean =>
  (error as { code?: unknown })?.code === 3;
