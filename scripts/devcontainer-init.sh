#!/usr/bin/env bash
# scripts/devcontainer-init.sh
# Post-create initialization script for DevContainer (.devcontainer/devcontainer.json).
# Runs inside the container after the devcontainer is created.
set -euo pipefail

echo "=== DevContainer post-create init ==="

# Note: solargraph and rubocop are pre-installed as system gems in the devcontainer image.
# Note: Playwright e2e tests run from the HOST via `make test` — not inside the container.

# Wait for Redmine to be fully ready (HTTP 200/302 on /login).
# The Redmine entrypoint runs all ~60 base migrations on startup against a fresh tmpfs
# postgres. We must NOT run concurrent rake processes — that causes OOM (exit 137).
# Polling localhost:3000 guarantees the entrypoint has finished before we proceed.
echo "Waiting for Redmine to be ready (entrypoint migrations in progress)..."
TIMEOUT=300
ELAPSED=0
until curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/login 2>/dev/null | grep -qE '^(200|302)$'; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "  ERROR: Redmine did not become ready within ${TIMEOUT}s. Aborting." >&2
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done
echo "  Redmine is ready (${ELAPSED}s)."

# Run plugin migrations only.
# Base Redmine migrations were already applied by the entrypoint — re-running db:migrate
# here would start a second concurrent Rails process and risk OOM on tight memory limits.
# Must cd to /usr/src/redmine so bundle exec uses Redmine's Gemfile, not /workspace/Gemfile.
# (VS Code runs postCreateCommand from workspaceFolder = /workspace)
echo "Running plugin migrations..."
cd /usr/src/redmine
bundle exec rake redmine:plugins:migrate RAILS_ENV=development

# Seed default data
echo "Seeding default data..."
bundle exec rake db:seed RAILS_ENV=development 2>&1 || echo "  Seed already applied."
cd /workspace

echo ""
echo "=== DevContainer ready ==="
echo "  Redmine: see VS Code Ports panel for the forwarded port (3000 in container)"
echo "  Credentials: see .agents/notes/login_credentials.md"
