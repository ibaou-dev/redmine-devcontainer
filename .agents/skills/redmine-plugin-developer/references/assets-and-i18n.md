# Assets & Internationalization

## Propshaft Asset Pipeline (Redmine 6.x)

Redmine 6.x uses **Propshaft**, not Sprockets. This is a simpler pipeline:

- **No compilation** — files served directly as-is
- **No `@import` preprocessing** — use native CSS `@import url(...)` only
- **Auto-copy** — plugin assets are copied to `public/plugin_assets/<plugin_name>/` on startup
- **No fingerprinting** — plugin asset URLs are predictable

### Plugin Asset Directory Structure

```
plugins/plugin_name/assets/
├── javascripts/
│   └── plugin_name.js           # Main JS file
├── stylesheets/
│   └── plugin_name.css          # Main CSS file
└── images/
    └── plugin_icon.png
```

### Including Assets in Views

```erb
<%# CSS — loaded from public/plugin_assets/plugin_name/stylesheets/ %>
<%= stylesheet_link_tag 'plugin_name', plugin: 'plugin_name' %>

<%# JS — loaded from public/plugin_assets/plugin_name/javascripts/ %>
<%= javascript_include_tag 'plugin_name', plugin: 'plugin_name' %>

<%# Image %>
<%= image_tag 'plugin_icon.png', plugin: 'plugin_name' %>
```

### Loading Assets in HTML Head (via hook)

Best practice: inject assets via a ViewListener so they're only loaded when needed:

```ruby
# lib/plugin_name/hooks/view_layouts_base_html_head_hook.rb
module PluginName
  module Hooks
    class ViewLayoutsBaseHtmlHeadHook < Redmine::Hook::ViewListener
      render_on :view_layouts_base_html_head,
                partial: 'hooks/plugin_name/html_head'
    end
  end
end
```

```erb
<%# app/views/hooks/plugin_name/_html_head.html.erb %>
<%= stylesheet_link_tag 'plugin_name', plugin: 'plugin_name' %>
<%= javascript_include_tag 'plugin_name', plugin: 'plugin_name' %>
```

### CSS in Plugin Stylesheets

```css
.my-icon {
  background-image: url(../images/my_icon.png);
  /* Resolves to public/plugin_assets/plugin_name/images/my_icon.png */
}
```

## Internationalization (i18n)

### File Structure

```
config/locales/
├── en.yml         # Required: English (the fallback)
├── fr.yml         # Optional: French
└── de.yml         # Optional: German
```

### en.yml Structure

```yaml
en:
  # Labels (UI text)
  label_plugin_things: "Things"
  label_plugin_thing: "Thing"
  label_plugin_thing_new: "New Thing"

  # Status values
  label_plugin_thing_status_open: "Open"
  label_plugin_thing_status_closed: "Closed"

  # Field names (reuse Redmine's where possible — see below)
  field_plugin_thing_ref: "External Reference"   # plugin-specific field

  # Notices (flash messages)
  # Prefer reusing Redmine's built-in notices:
  #   notice_successful_create, notice_successful_update, notice_successful_delete

  # Buttons (Redmine already has common ones — see below)
  button_plugin_link_thing: "Link to Thing"

  # Column headers
  column_plugin_thing_status: "Status"

  # Permission labels (shown in role management UI)
  permission_view_things: "View things"
  permission_manage_things: "Manage things"

  # Project module name
  project_module_plugin_name: "My Plugin"

  # Settings labels
  setting_plugin_thing_api_enabled: "Enable API"
  setting_plugin_thing_tracker_ids: "Tracked issue types"
```

### Using Translations

```ruby
# In controllers and helpers
flash[:notice] = l(:notice_successful_create)

# With interpolation
l(:label_plugin_thing_count, count: @things.count)
# en.yml: label_plugin_thing_count: "%{count} things"
```

```erb
<%# In views — l() is preferred in Redmine over t() %>
<%= l(:label_plugin_things) %>
<%= l(:field_plugin_thing_ref) %>

<%# Date/time formatting — always use l() for dates %>
<%= l(@thing.created_on, format: :long) %>
```

### Built-in Keys to Reuse

Do not redefine what Redmine already provides:

```yaml
# Buttons — already defined in Redmine:
button_save, button_cancel, button_delete, button_edit, button_back,
button_create, button_update, button_add, button_new, button_view

# Field names — already defined:
field_name, field_description, field_status, field_created_on, field_updated_on,
field_author, field_project, field_assigned_to

# Notices — already defined:
notice_successful_create, notice_successful_update, notice_successful_delete

# General — already defined:
label_none, label_all, label_yes, label_no
```

### Plural Forms

```yaml
en:
  label_plugin_thing:
    one: "Thing"
    other: "%{count} Things"
```

Usage: `l(:label_plugin_thing, count: 5)` → "5 Things"

### Settings Partial

The settings partial (for Administration > Plugins > Settings) lives at:
`app/views/settings/_plugin_name_settings.html.erb`

```erb
<%# app/views/settings/_redmine_pipeline_tracker_settings.html.erb pattern %>
<p>
  <label><%= l(:setting_plugin_thing_api_enabled) %></label>
  <%= check_box_tag 'settings[api_enabled]', '1', settings['api_enabled'].to_s == '1' %>
</p>

<p>
  <label><%= l(:setting_deployment_tracker_ids) %></label>
  <%= select_tag 'settings[deployment_tracker_ids][]',
        options_from_collection_for_select(Tracker.sorted, :id, :name, settings['deployment_tracker_ids']),
        multiple: true %>
</p>
```

When rendered, the current plugin settings are available as the local `settings` hash.
Read via `Setting.plugin_plugin_name['key']` elsewhere.
