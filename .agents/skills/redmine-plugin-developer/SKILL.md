---
name: redmine-plugin-developer
description: >
  Expert Redmine 6.x plugin developer. Use whenever creating, modifying, debugging, or
  reviewing any Redmine plugin code — even for small changes. Redmine's plugin system
  has non-obvious conventions that this skill prevents you from getting wrong.

  Always trigger for ANY of these: editing init.rb, Redmine::Plugin.register,
  Redmine::Hook, ViewListener, plugin database migrations, require_admin, require_login,
  accept_api_auth, acts_as_attachable/searchable/event, safe_attributes, render_on,
  Rails.application.config.to_prepare, files inside plugins/ directory, plugin routes,
  plugin locales, plugin settings, plugin permissions, plugin menu items.

  Also trigger when user asks about: how to add a tab to an issue, how to extend a
  Redmine model, how to add a project menu item, how to create an admin panel for a
  plugin, how to make a plugin API endpoint, how to test a Redmine plugin.
---

# Redmine Plugin Developer

Reference code: `.references/redmine` (full Redmine source matching `REDMINE_VERSION` in `.env`, local-only).
Active plugin: your plugin in `plugins/` (use as a living example).

---

## Plugin Directory Structure

```
plugins/<plugin_name>/
├── init.rb                      # REQUIRED: plugin registration
├── README.rdoc
├── app/
│   ├── controllers/             # ApplicationController subclasses
│   ├── helpers/                 # View helpers
│   ├── models/                  # ActiveRecord models
│   └── views/
│       ├── <controller>/        # Standard views
│       └── hooks/               # Partials rendered by hook listeners
├── assets/
│   ├── javascripts/             # Plugin JS (auto-copied to public/plugin_assets/)
│   ├── stylesheets/             # Plugin CSS
│   └── images/
├── config/
│   ├── locales/
│   │   └── en.yml               # Translations (nested under 'en:')
│   └── routes.rb                # Plugin routes
├── db/
│   └── migrate/                 # Database migrations
├── lib/
│   └── <plugin_name>/
│       ├── hooks/               # Hook listener classes
│       └── patches/             # Monkey patches for Redmine core classes
└── test/
    ├── functional/
    ├── unit/
    └── test_helper.rb
```

---

## Critical Pattern: init.rb

Every plugin starts here. Two parts are always required.

Note: hooks are loaded via `require_relative` at the
top level (outside `to_prepare`). Patches are applied both at top-level AND inside
`to_prepare` to handle both boot and development-mode reloading.

```ruby
# plugins/my_plugin/init.rb

require 'redmine'

Redmine::Plugin.register :my_plugin do
  name 'My Plugin'
  author 'Your Name'
  description 'What this plugin does'
  version '1.0.0'
  url 'https://example.com'
  author_url 'https://example.com'

  requires_redmine version_or_higher: '5.0'
  # requires_redmine_plugin :other_plugin, version_or_higher: '1.0'

  # Project module (enables the plugin per-project)
  project_module :my_plugin do
    permission :view_my_things,   { my_things: [:index, :show] },  read: true
    permission :manage_my_things, { my_things: [:new, :create, :edit, :update, :destroy] }
  end

  # Admin menu
  menu :admin_menu, :my_plugin_admin,
    { controller: 'my_plugin_admin', action: 'index' },
    caption: 'My Plugin',
    html: { class: 'icon icon-settings' }

  # Project menu
  menu :project_menu, :my_things,
    { controller: 'my_things', action: 'index' },
    caption: :label_my_things,
    after: :issues,
    param: :project_id

  # Global settings
  settings default: { 'api_enabled' => true },
           partial: 'settings/my_plugin_settings'
end

# Load hooks at top level (they self-register on load)
require_relative 'lib/my_plugin/hooks/view_hooks'
require_relative 'lib/my_plugin/hooks/controller_hooks'

# Load and apply patches — both at top-level and inside to_prepare
require_relative 'lib/my_plugin/patches/issue_patch'
MyModel.send(:include, MyPlugin::Patches::MyModelPatch)

# CRITICAL: to_prepare re-applies patches after Rails code reloading in development
Rails.application.config.to_prepare do
  require_dependency 'my_plugin/patches/issue_patch'
  MyModel.send(:include, MyPlugin::Patches::MyModelPatch)
end
```

