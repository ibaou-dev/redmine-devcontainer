# Models & Migrations

## Database Migration Conventions

Redmine 6.x (Rails 7.2) uses `ActiveRecord::Migration[7.2]`:

```ruby
# db/migrate/20260101120000_create_plugin_name_things.rb
# Class name MUST be globally unique across all plugins and Redmine core.
# Prefix with plugin name to avoid conflicts.
class CreatePluginNameThings < ActiveRecord::Migration[7.2]
  def change
    create_table :plugin_name_things do |t|
      t.integer :project_id,  null: false
      t.integer :author_id,   null: false
      t.string  :name,        null: false
      t.text    :description
      t.string  :status,      default: 'open', null: false
      t.timestamps
    end

    add_index :plugin_name_things, :project_id
    add_index :plugin_name_things, [:project_id, :status]
  end
end
```

### Using t.references (from redmine_pipeline_tracker pattern)

```ruby
create_table :cicd_component_types do |t|
  t.string :name, null: false
  t.references :cicd_product_type, null: false, foreign_key: true
  t.timestamps
end
```

`t.references` creates a `_id` integer column and adds an index automatically.

**Naming rules:**
- Timestamp: `YYYYMMDDHHMMSS` — use `date +%Y%m%d%H%M%S` to generate
- Class: `CreatePluginNameThings` (not `CreateThings`)
- Table: `plugin_name_things` (not `things`)
- Adding columns: `AddFieldToPluginNameThings`
- Renaming columns: `RenameFieldInPluginNameThings`
- Use `ActiveRecord::Migration[7.2]` (matches Redmine 6.x / Rails 7)

### Real Migration Examples from redmine_pipeline_tracker

```ruby
# 20260227115754_create_cicd_builds.rb
class CreateCicdBuilds < ActiveRecord::Migration[7.2]
  def change
    create_table :cicd_builds do |t|
      t.integer :project_id
      t.integer :changeset_id
      t.string :git_hash
      t.string :branch
      t.string :status
      t.string :build_number
      t.string :build_url
    end
  end
end

# 20260227115832_create_cicd_builds_issues.rb — join table
class CreateCicdBuildsIssues < ActiveRecord::Migration[7.2]
  def change
    create_table :cicd_builds_issues do |t|
      t.integer :cicd_build_id
      t.integer :issue_id
    end
  end
end
```

## Model Conventions

```ruby
# app/models/plugin_name_thing.rb
class PluginNameThing < ActiveRecord::Base
  # Associations
  belongs_to :project
  belongs_to :author, class_name: 'User'
  belongs_to :changeset, optional: true   # optional: true for nullable belongs_to

  # Has-many
  has_many :sub_things, class_name: 'PluginNameSubThing',
           foreign_key: 'thing_id', dependent: :destroy

  # Validations
  validates :name,    presence: true
  validates :status,  presence: true
  validates :project, presence: true

  # Scopes
  scope :open,        -> { where(status: 'open') }
  scope :for_project, ->(project) { where(project: project) }

  # Redmine safe_attributes — REQUIRED for mass assignment in Redmine's update logic
  safe_attributes 'name', 'description', 'status',
    if: lambda { |_thing, user| user.allowed_to?(:manage_things, _thing.project) }

  # Callbacks
  after_create :log_creation

  private

  def log_creation
    Rails.logger.info("MyPlugin [Thing]: Created #{id} in project #{project_id}")
  end
end
```

## Many-to-Many with Issues (from redmine_pipeline_tracker)

```ruby
# Model:
class CicdBuild < ActiveRecord::Base
  has_and_belongs_to_many :issues,
    join_table:              'cicd_builds_issues',
    foreign_key:             'cicd_build_id',
    association_foreign_key: 'issue_id'
end

# Migration for the join table:
class CreateCicdBuildsIssues < ActiveRecord::Migration[7.2]
  def change
    create_table :cicd_builds_issues do |t|
      t.integer :cicd_build_id
      t.integer :issue_id
    end
    add_index :cicd_builds_issues, [:cicd_build_id, :issue_id], unique: true
  end
end
```

## Redmine acts_as_* Modules

These modules integrate your model with Redmine's core features:

### acts_as_attachable
Allows file attachments (uses Redmine's attachment system):
```ruby
acts_as_attachable
# Grants: attachments association, attachment helpers in views
# View: render partial: 'attachments/links', locals: { attachments: @thing.attachments }
```

### acts_as_searchable
Appears in Redmine's global search:
```ruby
acts_as_searchable columns: ['name', 'description'],
                   scope: lambda { |options|
                     includes(:project).where("#{Project.table_name}.status = ?", Project::STATUS_ACTIVE)
                   },
                   permission: :view_things,
                   date_column: :created_on
```

### acts_as_event
Appears in Redmine's activity stream:
```ruby
acts_as_event title: Proc.new { |o| "Thing: #{o.name}" },
              url: Proc.new { |o| { controller: 'plugin_things', action: 'show', id: o.id } },
              author: :author,
              description: :description,
              type: 'plugin-thing'
```

### acts_as_activity_provider
Aggregates events for the activity view:
```ruby
acts_as_activity_provider type: 'plugin_things',
                           permission: :view_things,
                           author_key: :author_id,
                           scope: preload(:project, :author)
```

### acts_as_watchable
Allows users to watch (subscribe to) records:
```ruby
acts_as_watchable
# Grants: watchers association, watched_by? method
# View: render partial: 'watchers/watchers', locals: { watched: @thing }
```

### acts_as_customizable
Supports Redmine custom fields for your model:
```ruby
acts_as_customizable
# Requires a custom field type registered in init.rb
```

## Adding Custom Columns to Issues

redmine_pipeline_tracker adds columns directly to the issues table:

```ruby
# db/migrate/20260314221144_add_cicd_fields_to_issues.rb
class AddCicdFieldsToIssues < ActiveRecord::Migration[7.2]
  def change
    add_column :issues, :cicd_tenant_environment_id,  :integer
    add_column :issues, :cicd_tenant_component_id,    :integer
  end
end
```

Then access via the Issue model (the patch adds the association):
```ruby
# In project_patch.rb / issue_patch.rb:
belongs_to :cicd_tenant_environment, optional: true
```

And set via controller hooks:
```ruby
issue.update_column(:cicd_tenant_environment_id, params[:issue][:cicd_tenant_environment_id])
```
