#!/usr/bin/env bash
# scripts/init-references.sh
# Initializes .references/redmine with the Redmine source at the version specified
# in REDMINE_VERSION (from .env, default: 6.1.1).
#
# This directory is git-ignored (local-only). It provides a read-only reference
# for IDE navigation, agent skills, and understanding Redmine internals.
#
# Run via: make references
# Or automatically during: make setup
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Load .env if present
set -a
[ -f .env ] && source .env
set +a

REDMINE_VERSION="${REDMINE_VERSION:-6.1.1}"
REFERENCES_DIR=".references/redmine"

if [ -d "$REFERENCES_DIR/.git" ]; then
  echo "Reference already initialized at $REFERENCES_DIR (Redmine ${REDMINE_VERSION})."
  echo "To re-initialize: rm -rf $REFERENCES_DIR && make references"
  exit 0
fi

echo "Cloning Redmine ${REDMINE_VERSION} into ${REFERENCES_DIR}..."
mkdir -p .references
git clone \
  --depth=1 \
  --branch "${REDMINE_VERSION}" \
  https://github.com/redmine/redmine.git \
  "$REFERENCES_DIR"

echo "Done. Redmine ${REDMINE_VERSION} reference available at ${REFERENCES_DIR}"
echo "(git-ignored — local only, not committed)"
