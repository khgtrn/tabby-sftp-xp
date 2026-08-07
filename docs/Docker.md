Configure the Dockerfile to use Node.js 24 and install the packages required by the project, such as Rspack.

The Dockerfile runs `CMD tail -f /dev/null` to keep the container running during development.

Use a multi-stage build to reduce the size of the final image.

Configure `docker-compose.yaml` to make the services and development environment easier to manage.

Do not use npm on the host. Run all Node.js commands inside the container.
