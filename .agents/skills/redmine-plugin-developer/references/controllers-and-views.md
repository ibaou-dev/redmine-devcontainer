# Controllers & Views

## Controller Authentication Patterns

```ruby
class PluginThingsController < ApplicationController
  # Authenticate and load project before any action
  before_action :find_project_by_project_id  # sets @project from params[:project_id]
  before_action :authorize                    # checks permission against @project

  # For admin-only controllers (no project context)
  before_action :require_admin

  def index
    @things = @project.plugin_things.open
    # renders app/views/plugin_things/index.html.erb automatically
  end

  def show
    @thing = @project.plugin_things.find(params[:id])
  end

  def new
    @thing = PluginThing.new(project: @project, author: User.current)
  end

  def create
    @thing = PluginThing.new(thing_params.merge(project: @project, author: User.current))
    if @thing.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to project_plugin_things_path(@project)
    else
      render :new
    end
  end

  private

  def thing_params
    params.require(:plugin_thing).permit(:name, :description, :status)
  end
end
```

## Permission Checking

```ruby
# In controller (before_action :authorize handles this automatically when @project is set)

# Manual check in controller
unless User.current.allowed_to?(:manage_things, @project)
  deny_access
end

# In views
<% if User.current.allowed_to?(:manage_things, @project) %>
  <%= link_to 'Edit', edit_project_thing_path(@project, @thing) %>
<% end %>

# Global permission (not project-scoped)
unless User.current.allowed_to_globally?(:manage_things, {})
  deny_access
end
```

## API Controller Pattern

Real example from `plugins/redmine_pipeline_tracker/app/controllers/cicd_api_controller.rb`:

```ruby
class CicdApiController < ::ApplicationController
  skip_before_action :verify_authenticity_token
  accept_api_auth :create_build, :create_deployment

  def create_build
    # Project lookup by id or identifier:
    project = begin
      Project.find(params[:project_id])
    rescue ActiveRecord::RecordNotFound
      Project.find_by_identifier(params[:project_id])
    end

    if project.nil?
      render json: { error: 'Project not found' }, status: :not_found
      return
    end

    build = MyModel.find_or_initialize_by(
      project_id: project.id,
      build_number: params[:build_number]
    )
    build.assign_attributes(...)
    build.touch if !build.new_record?   # Force updated_at to refresh on upsert

    if build.save
      render json: { id: build.id, status: 'success' }, status: :ok
    else
      render json: { errors: build.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
```

**API authentication:** The caller sends `X-Redmine-API-Key: <key>` header or `?key=<key>` param.
`accept_api_auth` enables this. `User.current` is set to the API key owner.

**Upsert pattern:** `find_or_initialize_by` + `save` is the preferred idempotent pattern —
allows re-POSTing the same data safely (CI/CD pipelines often retry).

## Admin Controllers

Real example: `plugins/redmine_pipeline_tracker/app/controllers/cicd_admin_controller.rb` pattern:

```ruby
class PluginNameAdminController < ApplicationController
  layout 'admin'
  before_action :require_admin

  def index
    # Main admin dashboard
  end

  def settings
    if request.post?
      Setting.plugin_plugin_name = params[:settings].to_unsafe_h
      flash[:notice] = l(:notice_successful_update)
      redirect_to plugin_name_admin_path
    end
  end
end
```

## Project Settings Controller

Real example from `plugins/redmine_pipeline_tracker/app/controllers/cicd_project_settings_controller.rb`:

```ruby
class CicdProjectSettingsController < ApplicationController
  before_action :find_project_by_project_id
  before_action :authorize

  def show
    @link = CicdProjectTopologyLink.find_or_initialize_by(project_id: @project.id)
    # ... load data for view
  end

  def update
    # Update records
    CicdProjectComponent.where(project_id: @project.id).delete_all
    if params[:cicd_tenant_component_ids].present?
      params[:cicd_tenant_component_ids].each do |comp_id|
        CicdProjectComponent.create(project_id: @project.id, cicd_tenant_component_id: comp_id)
      end
    end

    flash[:notice] = l(:notice_successful_update)
    # Redirect back to project settings with a specific tab:
    redirect_to settings_project_path(@project, tab: 'cicd_link')
  end
end
```

The `tab:` parameter matches the tab name registered via `ProjectsHelper` patch.

## Issues Tab Controller

Pattern for adding custom tabs to issues (redmine_pipeline_tracker uses JS tabs, loaded via AJAX):

