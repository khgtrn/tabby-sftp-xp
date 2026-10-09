FROM node:24-alpine as base
# Corepack and the pnpm store live outside /root so the container also works
# when docker-compose runs it as the host user (HOST_UID/HOST_GID on Linux).
ENV COREPACK_HOME=/opt/corepack \
    npm_config_store_dir=/pnpm-store
RUN apk add --no-cache bash && corepack enable && corepack prepare pnpm@11 --activate \
    && chmod -R a+rwX /opt/corepack \
    && mkdir -p /app/node_modules /pnpm-store \
    && chmod 1777 /app/node_modules /pnpm-store
WORKDIR /app
CMD ["tail", "-f", "/dev/null"]
