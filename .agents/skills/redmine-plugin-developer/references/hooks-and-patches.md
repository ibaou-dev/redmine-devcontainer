# Hooks & Monkey Patches

## Hook System Overview

Redmine's hook system has two base classes:

| Class | Use | Method |
|-------|-----|--------|
| `Redmine::Hook::ViewListener` | Render HTML at view hook points | `render_on` |
| `Redmine::Hook::ViewListener` | Execute code at hook points (controller hooks) | Method named after hook |

> Note: In redmine_pipeline_tracker, **both** view and controller hooks use `Redmine::Hook::ViewListener`.
> The controller hooks simply define instance methods named after the hook.

## ViewListener Pattern

Each hook is placed in its own file named after the hook — the redmine_pipeline_tracker convention:

```ruby
# lib/plugin_name/hooks/view_issues_show_details_bottom_hook.rb
module PluginName
  module Hooks
    class ViewIssuesShowDetailsBottomHook < Redmine::Hook::ViewListener
      render_on :view_issues_show_details_bottom,
                partial: 'hooks/plugin_name/view_issues_show_details_bottom'
      # Partial: app/views/hooks/plugin_name/_view_issues_show_details_bottom.html.erb
    end
  end
end
```

```ruby
# lib/plugin_name/hooks/view_issues_form_details_bottom_hook.rb
module PluginName
  module Hooks
    class ViewIssuesFormDetailsBottomHook < Redmine::Hook::ViewListener
      render_on :view_issues_form_details_bottom,
                partial: 'hooks/plugin_name/view_issues_form_details_bottom'
      # Partial: app/views/hooks/plugin_name/_view_issues_form_details_bottom.html.erb
    end
  end
end
```

## Controller Hook Pattern

Controller hooks also use `Redmine::Hook::ViewListener`. Define methods named after the hook:

```ruby
# lib/plugin_name/hooks/controller_issues_hook.rb
# (Real example from plugins/redmine_pipeline_tracker/lib/redmine_pipeline_tracker/hooks/controller_issues_hook.rb)
module PluginName
  module Hooks
    class ControllerIssuesHook < Redmine::Hook::ViewListener
      def controller_issues_new_after_save(context = {})
        issue  = context[:issue]
        params = context[:params]
        # Act on issue after creation
      end

      def controller_issues_edit_after_save(context = {})
        issue   = context[:issue]
        params  = context[:params]
        journal = context[:journal]
        # Act on issue after edit
      end
    end
  end
end
```

Note: redmine_pipeline_tracker uses `_after_save` variants (not `_before_save`). Use `_before_save`
when you need to modify the issue before it is persisted.

## Hook Registration in init.rb

```ruby
# After the register block in init.rb:
require_relative 'lib/plugin_name/hooks/view_issues_show_details_bottom_hook'
require_relative 'lib/plugin_name/hooks/view_issues_form_details_bottom_hook'
require_relative 'lib/plugin_name/hooks/controller_issues_hook'
# Hooks self-register when their class is loaded — no explicit call needed.
```

## Complete Hook Reference (from .references/redmine/app/views)

**Issue hooks:**
- `view_issues_show_details_bottom` — issue detail, below details block. Locals: `issue`
- `view_issues_show_description_bottom` — below description. Locals: `issue`
- `view_issues_form_details_top` — issue form, top. Locals: `issue`, `form`
- `view_issues_form_details_bottom` — issue form, below custom fields. Locals: `issue`, `form`
- `view_issues_new_top` — new issue page top. Locals: `issue`
- `view_issues_edit_notes_bottom` — edit notes form. Locals: `issue`, `notes`, `form`
- `view_issues_index_bottom` — issue list, bottom. Locals: `issues`, `project`, `query`
- `view_issues_bulk_edit_details_bottom` — bulk edit form. Locals: `issues`
- `view_issues_context_menu_start` — context menu start. Locals: `issues`, `can`, `back`
- `view_issues_context_menu_end` — context menu end. Locals: `issues`, `can`, `back`
- `view_issues_history_journal_bottom` — history tab, per journal. Locals: `journal`
- `view_issues_history_changeset_bottom` — history tab, per changeset. Locals: `changeset`
- `view_issues_history_time_entry_bottom` — history tab, per time entry. Locals: `time_entry`
- `view_issues_sidebar_issues_bottom` — issue sidebar
- `view_issues_sidebar_planning_bottom` — issue sidebar
- `view_issues_sidebar_queries_bottom` — issue sidebar

**Layout hooks:**
- `view_layouts_base_html_head` — inside `<head>` (for stylesheets/scripts). No locals.
- `view_layouts_base_body_top` — top of `<body>`. No locals.
- `view_layouts_base_body_bottom` — bottom of `<body>`. No locals.
- `view_layouts_base_content` — main content area. No locals.

**Project hooks:**
- `view_projects_show_left` — project overview, left column. Locals: `project`
- `view_projects_show_right` — project overview, right column. Locals: `project`
- `view_projects_show_sidebar_bottom` — project overview sidebar. Locals: `project`
- `view_projects_form` — project form (new/edit). Locals: `project`, `form`
- `view_projects_sidebar_queries_bottom` — project sidebar
- `view_projects_roadmap_version_bottom` — roadmap per version. Locals: `version`
- `view_projects_copy_only_items` — project copy form. Locals: `project`, `f`
- `view_projects_settings_members_table_header` — members settings. Locals: `project`
- `view_projects_settings_members_table_row` — members settings row. Locals: `project`, `member`

