FROM node:24-alpine as base
RUN apk add --no-cache bash && corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app
CMD ["tail", "-f", "/dev/null"]
