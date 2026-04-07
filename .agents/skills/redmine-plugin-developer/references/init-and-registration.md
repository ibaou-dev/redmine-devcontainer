# Plugin Init & Registration

Full reference for `init.rb` — the entry point for every Redmine plugin.

## Real Example: redmine_pipeline_tracker

```ruby
# plugins/redmine_pipeline_tracker/init.rb
require 'redmine'

Redmine::Plugin.register :redmine_pipeline_tracker do
  name 'Redmine Pipeline Tracker'
  author 'Ioannis Baourdos'
  description 'Connects CI/CD builds and deployments with Redmine issues'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'

  project_module :redmine_pipeline_tracker do
    permission :view_cicd_builds,       { :cicd_issues_tab => [:builds] },       :read => true
    permission :view_cicd_deployments,  { :cicd_issues_tab => [:deployments] },  :read => true
    permission :manage_cicd_link,       { :cicd_project_settings => [:show, :update] }, :require => :member
  end

  menu :admin_menu, :redmine_pipeline_tracker,
    { controller: 'cicd_admin', action: 'index' },
    caption: 'CI/CD Registry',
    html: { class: 'icon icon-server' }

  settings default: { 'deployment_tracker_ids' => [] },
           partial: 'settings/redmine_pipeline_tracker_settings'
end

require_relative 'lib/redmine_pipeline_tracker/hooks/view_issues_show_details_bottom_hook'
require_relative 'lib/redmine_pipeline_tracker/hooks/controller_issues_hook'

require_relative 'lib/redmine_pipeline_tracker/patches/project_patch'
Project.send(:include, EurodynCicd::Patches::ProjectPatch)

Rails.application.config.to_prepare do
  Project.send(:include, EurodynCicd::Patches::ProjectPatch)
end
```

## Redmine::Plugin.register Block — All Options

```ruby
Redmine::Plugin.register :plugin_name do
  name        'Display Name'
  author      'Author Name'
  description 'One-line description'
  version     '1.0.0'
  url         'https://your-plugin-url.com'       # optional
  author_url  'https://author-url.com'            # optional

  # Version constraints
  requires_redmine version_or_higher: '5.0'
  requires_redmine version: '6.1.1'               # exact version (rare)
  requires_redmine_plugin :other_plugin, version_or_higher: '1.0'

  # Project module — wraps permissions under a toggleable project feature
  project_module :plugin_name do
    # Read-only permission (shows in "View" section of roles)
    permission :view_things,   { things: [:index, :show] },           read: true
    # Standard permission
    permission :manage_things, { things: [:new, :create, :edit, :update, :destroy] }
    # Requires project membership
    permission :link_thing,    { thing_links: [:create, :destroy] },  require: :member
    # Requires login (any logged-in user)
    permission :comment_thing, { thing_comments: [:create] },         require: :loggedin
    # Public (no login required — use sparingly)
    permission :view_public,   { public_things: [:index] },           public: true
  end

  # Admin menu item
  menu :admin_menu, :plugin_name_admin,
    { controller: 'plugin_name_admin', action: 'index' },
    caption: 'Plugin Name',
    html: { class: 'icon icon-plugin' }         # icon class from Redmine's icon set

  # Project menu item
  menu :project_menu, :plugin_things,
    { controller: 'plugin_things', action: 'index' },
    caption: :label_plugin_things,              # i18n key
    after: :issues,                             # position (after :issues tab)
    param: :project_id,                         # URL parameter for project scoping
    if: Proc.new { |p| p.module_enabled?(:plugin_name) }  # conditional display

  # Top menu (application-wide, appears in top bar)
  menu :top_menu, :plugin_name,
    { controller: 'plugin_name', action: 'index' },
    caption: :label_plugin_name,
    first: false, last: false,
    before: :my_page, after: :projects         # position relative to other items

  # Account menu (user dropdown)
  menu :account_menu, :plugin_name_account,
    { controller: 'plugin_name_account', action: 'show' },
    caption: :label_plugin_name,
    after: :my_account

  # Application settings (global, in Administration > Settings)
  settings default: {
    'enabled'          => true,
    'api_token'        => '',
    'tracker_ids'      => []
  },
  partial: 'settings/plugin_name_settings'
  # Partial location: app/views/settings/_plugin_name_settings.html.erb
end
```

## Permission Flags

| Flag | Meaning |
|------|---------|
| `read: true` | Shown in "View" section, given to all roles by default |
| `require: :member` | User must be a project member |
| `require: :loggedin` | User must be logged in |
| `require: :admin` | Only admins (use `require_admin` in controller instead) |
| `public: true` | No authentication required |

## Checking Permissions

In controllers: `authorize` macro (checks current user against `@project`).
In views: `User.current.allowed_to?(:view_things, @project)`.
In models: `project.allows_to?(:manage_things)`.

## Settings Access

```ruby
# Read a setting
value = Setting.plugin_plugin_name['api_token']

# Example from redmine_pipeline_tracker — reading an array setting:
deployment_trackers = Setting.plugin_redmine_pipeline_tracker['deployment_tracker_ids'] || []

# Write a setting (in admin controller)
Setting.plugin_plugin_name = params[:settings].to_unsafe_h
```

## Hook Loading Pattern

Hooks are loaded via `require_relative` at the top level of `init.rb` (outside the
`register` block). They self-register when their class is evaluated — no explicit
registration call is needed.

```ruby
# After the register block:
require_relative 'lib/plugin_name/hooks/view_issues_show_details_bottom_hook'
require_relative 'lib/plugin_name/hooks/controller_issues_hook'
```

## Patch Application Pattern

Patches are applied both at top level (for initial boot) and inside `to_prepare`
(for development-mode reloading). This is the pattern used by redmine_pipeline_tracker:

```ruby
require_relative 'lib/plugin_name/patches/my_model_patch'
MyModel.send(:include, PluginName::Patches::MyModelPatch)

Rails.application.config.to_prepare do
  MyModel.send(:include, PluginName::Patches::MyModelPatch)
end
```

**Never** call `send(:include, ...)` only at the top level without `to_prepare` — the patch
won't survive Rails code reloading in development mode.

## Menu Position Constants

Available after/before targets for `:project_menu`:
`:overview`, `:activity`, `:roadmap`, `:issues`, `:news`, `:documents`,
`:wiki`, `:boards`, `:files`, `:repository`, `:settings`
