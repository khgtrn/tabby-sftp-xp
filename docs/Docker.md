Configure the Dockerfile to use Node.js 24 and install the packages required by the project, such as Rspack.

The Dockerfile runs `CMD tail -f /dev/null` to keep the container running during development.

Use a multi-stage build to reduce the size of the final image.

Configure `docker-compose.yaml` to make the services and development environment easier to manage.

Do not use npm on the host. Run all Node.js commands inside the container.

The container runs as `root` by default (Windows/WSL). On native Linux, `HOST_UID`/`HOST_GID` in `.env` make it run as the host user; see [Development.md](Development.md#development-environment). Corepack and the pnpm store are kept outside `/root` (`/opt/corepack`, `/pnpm-store`) so both users work.
