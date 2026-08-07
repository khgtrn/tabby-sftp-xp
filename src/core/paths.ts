import * as os from 'os';
import * as nodePath from 'path';

/** Base config directory for this plugin: `~/.config/tabby-sftp/`. */
export const getConfigDir = (): string => nodePath.join(os.homedir(), '.config', 'tabby-sftp-xp');

/** Get bookmarks file path */
export const getBookmarksFile = (): string => nodePath.join(getConfigDir(), 'bookmarks.json');

/** Default local folder used to cache downloaded remote files while they're being edited. */
export const getTempDir = (): string => nodePath.join(getConfigDir(), 'temp');

/** Default local folder used to store downloaded files */
export const getDownloadDir = (): string => nodePath.join(os.homedir(), 'Downloads');
