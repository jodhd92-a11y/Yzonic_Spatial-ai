# Root Makefile — runs the JS side (turbo) and the Rust side (cargo) side
# by side, per blueprint section 5: "add a Makefile/just recipe so both
# build systems run side by side."
#
# Usage:
#   make dev            # frontends (turbo) + engine-core, together
#   make engine-dev      # just engine-core, with auto-reload if cargo-watch is installed
#   make engine-build     # release build of engine-core
#   make engine-test        # cargo test across the engine workspace
#   make engine-fmt          # cargo fmt --check + clippy, same enforcement level as prettier/eslint
#   make infra-up      # postgres + redis via docker-compose (existing)

.PHONY: dev engine-dev engine-build engine-test engine-fmt infra-up infra-down

dev: infra-up
	turbo run dev & \
	$(MAKE) engine-dev; \
	wait

engine-dev:
	cd services/engine && \
	if command -v cargo-watch >/dev/null 2>&1; then \
		cargo watch -x 'run -p engine-core'; \
	else \
		cargo run -p engine-core; \
	fi

engine-build:
	cd services/engine && cargo build --release -p engine-core

engine-test:
	cd services/engine && cargo test --workspace

engine-fmt:
	cd services/engine && cargo fmt --check && cargo clippy --all-targets -- -D warnings

infra-up:
	docker compose up -d postgres redis

infra-down:
	docker compose down
