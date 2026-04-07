#!/usr/bin/env bash
# scripts/scaffold-theme.sh
# Scaffold a new Redmine theme skeleton.
#
# Usage (interactive):   bash scripts/scaffold-theme.sh
# Usage (with name):     bash scripts/scaffold-theme.sh my-theme
# Usage via Makefile:    make scaffold-theme
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "==================================="
echo " Redmine Theme Scaffolder          "
echo "==================================="
echo ""

# ── Theme name ────────────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  THEME_NAME="$1"
else
  read -rp "Theme directory name (lowercase, hyphenated, e.g. my-theme): " THEME_NAME
fi

# Normalise
THEME_NAME="$(echo "$THEME_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')"

if [ -z "$THEME_NAME" ]; then
  echo "ERROR: Theme name cannot be empty."
  exit 1
fi

if [ -d "themes/$THEME_NAME" ]; then
  echo "ERROR: themes/$THEME_NAME already exists."
  exit 1
fi

# ── Options ───────────────────────────────────────────────────────────────────
read -rp "Include theme.js? (y/N): " ADD_JS
ADD_JS="${ADD_JS:-n}"

echo ""
echo "Scaffolding themes/$THEME_NAME ..."

# ── Create directories ────────────────────────────────────────────────────────
mkdir -p "themes/$THEME_NAME/stylesheets"
if [[ "$ADD_JS" =~ ^[Yy]$ ]]; then
  mkdir -p "themes/$THEME_NAME/javascripts"
fi

# ── stylesheets/application.css ───────────────────────────────────────────────
cat > "themes/$THEME_NAME/stylesheets/application.css" <<CSSEOF
/*
 * ${THEME_NAME} — Redmine Theme
 *
 * Redmine uses Propshaft for assets. This file is served directly with no
 * compilation step. Import Redmine's base stylesheet first, then override.
 *
 * To find what CSS custom properties Redmine exposes, check:
 *   .references/redmine/app/assets/stylesheets/application.css
 */
@import url("../../../stylesheets/application.css");

/* ── Theme custom properties ──────────────────────────────────────── */
:root {
  /* Override Redmine colour tokens here. Examples:
  --primary:           #3b82f6;
  --header-bg:         #1e3a5f;
  --header-text:       #ffffff;
  --sidebar-bg:        #f8fafc;
  */
}

/* ── Layout overrides ─────────────────────────────────────────────── */

/* ── Typography overrides ─────────────────────────────────────────── */

/* ── Component overrides ──────────────────────────────────────────── */
CSSEOF

# ── javascripts/theme.js (optional) ──────────────────────────────────────────
if [[ "$ADD_JS" =~ ^[Yy]$ ]]; then
  cat > "themes/$THEME_NAME/javascripts/theme.js" <<JSEOF
// ${THEME_NAME} — Redmine Theme JS
//
// Loaded after the DOM is ready. Use this for light DOM manipulation,
// e.g. adding CSS classes, toggling dark mode, injecting icons.
//
// Keep this file lean — Redmine does not provide a bundler for themes.
// Avoid jQuery unless you are certain it is available on your target pages.

document.addEventListener('DOMContentLoaded', () => {
  // Example: add a class to the body for theme-specific CSS targeting
  document.body.classList.add('theme-${THEME_NAME}');
});
JSEOF
fi

echo ""
echo "✓ Created themes/$THEME_NAME/"
echo ""
echo "Next steps:"
echo "  1. Hard-refresh your browser (Ctrl+Shift+R) to see changes"
echo "  2. Activate the theme:"
echo "     Administration > Settings > Display > Theme > ${THEME_NAME}"
echo ""
