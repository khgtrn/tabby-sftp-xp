# Changelog

All notable changes to Tabby SFTP XP are documented in this file.

## [1.3.1] - 2026-10-09

### Fixed

- Fixed installing the plugin from Tabby's Plugin Manager failing with "Error in sftp-xp: [object Object]". The package no longer declares `peerDependencies`; npm tried to install Angular and Tabby packages next to the plugin and failed with an `ERESOLVE` conflict. These packages are provided by Tabby at runtime.

## [1.3.0] - 2026-10-08

### Added

- Added multi-select in the file panels: <kbd>Ctrl</kbd>/<kbd>Shift</kbd> + click to select multiple items, or drag a selection rectangle starting from empty space.
- Copy, cut, and delete now act on the entire selection, from both the keyboard shortcuts and the context menu.
- Dragging a multi-item selection onto the other pane now uploads or downloads every selected file and folder, not just one.

### Fixed

- Fixed the file panel getting stuck on "Loading..." indefinitely after some SFTP operations finished.
- Replaced the inline "Loading..." text with a spinner overlay so the previous file list stays visible while the panel refreshes.
- Errors are now shown as toast notifications instead of inline text in the panel.

### Changed

- Increased the font size of the path input and path label for readability.

## [1.2.0] - 2026-08-27

### Added

- Added drag-and-drop transfers between the local and remote panels: dragging an item into the other pane uploads or downloads it, and the destination directory refreshes automatically once the transfer finishes.
- Dropping a file or folder now checks that the destination directory is writable before starting the transfer.

### Fixed

- Fixed a stale "SFTP-XP disconnected" notification appearing when the parent SSH tab was closed after its SFTP-XP explorer tab had already been closed.

## [1.1.0] - 2026-08-14

### Added

- Added `Modified`, POSIX `Permissions`, and `Size` columns to both file panels. Permissions use the symbolic `ls -al` style, such as `drwxr-xr-x`.
- Added responsive file metadata: `Modified` and `Permissions` are hidden on narrow panels, followed by `Size` on very narrow panels, while long file and folder names remain visible and wrap when necessary.
- Standardized displayed timestamps to the 24-hour `yyyy-MM-dd HH:mm:ss` format.
- Added configurable Monaco editor themes inspired by Dracula, Tokyo Night, Ayu Dark, Ayu Mirage, One Dark Pro, Monokai, and Nord, alongside the default theme.
- Added editor settings for minimap visibility, font family, font size, line height, and letter spacing. Changes apply to editors that are already open.
- Added system clipboard integration for Monaco, including Cut, Copy, and Paste through keyboard shortcuts and a compact custom context menu.
- Added the full file path below the filename in the editor toolbar.

### Changed

- Saving a remote file now always uploads the latest content immediately.
- Deleting a file or folder now always requires confirmation; the optional confirmation setting was removed.
- Clicking the path bar and submitting the unchanged path no longer reloads the directory.
- Stabilized the path bar height so switching between the path label and input no longer shifts the file list.
- Improved development commands and documentation for launching the plugin directly from WSL.

## [1.0.0]

- Initial release with dual-pane local and remote SFTP browsing, file operations, bookmarks, POSIX permissions, transfers, and remote editing with Monaco.
