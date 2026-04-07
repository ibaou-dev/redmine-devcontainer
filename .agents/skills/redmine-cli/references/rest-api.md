# Redmine REST API (quick reference)

This skill uses Redmine's built-in REST API.

## Auth

- Preferred: `X-Redmine-API-Key: <key>` header (used by `scripts/redmine_cli.py`)
- The REST API may need to be enabled in Redmine admin settings (varies by instance/config).

## Base URL and paths

- Base URL comes from `~/.red/config.json` key `server` (Redmine root), e.g. `https://redmine.example.com`
- Endpoints are typically `.../<resource>.json`

## Endpoints used by `scripts/redmine_cli.py`

### Projects

- `GET /projects.json?limit=25&offset=0&sort=name`
  - optional filter: `name=~<query>`

### Issues

- `GET /issues.json?...` (filters)
  - `project_id`: numeric id (taken from config `project-id` unless `--all`)
  - `assigned_to_id`: supports `me` for "my issues"
  - `subject=~<query>`: subject substring query (URL-encoded)
  - `fixed_version_id`: from `--target_id`
  - `status_id`: from `--status_id`
  - `sort`: e.g. `priority:desc` (default)
  - `limit`, `offset`
- `POST /issues.json` (create a new issue)
- `GET /issues/:id.json` (optional: `include=journals`)
- `PUT /issues/:id.json` (edit issue fields, add journal note)

### Issue relations

- `GET /issues/:id/relations.json` (list relations of an issue)
- `POST /issues/:id/relations.json` (add a relation)
- `DELETE /relations/:id.json` (remove a relation)
- Relation types: `relates`, `duplicates`, `duplicated`, `blocks`, `blocked`, `precedes`, `follows`, `copied_to`, `copied_from`

### Issue metadata (for `issue meta`)

- `GET /trackers.json` (list trackers)
- `GET /issue_statuses.json` (list statuses)
- `GET /enumerations/issue_priorities.json` (list priorities)

### Journals (comments)

- `PUT /journals/:id.json` (update an existing journal note)
  - Note: some Redmine instances return `404` for `GET /journals/:id.json` but still support `PUT`.
  - Redmine may not support `DELETE /journals/:id.json`; this skill "removes" a comment by setting `notes` to an empty string.

### Users

- `GET /users/current.json`

## Payload shapes (examples)

### Create issue

`POST /issues.json`

```json
{
  "issue": {
    "project_id": 1,
    "subject": "New feature",
    "description": "Optional description",
    "tracker_id": 2,
    "status_id": 1,
    "priority_id": 3,
    "assigned_to_id": 5,
    "fixed_version_id": 4,
    "parent_issue_id": 123
  }
}
```

Only `project_id` and `subject` are required. All other fields are optional.
The CLI defaults `tracker_id` to the "Task" tracker when not specified.

### Edit issue fields

`PUT /issues/:id.json` -- any combination of fields:

```json
{
  "issue": {
    "subject": "Renamed",
    "status_id": 2,
    "parent_issue_id": 100
  }
}
```

### Add a relation

`POST /issues/:id/relations.json`

```json
{
  "relation": {
    "issue_to_id": 67890,
    "relation_type": "blocks"
  }
}
```

### Add journal note (public or private)

`PUT /issues/:id.json`

```json
{
  "issue": {
    "notes": "Fixed in commit abc123",
    "private_notes": true
  }
}
```

### Update issue description

`PUT /issues/:id.json`

```json
{
  "issue": {
    "description": "New description text"
  }
}
```

### Update a comment (journal)

`PUT /journals/:id.json`

```json
{
  "journal": {
    "notes": "Updated comment text"
  }
}
```

### Remove a comment (clear journal notes)

`PUT /journals/:id.json`

```json
{
  "journal": {
    "notes": ""
  }
}
```

## Common failure modes

- `401/403`: invalid API key, REST API disabled, or insufficient permissions.
- `404`: wrong base URL, or the endpoint is disabled by plugins/proxy rules.
- `422`: insufficient permissions, private notes restrictions, or invalid transitions (instance-specific).
