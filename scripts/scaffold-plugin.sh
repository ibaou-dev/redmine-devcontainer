#!/usr/bin/env bash
# scripts/scaffold-plugin.sh
# Scaffold a new Redmine plugin skeleton.
#
# Usage (interactive):   bash scripts/scaffold-plugin.sh
# Usage (with name):     bash scripts/scaffold-plugin.sh redmine_my_plugin
# Usage via Makefile:    make scaffold-plugin
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Load REDMINE_VERSION from .env if available
[ -f .env ] && source .env
REDMINE_VERSION="${REDMINE_VERSION:-6.1.1}"

echo ""
echo "==================================="
echo " Redmine Plugin Scaffolder         "
echo "==================================="
echo ""

# ── Plugin name ───────────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  PLUGIN_NAME="$1"
else
  read -rp "Plugin name (snake_case, must start with redmine_): " PLUGIN_NAME
fi

# Validate
if [[ ! "$PLUGIN_NAME" =~ ^redmine_ ]]; then
  echo "ERROR: Plugin name must start with 'redmine_' (e.g. redmine_my_plugin)"
  exit 1
fi

if [ -d "plugins/$PLUGIN_NAME" ]; then
  echo "ERROR: plugins/$PLUGIN_NAME already exists."
  exit 1
fi

# ── Display name ──────────────────────────────────────────────────────────────
read -rp "Display name (human-readable, e.g. 'My Plugin'): " DISPLAY_NAME
DISPLAY_NAME="${DISPLAY_NAME:-$PLUGIN_NAME}"

# ── Author ────────────────────────────────────────────────────────────────────
read -rp "Author name: " AUTHOR_NAME
AUTHOR_NAME="${AUTHOR_NAME:-Your Name}"

read -rp "Author URL (optional): " AUTHOR_URL
AUTHOR_URL="${AUTHOR_URL:-https://example.com}"

# ── Description ───────────────────────────────────────────────────────────────
read -rp "Short description (one sentence): " DESCRIPTION
DESCRIPTION="${DESCRIPTION:-A Redmine plugin.}"

# ── Features ─────────────────────────────────────────────────────────────────
read -rp "Add project module? (y/N): " ADD_MODULE
ADD_MODULE="${ADD_MODULE:-n}"

read -rp "Add settings page? (y/N): " ADD_SETTINGS
ADD_SETTINGS="${ADD_SETTINGS:-n}"

read -rp "Add database migration? (y/N): " ADD_MIGRATION
ADD_MIGRATION="${ADD_MIGRATION:-n}"

echo ""
echo "Scaffolding plugins/$PLUGIN_NAME ..."

# ── Create directories ────────────────────────────────────────────────────────
mkdir -p "plugins/$PLUGIN_NAME/app/controllers"
mkdir -p "plugins/$PLUGIN_NAME/app/models"
mkdir -p "plugins/$PLUGIN_NAME/app/views"
mkdir -p "plugins/$PLUGIN_NAME/config/locales"
mkdir -p "plugins/$PLUGIN_NAME/lib/${PLUGIN_NAME}/hooks"
mkdir -p "plugins/$PLUGIN_NAME/lib/${PLUGIN_NAME}/patches"
mkdir -p "plugins/$PLUGIN_NAME/test"

if [[ "$ADD_MIGRATION" =~ ^[Yy]$ ]]; then
  mkdir -p "plugins/$PLUGIN_NAME/db/migrate"
fi

# ── init.rb ───────────────────────────────────────────────────────────────────
MODULE_BLOCK=""
if [[ "$ADD_MODULE" =~ ^[Yy]$ ]]; then
  MODULE_BLOCK="
  project_module :${PLUGIN_NAME} do
    permission :view_${PLUGIN_NAME}, {}
  end
"
fi

SETTINGS_BLOCK=""
if [[ "$ADD_SETTINGS" =~ ^[Yy]$ ]]; then
  SETTINGS_BLOCK="
  settings default: {}, partial: 'settings/${PLUGIN_NAME}'"
fi

cat > "plugins/$PLUGIN_NAME/init.rb" <<INITEOF
Redmine::Plugin.register :${PLUGIN_NAME} do
  name        '${DISPLAY_NAME}'
  author      '${AUTHOR_NAME}'
  author_url  '${AUTHOR_URL}'
  description '${DESCRIPTION}'
  version     '0.1.0'
  url         '${AUTHOR_URL}'

  requires_redmine version_or_higher: '${REDMINE_VERSION}'
${MODULE_BLOCK}${SETTINGS_BLOCK}
end
INITEOF

# ── README.rdoc ───────────────────────────────────────────────────────────────
cat > "plugins/$PLUGIN_NAME/README.rdoc" <<RDOCEOF
= ${DISPLAY_NAME}

${DESCRIPTION}

== Installation

1. Place this plugin in your Redmine \`plugins/\` directory.
2. Run \`bundle exec rake redmine:plugins:migrate RAILS_ENV=production\`.
3. Restart Redmine.

== License

This plugin is released under the GNU General Public License v2.

Copyright (C) $(date +%Y) ${AUTHOR_NAME}
RDOCEOF

# ── config/locales/en.yml ─────────────────────────────────────────────────────
cat > "plugins/$PLUGIN_NAME/config/locales/en.yml" <<LOCALEEOF
en:
  plugin_${PLUGIN_NAME}:
    name: "${DISPLAY_NAME}"
LOCALEEOF

# ── lib hook stub ─────────────────────────────────────────────────────────────
cat > "plugins/$PLUGIN_NAME/lib/${PLUGIN_NAME}/hooks/view_hooks.rb" <<HOOKEOF
module ${PLUGIN_NAME^}
  module Hooks
    class ViewHooks < Redmine::Hook::ViewListener
      # Example: render_on :view_issues_show_details_bottom, partial: '...'
    end
  end
end
HOOKEOF

# ── test/test_helper.rb ───────────────────────────────────────────────────────
cat > "plugins/$PLUGIN_NAME/test/test_helper.rb" <<TESTEOF
# Load the Redmine test helper
require File.expand_path('../../../test/test_helper', File.dirname(__FILE__) + '/../../..')
TESTEOF

# ── Optional migration ────────────────────────────────────────────────────────
if [[ "$ADD_MIGRATION" =~ ^[Yy]$ ]]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  cat > "plugins/$PLUGIN_NAME/db/migrate/${TIMESTAMP}_create_${PLUGIN_NAME}_records.rb" <<MIGEOF
class Create${PLUGIN_NAME^}Records < ActiveRecord::Migration[7.2]
  def change
    # TODO: add your table definitions here
  end
end
MIGEOF
fi

echo ""
echo "✓ Created plugins/$PLUGIN_NAME/"
echo ""
echo "Next steps:"
echo "  1. make restart              — load the plugin in Redmine"
if [[ "$ADD_MIGRATION" =~ ^[Yy]$ ]]; then
echo "  2. make migrate              — run the new migration"
fi
echo "  3. Open http://localhost:\${REDMINE_PORT:-4000}/admin/plugins"
echo "     to verify the plugin is registered"
echo ""
