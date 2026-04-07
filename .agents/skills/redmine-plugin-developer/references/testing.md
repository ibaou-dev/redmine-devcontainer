# Testing Redmine Plugins

## Test Setup

```ruby
# test/test_helper.rb
# Path is 3 levels up from plugin test/ to Redmine's test/test_helper.rb
require File.expand_path('../../../test/test_helper', __FILE__)
```

## Running Plugin Tests

```bash
# From the Redmine root directory:
bundle exec rake redmine:plugins:test NAME=plugin_name RAILS_ENV=test

# Run a single test file:
bundle exec ruby -I test plugins/plugin_name/test/functional/plugin_things_controller_test.rb

# Run with specific test file:
bundle exec rake redmine:plugins:test NAME=plugin_name TEST=test/functional/plugin_things_controller_test.rb
```

## Functional (Controller) Test Pattern

```ruby
# test/functional/plugin_things_controller_test.rb
require File.expand_path('../../test_helper', __FILE__)

class PluginThingsControllerTest < ActionDispatch::IntegrationTest
  fixtures :projects, :users, :roles, :members, :member_roles,
           :trackers, :issue_statuses, :enumerations

  def setup
    @project = Project.find(1)
    @user    = User.find(2)  # jsmith in Redmine fixtures — has member role

    # Enable the plugin module on the project
    @project.enabled_module_names = [:plugin_name]
    @project.save!

    # Grant permission
    role = Role.find(1)
    role.add_permission!(:view_things, :manage_things)
  end

  test "GET index requires login" do
    get "/projects/#{@project.identifier}/plugin_things"
    assert_redirected_to '/login?back_url=...'
  end

  test "GET index shows things" do
    log_user('jsmith', 'jsmith')
    get "/projects/#{@project.identifier}/plugin_things"
    assert_response :success
    assert_select 'h2', text: /Things/i
  end

  test "POST create creates a thing" do
    log_user('jsmith', 'jsmith')
    assert_difference 'PluginThing.count', 1 do
      post "/projects/#{@project.identifier}/plugin_things",
           params: { plugin_thing: { name: 'Test Thing', description: 'Desc' } }
    end
    assert_redirected_to project_plugin_things_path(@project)
    assert_equal 'Test Thing', PluginThing.last.name
  end
end
```

## Unit (Model) Test Pattern

```ruby
# test/unit/plugin_thing_test.rb
require File.expand_path('../../test_helper', __FILE__)

class PluginThingTest < ActiveSupport::TestCase
  fixtures :projects, :users

  def setup
    @project = Project.find(1)
    @user    = User.find(1)
  end

  test "valid thing" do
    thing = PluginThing.new(name: 'Test', project: @project, author: @user)
    assert thing.valid?
  end

  test "name is required" do
    thing = PluginThing.new(project: @project, author: @user)
    assert_not thing.valid?
    assert_includes thing.errors[:name], "can't be blank"
  end
end
```

## API Test Pattern

```ruby
test "POST create_build via API key" do
  api_key = User.find(1).api_key

  post "/cicd/builds",
       headers: { 'X-Redmine-API-Key' => api_key, 'Content-Type' => 'application/json' },
       params: {
         project_id:   'ecookbook',
         git_hash:     'abc123',
         build_number: '42',
         status:       'success'
       }.to_json
  assert_response :ok
  assert_equal 'success', JSON.parse(response.body)['status']
end
```

## Redmine Test Fixtures (Location)

Fixtures live at `.references/redmine/test/fixtures/`. Key ones:

| File | Contents |
|------|---------|
| `users.yml` | Admin (id=1), jsmith (id=2), dlopper (id=3), etc. |
| `projects.yml` | ecookbook (id=1), onlinestore (id=2) |
| `roles.yml` | Manager (id=1), Developer (id=2), Reporter (id=3) |
| `members.yml` | Who belongs to which project with which role |
| `member_roles.yml` | Links members to roles |
| `trackers.yml` | Bug (id=1), Feature (id=2), Support (id=3) |
| `issue_statuses.yml` | New (id=1), Assigned (id=2), etc. |
| `issues.yml` | Test issues |

## Useful Test Helpers

```ruby
# Log in as a user (Redmine test helper)
log_user('jsmith', 'jsmith')

# Test with custom settings
with_settings notify_events: 'all' do
  # test code
end

# Test with specific locale
with_locale 'fr' do
  # test code
end

# Assert no difference
assert_no_difference 'PluginThing.count' do
  # action that should not create
end

# Assert difference by specific amount
assert_difference 'PluginThing.count', 1 do
  # action that creates one record
end
```

## Plugin-Specific Fixture Files

Place plugin fixtures in `test/fixtures/`:

```yaml
# test/fixtures/cicd_builds.yml
one:
  id: 1
  project_id: 1
  git_hash: "abc123def456"
  branch: "main"
  status: "success"
  build_number: "42"
```

Load them in your test:

```ruby
fixtures :projects, :users, :cicd_builds
```
