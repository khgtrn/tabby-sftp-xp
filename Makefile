up:
	@docker compose up -d
stop:
	@docker compose stop
down:
	@docker compose down -v
build:
	@docker compose exec tabby_sftp_xp pnpm run build
install:
	@docker compose exec tabby_sftp_xp pnpm install --frozen-lockfile
typecheck:
	@docker compose exec tabby_sftp_xp pnpm run typecheck
