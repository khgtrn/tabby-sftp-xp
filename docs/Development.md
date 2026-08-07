# Development

This document contains the development, build, and project-structure information for Tabby SFTP XP.

## Requirements

- Docker
- Docker Compose

Node.js and pnpm do not need to be installed on the host. All Node.js and pnpm commands run inside the `tabby_sftp_xp` container.

## Development environment

Build and start the container:

```bash
docker compose up -d --build
```

Install or update dependencies:

```bash
docker compose exec tabby_sftp_xp pnpm install
```

Run type checking:

```bash
docker compose exec tabby_sftp_xp pnpm run typecheck
```

Create a production build without source maps:

```bash
docker compose exec tabby_sftp_xp pnpm run build:prod
```

Create a development build with source maps:

```bash
docker compose exec tabby_sftp_xp pnpm run build:test
```

Rebuild continuously while editing source files:

```bash
docker compose exec tabby_sftp_xp pnpm run watch
```

Stop the development container:

```bash
docker compose down
```

## Load the plugin in Tabby

After building, copy or symlink the project directory into Tabby's plugin directory. During development, you can instead start Tabby with `TABBY_PLUGINS` set to the project directory:

```bash
TABBY_PLUGINS=/path/to/tabby-sftp-xp tabby
```

### Tabby Portable on Windows from WSL

Do not create an `mklink` inside `data\plugins\node_modules`. The Plugin Manager owns that directory and may remove links that are not present in its lockfile.

Fully close Tabby, then run `start-tabby-dev.cmd`. The script points `TABBY_PLUGINS` directly to the WSL project and launches Tabby in debug mode:

```powershell
& "\\wsl.localhost\Ubuntu-26.04\root\github\tabby-sftp-xp\start-tabby-dev.cmd"
```

The script currently expects the project at the path above and Tabby Portable at `D:\Software\tabby-portable-x64\Tabby.exe`. Update `start-tabby-dev.cmd` if your WSL distribution, project, or Tabby installation uses a different path.

## Project structure

```text
src/
  bookmarks/   Bookmark model and persistence
  config/      Plugin configuration provider
  core/        Shared paths and errors
  dialogs/     File operation dialogs
  editor/      Monaco editor and remote-file cache
  explorer/    Dual-pane explorer tab
  filesystem/  Local filesystem, clipboard, and transfer services
  panel/       Local and remote file panels
  settings/    Tabby settings integration
  sftp/        SFTP filesystem adapters and services
  tabby/       SSH terminal integration
  theme/       Theme handling
```

For the design and feature details, see [Main.md](Main.md) and [Function.md](Function.md). Docker-specific notes are available in [Docker.md](Docker.md).

## Build architecture

The project uses [Rspack](https://rspack.dev) to compile `src/index.ts` into `dist/index.js` as a UMD bundle. Dependencies supplied by Tabby, including Angular, Tabby packages, ng-bootstrap, and RxJS, are configured as externals and are not included in the bundle.

## License

Tabby SFTP XP is released under the [MIT License](../LICENSE).
