/**
 * Quotes `value` as a single POSIX shell word, safe to splice into a shell
 * command string (e.g. an SSH `exec` request, which always runs through the
 * remote shell). Wraps in single quotes and escapes any embedded single
 * quote as `'\''` (close quote, escaped literal quote, reopen quote).
 */
export const shellQuotePosix = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;
