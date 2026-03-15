PACKAGES = .

sync_all:
	@for pkg in $(PACKAGES); do \
		echo "Syncing $$pkg..."; \
		(cd $$pkg && uv sync --dev --link-mode=symlink); \
	done

format_all:
	uv run ruff check --select I --fix
	uv run ruff format .

test_all:
	@for pkg in $(PACKAGES); do \
		echo "Testing $$pkg..."; \
		(cd $$pkg && uv run pytest); \
	done

quality_gate: format_all test_all
