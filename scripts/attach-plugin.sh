#!/usr/bin/env bash
# scripts/attach-plugin.sh — attach ANY Redmine plugin repo into this devcontainer.
#
# The devcontainer is the stable workspace (skills + Docker + Make). Plugins are
# checked out into plugins/<name> (git-ignored) and bind-mounted into the container.
#
# Two source modes, auto-detected:
#   • Local git repo  → git worktree (shares history with the source repo; no copy)
#   • Remote git URL  → git clone
#
# Usage:
#   scripts/attach-plugin.sh <source> [name] [ref]
#     <source>  Path to a local git repo OR a remote git URL (https/ssh)
#     [name]    Target dir under plugins/ (default: derived from source basename)
#     [ref]     Branch to use.
#                 - local mode:  existing branch → checked out; else created off HEAD;
#                                default: a new branch "wt/<name>" off the source's HEAD
#                 - remote mode: branch to clone (default: remote default branch)
#
# Examples:
#   scripts/attach-plugin.sh ../redmine_git_mirror
#   scripts/attach-plugin.sh ../redmine_git_mirror redmine_git_mirror fix/4-webhook-secret
#   scripts/attach-plugin.sh https://github.com/ibaou-dev/redmine_git_mirror.git
#
# After attaching, run `make build && make migrate` (or `make attach-plugin ...`,
# which does this for you) so PluginGemfile gems are baked into the image.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SOURCE="${1:?ERROR: source required. Usage: $0 <local-path|git-url> [name] [ref]}"
NAME="${2:-}"
REF="${3:-}"

is_url() { [[ "$1" =~ ^(https?|git|ssh):// || "$1" =~ ^[^/]+@[^/]+:.+ ]]; }

# Derive a default plugin dir name from the source.
if [ -z "$NAME" ]; then
  NAME="$(basename "${SOURCE%.git}")"
fi

DEST="plugins/${NAME}"

if [ -e "$DEST" ]; then
  echo "ERROR: ${DEST} already exists. Detach first: make detach-plugin NAME=${NAME}"
  exit 1
fi

echo "Attaching plugin:"
echo "  Source: ${SOURCE}"
echo "  Name:   ${NAME}"
echo "  Dest:   ${DEST}"

if is_url "$SOURCE"; then
  echo "  Mode:   clone (remote)"
  if [ -n "$REF" ]; then
    git clone --branch "$REF" "$SOURCE" "$DEST"
  else
    git clone "$SOURCE" "$DEST"
  fi
else
  # Local path — must be a git repo; use a worktree so there is no second copy.
  SRC_ABS="$(cd "$SOURCE" && pwd)"
  if ! git -C "$SRC_ABS" rev-parse --git-dir >/dev/null 2>&1; then
    echo "ERROR: ${SRC_ABS} is not a git repository."
    exit 1
  fi
  echo "  Mode:   worktree (local: ${SRC_ABS})"

  REF="${REF:-wt/${NAME}}"
  DEST_ABS="${REPO_ROOT}/${DEST}"
  if git -C "$SRC_ABS" show-ref --verify --quiet "refs/heads/${REF}"; then
    git -C "$SRC_ABS" worktree add "$DEST_ABS" "$REF"
  else
    git -C "$SRC_ABS" worktree add -b "$REF" "$DEST_ABS"
  fi
fi

# Sanity check: a Redmine plugin must have init.rb at its root.
if [ ! -f "${DEST}/init.rb" ]; then
  echo "WARNING: ${DEST}/init.rb not found — is this a Redmine plugin?"
fi

echo ""
echo "Attached. Next:"
echo "  make build     # bake PluginGemfile gems into the image"
echo "  make migrate   # run plugin migrations"
echo "  # or just re-run: make attach-plugin SRC=${SOURCE} NAME=${NAME} REF=${REF:-}"
