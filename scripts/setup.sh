#!/usr/bin/env bash
# scripts/setup.sh
# Full one-command developer onboarding. Run once after cloning.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_LOCAL="docker compose -f docker-compose.yml -f docker-compose.local.yml"

echo "========================================"
echo " Redmine Development Environment Setup  "
echo "========================================"

# ── 1. Check dependencies ────────────────────────────────────────────────────
echo ""
echo "Checking dependencies..."
MISSING=()
for cmd in docker git make node npx; do
  if command -v "$cmd" &>/dev/null; then
    echo "  [ok] $cmd"
  else
    echo "  [missing] $cmd"
    MISSING+=("$cmd")
  fi
done

if ! docker compose version &>/dev/null; then
  echo "  [missing] docker compose v2 (docker compose subcommand)"
  MISSING+=("docker-compose-v2")
else
  echo "  [ok] docker compose v2"
fi

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: Missing required tools: ${MISSING[*]}"
  echo "Please install them and re-run this script."
  exit 1
fi

# ── 2. Bootstrap .env ────────────────────────────────────────────────────────
echo ""
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
  echo "  → Review .env and adjust COMPOSE_PROJECT_NAME and ports if needed."
else
  echo ".env already exists — skipping (delete it to reset)"
fi

# Load .env for use in this script
set -a
# shellcheck disable=SC1091
[ -f .env ] && source .env
set +a

# ── 3. Initialize .references ────────────────────────────────────────────────
echo ""
echo "Initializing Redmine source reference..."
bash scripts/init-references.sh || echo "  Skipped (failed or already initialized)"

# ── 4. Remove legacy tmp/redmine-source ─────────────────────────────────────
if [ -d tmp/redmine-source ]; then
  echo ""
  echo "Removing legacy tmp/redmine-source (superseded by .references/redmine)..."
  rm -rf tmp/redmine-source
  echo "  Done."
fi

# ── 5. Start services ────────────────────────────────────────────────────────
echo ""
echo "Starting services (local mode, no Traefik required)..."
$COMPOSE_LOCAL up -d --build

# ── 6. Wait for Redmine to be healthy ────────────────────────────────────────
echo ""
bash scripts/wait-healthy.sh redmine "${REDMINE_PORT:-4000}"

# ── 7. Run migrations ────────────────────────────────────────────────────────
echo ""
echo "Running database migrations..."
$COMPOSE_LOCAL exec -T redmine bundle exec rake db:migrate RAILS_ENV=development
$COMPOSE_LOCAL exec -T redmine bundle exec rake redmine:plugins:migrate RAILS_ENV=development

# ── 8. Seed default data ─────────────────────────────────────────────────────
echo ""
echo "Seeding default data..."
$COMPOSE_LOCAL exec -T redmine bundle exec rake db:seed RAILS_ENV=development 2>&1 || \
  echo "  Seed already applied or skipped."

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Setup complete!                        "
echo "========================================"
echo ""
echo "  Redmine: http://localhost:${REDMINE_PORT:-4000}"
echo "  Credentials: see .agents/notes/login_credentials.md"
echo ""
echo "  make help    — show all available commands"
echo "  make shell   — open a shell in the Redmine container"
echo "  make migrate — run migrations after plugin changes"
echo ""