---

## Hook System

Two types: **ViewListener** (renders partials) and **Listener** (executes code).

Each hook is typically in its own file named after the hook:

```ruby
# lib/my_plugin/hooks/view_issues_show_details_bottom_hook.rb
module MyPlugin
  module Hooks
    class ViewIssuesShowDetailsBottomHook < Redmine::Hook::ViewListener
      render_on :view_issues_show_details_bottom,
                partial: 'hooks/my_plugin/view_issues_show_details_bottom'
      # Partial: app/views/hooks/my_plugin/_view_issues_show_details_bottom.html.erb
    end
  end
end
```

Hook partial for `view_issues_form_details_bottom` goes in:
`app/views/hooks/my_plugin/_view_issues_form_details_bottom.html.erb`

Controller hooks use `Redmine::Hook::ViewListener` as well (despite the name) — example
of `controller_issues_new_after_save` and `controller_issues_edit_after_save`:

```ruby
module MyPlugin
  module Hooks
    class ControllerIssuesHook < Redmine::Hook::ViewListener
      def controller_issues_new_after_save(context = {})
        issue  = context[:issue]
        params = context[:params]
        # act on the issue after it is saved
      end

      def controller_issues_edit_after_save(context = {})
        issue  = context[:issue]
        params = context[:params]
      end
    end
  end
end
```

**Finding available hooks:** Search `.references/redmine/app/views/**/*.erb` for `call_hook`.
Common view hooks:
- `view_issues_show_details_bottom` — issue detail page, bottom of details. Locals: `issue`
- `view_issues_form_details_bottom` — issue form, bottom of form. Locals: `issue`, `form`
- `view_issues_form_details_top` — issue form, top. Locals: `issue`, `form`
- `view_issues_new_top` — new issue page top. Locals: `issue`
- `view_issues_index_bottom` — issue list, bottom. Locals: `issues`, `project`, `query`
- `view_issues_bulk_edit_details_bottom` — bulk edit form. Locals: `issues`
- `view_issues_edit_notes_bottom` — edit notes form. Locals: `issue`, `notes`, `form`
- `view_issues_context_menu_start` / `view_issues_context_menu_end` — context menu
- `view_issues_history_journal_bottom` — history tab, per journal. Locals: `journal`
- `view_layouts_base_html_head` — `<head>` tag (for custom CSS/JS). No locals.
- `view_layouts_base_body_top` — top of `<body>`. No locals.
- `view_layouts_base_body_bottom` — bottom of `<body>`. No locals.
- `view_layouts_base_content` — main content area. No locals.
- `view_projects_show_left` — project overview, left column. Locals: `project`
- `view_projects_show_right` — project overview, right column. Locals: `project`
- `view_projects_show_sidebar_bottom` — project overview sidebar. Locals: `project`
- `view_projects_form` — project form. Locals: `project`, `form`
- `view_projects_sidebar_queries_bottom` — project sidebar
- `view_projects_roadmap_version_bottom` — roadmap, per version. Locals: `version`
- `view_versions_show_bottom` — version detail bottom. Locals: `version`
- `view_repositories_show_contextual` — repository views. Locals: `repository`, `project`
- `view_my_account` — My Account form. Locals: `user`, `form`
- `view_my_account_preferences` — My Account preferences section. Locals: `user`, `form`
- `view_my_page_splitcontent` — My Page split content. Locals: `user`
- `view_account_login_top` / `view_account_login_bottom` — login page
- `view_welcome_index_left` / `view_welcome_index_right` — welcome page
- `view_timelog_edit_form_bottom` — time entry form. Locals: `time_entry`, `form`
- `view_time_entries_bulk_edit_details_bottom` — time entries bulk edit
- `view_calendars_show_bottom` — calendar view. Locals: `year`, `month`, `project`, `query`
- `view_wiki_show_sidebar_bottom` — wiki sidebar. Locals: `wiki`, `page`
- `view_users_form` — user form. Locals: `user`, `form`
- `view_settings_general_form` — global settings form. No locals.
- `view_search_index_options_content_bottom` — search options

