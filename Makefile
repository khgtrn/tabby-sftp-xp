build:
	@docker compose exec tabby_sftp_xp pnpm run build
typecheck:
	@docker compose exec tabby_sftp_xp pnpm run typecheck
