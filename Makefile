up:
	@docker compose up -d
stop:
	@docker compose stop
build:
	@docker compose exec tabby_sftp_xp pnpm run build
typecheck:
	@docker compose exec tabby_sftp_xp pnpm run typecheck