See `references/hooks-and-patches.md` for full patterns and monkey patching.

---

## Database Migrations

```ruby
# db/migrate/20260101120000_create_my_plugin_things.rb
# Use ActiveRecord::Migration[7.2] to match Redmine 6.x
class CreateMyPluginThings < ActiveRecord::Migration[7.2]
  def change
    create_table :my_plugin_things do |t|
      t.integer :project_id, null: false
      t.string  :name, null: false
      t.text    :description
      t.timestamps
    end
    add_index :my_plugin_things, :project_id
  end
end
```

**Naming rules:**
- File: `YYYYMMDDHHMMSS_verb_noun.rb`
- Class name must be **globally unique** across ALL plugins and Redmine core
- Prefix class names with your plugin: `CreateMyPluginThings`, not `CreateThings`
- Use `ActiveRecord::Migration[7.2]` (not 6.1) — matches what Redmine 6.x uses

---

## Reference Files

For detailed patterns, read these as needed:

| Topic | File |
|-------|------|
| Full init.rb, permissions, menus, settings | `references/init-and-registration.md` |
| Hook system, monkey patching | `references/hooks-and-patches.md` |
| Models, migrations, acts_as_* | `references/models-and-migrations.md` |
| Controllers, auth, views | `references/controllers-and-views.md` |
| Testing with Redmine fixtures | `references/testing.md` |
| Assets (Propshaft), i18n | `references/assets-and-i18n.md` |

---

## Scaffolding a New Plugin

When a developer asks to create or scaffold a new plugin, follow this workflow:

### Required Information (prompt if not provided)

1. **Plugin name** — snake_case, must start with `redmine_` (e.g. `redmine_my_feature`)
2. **Display name** — human-readable (e.g. "My Feature")
3. **Author** — name and URL
4. **Description** — one sentence
5. **Minimum Redmine version** — default to `REDMINE_VERSION` from `.env`
6. **Features needed** (yes/no for each):
   - Project module with permissions?
   - Admin/settings page?
   - Database model with migration?
   - Project menu item?
   - Admin menu item?
   - Custom routes/controllers?

### Generated Structure

```
plugins/<plugin_name>/
├── init.rb                          # Plugin registration (Redmine::Plugin.register)
├── README.rdoc                      # Plugin documentation
├── app/
│   ├── controllers/                 # Controllers (if requested)
│   ├── models/                      # ActiveRecord models (if requested)
│   └── views/                       # ERB templates (if requested)
├── config/
│   ├── locales/
│   │   └── en.yml                   # English translations
│   └── routes.rb                    # Routes (if controllers requested)
├── db/
│   └── migrate/                     # Migrations (if model requested)
├── lib/
│   └── <plugin_name>/
│       ├── hooks/
│       │   └── view_hooks.rb        # ViewListener stub
│       └── patches/                 # Module patches stub
└── test/
    └── test_helper.rb               # Test setup
```

### init.rb Template

```ruby
Redmine::Plugin.register :<plugin_name> do
  name        '<Display Name>'
  author      '<Author>'
  author_url  '<URL>'
  description '<Description>'
  version     '0.1.0'

  requires_redmine version_or_higher: '<REDMINE_VERSION>'

  # Project module (if requested):
  project_module :<plugin_name> do
    permission :view_<plugin_name>, { <controller>: [:index, :show] }
  end

  # Settings (if requested):
  settings default: {}, partial: 'settings/<plugin_name>'

  # Menus (examples):
  # menu :project_menu, :<plugin_name>, { controller: '...', action: 'index' },
  #       caption: '<Display Name>', after: :activity, param: :project_id
  # menu :admin_menu, :<plugin_name>_admin, { controller: '...', action: 'index' },
  #       caption: '<Display Name>'
end
```

### Post-Scaffold Steps

After generating the files, always tell the developer:
1. `make restart` — to load the new plugin
2. `make migrate` — if migrations were created
3. Visit `http://localhost:${REDMINE_PORT:-4000}/admin/plugins` to verify registration

### Quick Scaffold

For non-interactive scaffolding, the shell script is available:
```bash
bash scripts/scaffold-plugin.sh redmine_my_plugin
# or interactively:
make scaffold-plugin
```
