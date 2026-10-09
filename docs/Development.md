# Development

This document contains the development, build, and project-structure information for Tabby SFTP XP.

## Requirements

- Docker
- Docker Compose

Node.js and pnpm do not need to be installed on the host. All Node.js and pnpm commands run inside the `tabby_sftp_xp` container.

## Supported development setups

The project can be developed from two environments. Both use the same repository, Docker container, and build commands; only the container user and the way Tabby is launched differ.

| | Windows (WSL) | Native Linux (Ubuntu) |
| --- | --- | --- |
| Source location | WSL filesystem, e.g. `/root/github/tabby-sftp-xp` | Linux filesystem, e.g. `~/Project/gh/tabby-sftp-xp` |
| Container user | `root` (default, no `.env`) | Host user, set in `.env` |
| Tabby | Tabby Portable for Windows | Tabby `.deb` package |
| Launcher | `start-tabby-dev.cmd` | `start-tabby-dev.sh` |
| Tabby config | `data\` next to `Tabby.exe` | `~/.config/tabby/` |

## Development environment

### Windows (WSL)

No extra setup is needed. Without a `.env` file the container runs as `root`, which matches the WSL project owned by `root`.

### Native Linux

Run the container as your host user so files created by builds (`dist/`, which is tracked in git) are not owned by `root`. Create `.env` from the example and set your IDs (`id -u`, `id -g`):

```bash
cp .env.example .env
```

`.env` is ignored by git, so it does not affect the WSL setup.

If the container was previously created as `root` on the same machine, recreate it and its `node_modules` volume once:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec tabby_sftp_xp pnpm install
```

### Common commands

The commands below are the same in both environments.

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

During development, load the plugin by starting Tabby with `TABBY_PLUGINS` set to the project directory. Build the plugin first so `dist/index.js` exists.

Do not create links inside Tabby's plugin `node_modules` directory (`data\plugins\node_modules` on Windows Portable, `~/.config/tabby/plugins/node_modules` on Linux). The Plugin Manager owns that directory and may remove links that are not present in its lockfile.

Tabby runs as a single instance: if it is already open, a new launch is handed to the running instance and `TABBY_PLUGINS` is ignored. Fully close Tabby before using either launcher.

### Windows: Tabby Portable from WSL

Fully close Tabby, then run `start-tabby-dev.cmd`. The script points `TABBY_PLUGINS` directly to the WSL project and launches Tabby in debug mode:

```powershell
& "\\wsl.localhost\Ubuntu-26.04\root\github\tabby-sftp-xp\start-tabby-dev.cmd"
```

The script currently expects the project at the path above and Tabby Portable at `D:\Software\tabby-portable-x64\Tabby.exe`. Update `start-tabby-dev.cmd` if your WSL distribution, project, or Tabby installation uses a different path.

### Native Linux: Tabby `.deb`

Install Tabby from the `.deb` package (recommended over the AppImage: it provides the `tabby` command and avoids the AppImage FUSE and Electron sandbox issues on recent Ubuntu releases).

Fully close Tabby, then run:

```bash
./start-tabby-dev.sh
```

The script resolves the project directory from its own location, so it works wherever the repository is cloned. It checks that `dist/index.js` exists and that Tabby is not already running, then starts `tabby --debug` with `TABBY_PLUGINS` set to the project. Tabby runs in the foreground, so its logs appear in the terminal.

To use a different Tabby binary, such as an AppImage, set `TABBY_BIN`:

```bash
TABBY_BIN=~/Applications/Tabby.AppImage ./start-tabby-dev.sh
```

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