```ruby
class CicdIssuesTabController < ApplicationController
  before_action :find_issue
  before_action :authorize

  def builds
    @builds = @issue.cicd_builds.order(created_at: :desc)
    render layout: false  # for AJAX tab content
  end

  private

  def find_issue
    @issue = Issue.find(params[:id])
    @project = @issue.project
  end
end
```

## CRUD Controllers (Admin Registry)

Pattern used by redmine_pipeline_tracker for admin registry entities:

```ruby
class CicdProductTypesController < ApplicationController
  before_action :require_admin
  before_action :set_product_type, only: [:show, :edit, :update, :destroy, :confirm_destroy]

  def index
    @product_types = CicdProductType.order(:name)
  end

  def new
    @product_type = CicdProductType.new
  end

  def create
    @product_type = CicdProductType.new(product_type_params)
    if @product_type.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to cicd_product_types_path
    else
      render :new
    end
  end

  def edit; end

  def update
    if @product_type.update(product_type_params)
      flash[:notice] = l(:notice_successful_update)
      redirect_to cicd_product_types_path
    else
      render :edit
    end
  end

  def confirm_destroy; end

  def destroy
    @product_type.destroy
    flash[:notice] = l(:notice_successful_delete)
    redirect_to cicd_product_types_path
  end

  private

  def set_product_type
    @product_type = CicdProductType.find(params[:id])
  end

  def product_type_params
    params.require(:cicd_product_type).permit(:name)
  end
end
```

## View Patterns

### Hook Partial Template

```erb
<%# app/views/hooks/plugin_name/_view_issues_show_details_bottom.html.erb %>
<%# Context: 'issue' is available (from call_hook(:view_issues_show_details_bottom, issue: @issue)) %>
<% if issue.respond_to?(:plugin_things) && issue.plugin_things.any? %>
  <div id="plugin-things">
    <h3><%= l(:label_plugin_things) %></h3>
    <%= render partial: 'plugin_things/thing_list', locals: { things: issue.plugin_things } %>
  </div>
<% end %>
```

### Layout Helpers Available in Plugin Views

```erb
<%# Page title %>
<% html_title l(:label_plugin_things) %>

<%# Back link %>
<p><%= link_to l(:button_back), project_plugin_things_path(@project) %></p>

<%# Standard button bar %>
<div class="contextual">
  <%= link_to l(:button_new), new_project_plugin_thing_path(@project), class: 'icon icon-add' %>
</div>

<%# Pagination %>
<%= pagination_links_full @thing_pages, @thing_count %>

<%# Form submit %>
<%= submit_tag l(:button_save) %>
<%= link_to l(:button_cancel), project_plugin_things_path(@project) %>

<%# Permission check %>
<% if User.current.allowed_to?(:manage_things, @project) %>
  <%# ... %>
<% end %>
```

## Routes

Real example from `plugins/redmine_pipeline_tracker/config/routes.rb`:

```ruby
# config/routes.rb
RedmineApp::Application.routes.draw do
  # Note: redmine_pipeline_tracker routes are NOT nested inside a scope —
  # they are flat at the application root level.

  # API endpoints (POST only, no project scoping in URL)
  post 'cicd/builds',      to: 'cicd_api#create_build'
  post 'cicd/deployments', to: 'cicd_api#create_deployment'

  # Custom issue tab routes (GET with issue id)
  get 'issues/:id/cicd_builds',      to: 'cicd_issues_tab#builds',      as: 'plugin_cicd_builds_tab'
  get 'issues/:id/cicd_deployments', to: 'cicd_issues_tab#deployments', as: 'plugin_cicd_deployments_tab'

  # Admin routes (flat)
  get 'cicd_admin',                   to: 'cicd_admin#index'
  get 'cicd_admin/master_definitions', to: 'cicd_admin#master_definitions', as: 'cicd_admin_master_definitions'

  # CRUD resources with confirm_destroy action
  resources :cicd_product_types do
    get :confirm_destroy, on: :member
  end

  # Project settings (manual routes, not nested resources)
  get  'projects/:project_id/cicd_project_settings',        to: 'cicd_project_settings#show'
  post 'projects/:project_id/cicd_project_settings/update', to: 'cicd_project_settings#update'
end
```

Key patterns:
- Plugin routes file uses `RedmineApp::Application.routes.draw do ... end`
- `confirm_destroy` is a `get` on member — shows a confirmation page before DELETE
- Project settings use manual routes (`get`/`post`) rather than nested `resource`
- API routes are flat (project identified by param, not URL nesting)
