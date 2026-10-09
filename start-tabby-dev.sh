#!/usr/bin/env bash
# Start Tabby (native Linux, .deb install) with this project loaded as a
# development plugin. Equivalent of start-tabby-dev.cmd for Windows/WSL.
#
# Development plugins must be supplied through TABBY_PLUGINS. Do not create
# links inside ~/.config/tabby/plugins/node_modules because Tabby's plugin
# manager owns it.
#
# Override the Tabby binary with TABBY_BIN=/path/to/tabby (e.g. an AppImage).
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tabby_bin="${TABBY_BIN:-tabby}"

if ! command -v "$tabby_bin" >/dev/null 2>&1; then
    echo "Tabby not found: '$tabby_bin'. Install the .deb package or set TABBY_BIN." >&2
    exit 1
fi

if [[ ! -f "$project_dir/dist/index.js" ]]; then
    echo "dist/index.js is missing. Build first:" >&2
    echo "  docker compose exec tabby_sftp_xp pnpm run build:test" >&2
    exit 1
fi

# A running instance would receive the launch instead, ignoring TABBY_PLUGINS.
if pgrep -x tabby >/dev/null 2>&1; then
    echo "Tabby is already running. Close it fully, then run this script again." >&2
    exit 1
fi

export TABBY_PLUGINS="$project_dir"
exec "$tabby_bin" --debug "$@"
