# Tabby.sh plugin for editing remote files as if they were local

## Goals
- Manage local files and remote SFTP files
- Edit files as if they were local
- Integrate fully with Tabby
- Avoid dependencies on external applications
- Support Tabby's plugin architecture

## Technologies
- Angular 15.x
- Electron
- TypeScript 6.x
- Rspack
- NodeJS 24.x

## Coding conventions
- Follow Tabby's coding conventions
- Use TypeScript 6.x syntax and newer language features where possible; avoid legacy syntax
- Format code according to the project's `.editorconfig`

## Description
- The library can be installed in Tabby and complies with Tabby's plugin requirements.
- It uses Angular alongside Tabby, currently version 15.
- TypeScript 6, Node.js 24, and Rspack compile the source code, while the Tabby application provides the runtime environment.
- The plugin adds a settings tab for options such as colors and icons. More options can be added as new features are introduced.
- It adds an SFTP button to the SSH screen and to the profile-selection dropdown used to start a connection.
- Clicking the button opens a new tab with two main panes: local and remote. Each pane displays the current path at the top. Users can edit the path directly and press Enter to navigate to the directory. The toolbar includes Back, Forward, Parent Directory, Refresh, Home, file and path filtering, and Bookmarks controls.
- Clicking the Bookmarks button displays saved paths, which can be added, edited, or deleted directly in the dialog.
- Right-clicking an empty area opens actions for creating a folder, creating a file, and refreshing all displayed parent directories.
- Right-clicking a folder provides actions to rename or delete it, create a subfolder or file inside it, edit permissions, view properties, copy, cut, refresh the folder and its children, or copy its path. Deletion requires confirmation.
- Right-clicking a file provides actions to edit, rename, delete, edit permissions, view properties, cut, copy, or copy its path. Deletion requires confirmation.
- Files are edited in Monaco Editor, using a minimal and responsive interface. When a file cannot be opened directly, the plugin automatically downloads it to a local temporary directory. Saving uploads it back to the remote host, giving users the experience of editing the file directly.
