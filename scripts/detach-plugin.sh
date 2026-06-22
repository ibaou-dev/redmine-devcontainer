#!/usr/bin/env bash
# scripts/detach-plugin.sh — remove a plugin previously attached into plugins/<name>.
#
# Handles both attach modes:
#   • worktree (local) → git worktree remove from the source repo
#   • clone (remote)   → plain directory removal
#
# Usage:
#   scripts/detach-plugin.sh <name>
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NAME="${1:?ERROR: name required. Usage: $0 <name>}"
DEST="plugins/${NAME}"
DEST_ABS="${REPO_ROOT}/${DEST}"

if [ ! -e "$DEST" ]; then
  echo "Nothing to do: ${DEST} does not exist."
  exit 0
fi

# If it's a linked worktree, .git is a file pointing at the source repo's gitdir.
if [ -f "${DEST}/.git" ]; then
  GITDIR_LINE="$(grep -m1 '^gitdir:' "${DEST}/.git" || true)"
  SRC_GITDIR="${GITDIR_LINE#gitdir: }"
  # .../<source>/.git/worktrees/<name>  →  source repo toplevel is 3 dirs up
  SRC_REPO="$(cd "$(dirname "$SRC_GITDIR")/../.." && pwd 2>/dev/null || true)"
  echo "Removing worktree ${DEST_ABS} (source: ${SRC_REPO:-unknown})"
  if [ -n "${SRC_REPO:-}" ] && git -C "$SRC_REPO" rev-parse --git-dir >/dev/null 2>&1; then
    git -C "$SRC_REPO" worktree remove --force "$DEST_ABS"
  else
    echo "  Source repo not resolvable; removing directory and pruning."
    rm -rf "$DEST_ABS"
  fi
else
  echo "Removing cloned plugin directory ${DEST_ABS}"
  rm -rf "$DEST_ABS"
fi

echo "Detached ${NAME}. (Rebuild the image with 'make build' if you change the active plugin set.)"