**Version/roadmap hooks:**
- `view_versions_show_contextual` — version show page. Locals: `version`, `project`
- `view_versions_show_bottom` — version detail bottom. Locals: `version`

**Repository hooks:**
- `view_repositories_show_contextual` — repository views. Locals: `repository`, `project`

**User/account hooks:**
- `view_my_account_contextual` — My Account page header. Locals: `user`
- `view_my_account` — My Account form body. Locals: `user`, `form`
- `view_my_account_preferences` — My Account preferences section. Locals: `user`, `form`
- `view_my_page_contextual` — My Page header. Locals: `user`
- `view_my_page_splitcontent` — My Page content. Locals: `user`
- `view_account_login_top` — login page top. No locals.
- `view_account_login_bottom` — login page bottom. No locals.
- `view_account_left_bottom` — user profile left. Locals: `user`
- `view_account_right_bottom` — user profile right. Locals: `user`
- `view_users_form` — user form. Locals: `user`, `form`
- `view_users_form_preferences` — user form preferences. Locals: `user`, `form`
- `view_users_sidebar_queries_bottom` — users admin sidebar

**Time log hooks:**
- `view_timelog_edit_form_bottom` — time entry form. Locals: `time_entry`, `form`
- `view_time_entries_bulk_edit_details_bottom` — bulk edit. Locals: `time_entries`
- `view_time_entries_context_menu_start` / `_end` — context menu. Locals: `time_entries`, `can`, `back`

**Other hooks:**
- `view_calendars_show_bottom` — calendar. Locals: `year`, `month`, `project`, `query`
- `view_wiki_show_sidebar_bottom` — wiki sidebar. Locals: `wiki`, `page`
- `view_search_index_options_content_bottom` — search options
- `view_welcome_index_left` / `view_welcome_index_right` — welcome page
- `view_reports_issue_report_split_content_left` / `_right` — issue report. Locals: `project`
- `view_settings_general_form` — global settings form. No locals.
- `view_admin_projects_sidebar_queries_bottom` — admin projects sidebar
- `view_custom_fields_form_upper_box` — custom field form. Locals: `custom_field`, `form`
- `view_journals_notes_form_after_notes` — journal notes form. Locals: `journal`
- `view_journals_update_js_bottom` — journal update JS. Locals: `journal`
- `view_issue_statuses_form` — issue status form. Locals: `issue_status`

**Common controller hooks:**
- `controller_issues_new_before_save` — before new issue save. Locals: `issue`, `params`
- `controller_issues_new_after_save` — after new issue save. Locals: `issue`, `params`
- `controller_issues_edit_before_save` — before issue edit save. Locals: `issue`, `journal`, `params`
- `controller_issues_edit_after_save` — after issue edit save. Locals: `issue`, `journal`, `params`
- `controller_issues_bulk_edit_before_save` — bulk edit. Locals: `issue`, `params`

## Monkey Patching with Module Mixins

Standard Redmine pattern (from `plugins/redmine_pipeline_tracker/lib/redmine_pipeline_tracker/patches/project_patch.rb`):

```ruby
# lib/plugin_name/patches/project_patch.rb
module PluginName
  module Patches
    module ProjectPatch
      def self.included(base)
        base.class_eval do
          # Add associations
          has_one  :plugin_topology_link, class_name: 'PluginTopologyLink', dependent: :destroy
          has_many :plugin_components,    class_name: 'PluginComponent',    dependent: :destroy
          has_many :tenant_components, through: :plugin_components, source: :tenant_component

          # Add callbacks
          after_create :create_default_thing

          # Include instance methods
          include InstanceMethods
        end
      end

      module InstanceMethods
        def create_default_thing
          # ...
        end
      end
    end
  end
end
```

## Why Both Top-Level AND to_prepare?

redmine_pipeline_tracker applies patches in **both** places:

```ruby
# Top-level (runs once at boot — needed for production and test)
Project.send(:include, EurodynCicd::Patches::ProjectPatch)

# to_prepare (runs after each reload — needed for development)
Rails.application.config.to_prepare do
  Project.send(:include, EurodynCicd::Patches::ProjectPatch)
end
```

In development mode, Rails reloads application code on each request. `to_prepare` re-applies
the patch after every reload. The top-level call handles initial boot and production/test
environments where reloading doesn't happen.

## Using `prepend` Instead of `include`

Use `prepend` when you need to wrap (override) existing methods:

```ruby
module PluginName
  module Patches
    module IssuePatch
      def self.included(base)
        base.prepend(InstanceMethods)
      end

      module InstanceMethods
        def editable?(user = User.current)
          # Call original method with super
          super && my_plugin_condition?
        end
      end
    end
  end
end
```

`prepend` inserts the module BEFORE the class in the method lookup chain, allowing `super`
to call the original. `include` inserts AFTER and cannot override existing methods.

## Patching Helpers

Helper patches use `include` directly:

```ruby
# lib/plugin_name/patches/projects_helper_patch.rb
module PluginName
  module Patches
    module ProjectsHelperPatch
      def project_settings_tabs
        tabs = super
        tabs << { name: 'plugin_tab', action: :manage_plugin, partial: 'plugin/settings_tab', label: :label_plugin_tab }
        tabs
      end
    end
  end
end

# In init.rb:
require_relative 'lib/plugin_name/patches/projects_helper_patch'
ProjectsHelper.send(:include, PluginName::Patches::ProjectsHelperPatch)

Rails.application.config.to_prepare do
  ProjectsHelper.send(:include, PluginName::Patches::ProjectsHelperPatch)
end
```
