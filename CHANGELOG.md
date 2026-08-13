# Changelog

All notable changes to Tabby SFTP XP are documented in this file.

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
