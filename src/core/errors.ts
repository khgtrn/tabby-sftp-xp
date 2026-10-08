/** Converts values thrown by third-party APIs into a safe message for the UI. */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
