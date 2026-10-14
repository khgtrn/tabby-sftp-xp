# Changelog

All notable changes to Tabby SFTP XP are documented in this file.

## [1.4.0] - 2026-10-14

### Added

- Added sorting by `Name`, `Modified`, or `Size`: click a column header to sort, click it again to reverse the order. Entries stay grouped as hidden folders, folders, hidden files, then files, and each group is sorted on its own.
- Added folder suggestions while typing in the path bar. Use <kbd>↑</kbd>/<kbd>↓</kbd> to move, <kbd>Tab</kbd> or <kbd>Enter</kbd> to accept, and <kbd>Esc</kbd> to close the list. Hidden folders are always suggested.
- Symbolic links now show their destination in the `Name` column as `name -> destination`, with the destination highlighted.
- Added **Create Symlink** to the context menu. The dialog takes a full link path and a full destination path, and both fields suggest paths as you type. On remote servers the link is created with `ln -s` over the existing SSH connection, because Tabby's SFTP session has no symlink request.
- Creating a symlink where one already exists now asks whether to replace it. An existing file or folder that is not a symlink is never overwritten.
- Each file panel now shows a `Local` or `Remote` title above its toolbar.

### Changed

- Moved the filter button from the toolbar to the start of the path bar. The button stays highlighted while the filter is open.
- Restyled text inputs and selects as underlined fields without a box or background change. On focus, an accent line grows from the center without shifting the layout.
- Select dropdown options now follow the plugin's light or dark theme.

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
