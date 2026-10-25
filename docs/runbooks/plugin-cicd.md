---
type: "runbook"
title: "Plugin CI/CD"
description: "A self-contained pipeline that lives in the plugin's own repository, and the traps that cost the most time."
status: "draft"
tags:
  - "cicd"
  - "sonarqube"
  - "release"
generated:
  by: "agent:claude-code/claude-opus-5"
  at: "2026-10-25T14:47:05Z"
---

# Plugin CI/CD

## Purpose

Give a Redmine plugin a pipeline that runs anywhere: build a test image, test it, analyse
it, gate it, and publish a release on tag.

The configuration lives **in the plugin's repository**, not here. A plugin whose build
depends on this workspace cannot be built by CI or by anyone else — the reasoning is in
[workspace-model](../concepts/workspace-model.md).

This runbook is infrastructure-agnostic. Substitute your own `<ci-server>`,
`<sonar-server-name>`, `<sonar-scanner-tool>`, `<git-host>`, `<owner>/<repo>` and
`<git-token-credential>`.

## Preconditions

- A CI server whose agents have Docker and Compose v2.
- A SonarQube server registered in CI, plus a scanner tool. Branch and PR analysis on
  Community Edition additionally needs the community branch plugin, loaded into **both**
  the web and CE JVMs.
- A git credential with write access, for publishing releases.
- The plugin repository itself — attached for local work via
  [attach-a-plugin](attach-a-plugin.md).

## Procedure

The shape:

```
push branch → build image → test → rubocop → SonarQube branch/PR analysis → quality gate
            → PR (gated) → merge to main → package tarball → tag → publish release
```

### 1. Add the CI files to the plugin repo

```
<plugin>/
├── Jenkinsfile                 # or your CI's pipeline definition
├── docker-compose.ci.yml       # ephemeral test stack (tmpfs postgres + built image)
├── sonar-project.properties    # projectKey, sources, coverage path
└── ci/
    ├── Dockerfile              # official redmine: base + plugin + FULL bundle incl. test group
    ├── run-tests.sh            # write test db config, migrate, boot-check, run tests + coverage
    ├── coverage_boot.rb        # start SimpleCov before boot via RUBYOPT (optional)
    ├── package.sh              # build <plugin_id>-vX.Y.Z.tar.gz, top dir = plugin id
    └── release.sh              # publish the tarball on tag builds
```

A worked reference implementation lives in the `redmine_git_mirror` plugin. Copy its `ci/`,
`Jenkinsfile`, `docker-compose.ci.yml` and `sonar-project.properties`, then substitute your
plugin id, repository and SonarQube `projectKey`.

### 2. Wire it up

1. Set `sonar.projectKey`, the plugin id in the Dockerfile `COPY` and the test `NAME=`,
   and the repository in `release.sh`.
2. Create a multibranch pipeline against the plugin repo with **branch, PR and tag**
   discovery enabled.
3. Assign a realistic quality gate (below).
4. On a tag build, `package.sh` builds the tarball and `release.sh` publishes it.

### 3. Choose a quality gate you can actually pass

The default Sonar way `new_coverage >= 80%` is usually impractical here: plugin service
code is thread-, git- and cron-heavy, and new-code coverage is unreliable until the main
branch has been analysed at least once. Keep the strict quality conditions
(`new_violations = 0`, `new_duplicated_lines_density <= 3`, hotspots reviewed) and pick:

- **Well-tested plugin** — gate on **overall** `coverage >= <floor>`, which is stable per
  PR, or keep new-code coverage if it genuinely clears it.
- **Few or no tests** (a theme companion, say) — drop both coverage conditions, then
  tighten as tests arrive.

## Verification

- A branch build appears in SonarQube under its own branch name, not merged into `main`.
- The coverage report is `coverage/coverage.json` and SonarQube maps it to real source
  files rather than showing 0%.
- The boot check runs and is visible in the log:
  `bundle exec rails runner "Rails.application.eager_load!"`.
- A tag build produces `<plugin_id>-vX.Y.Z.tar.gz` whose top-level directory is the plugin
  id, and publishes it as a release.
- Installing that tarball into a clean Redmine boots without error.

## Failure modes

**Tests fail with missing gems in the dev image.** The workspace dev image omits the Ruby
`test` bundle group. The CI image must do a full `bundle install` from the official
`redmine:` base. Never reuse the dev image for tests.

**Eager-load crashes pass CI and then crash-loop production.** The test environment does
not eager-load, so an `l()`/`I18n.t` call or a database query in a module or class body is
invisible until production. Add the boot check above, and never translate at load time —
defer into a method.

**Bind mounts silently resolve to nothing on a remote or DinD daemon.** A host bind mount
(`.:/usr/src/...`) does not exist on a remote daemon and shadows the baked-in image
content. Bake the plugin in with `COPY .` and rebuild each run; extract artifacts such as
coverage with `docker cp`, not a bind mount.

**SonarQube shows no Ruby coverage.** It wants `simplecov_json_formatter` output
(`coverage/coverage.json`), not SimpleCov's native `.resultset.json`. Start SimpleCov
before boot via `RUBYOPT` so files loaded at boot are tracked, and rewrite the report's
container paths to the CI workspace. Exclude `db/migrate/**` and `config/**`.

**Helper scripts fail on an agent with no python3.** Keep them pure shell; parse JSON with
`grep` and `sed`.

**`COMPOSE_PROJECT_NAME` collides across jobs.** Build numbers restart per branch and PR
job, so `ci-${BUILD_NUMBER}` is not unique. Derive it from the job name too, e.g.
`${JOB_NAME//[^a-z0-9]/-}-${BUILD_NUMBER}`.

**A new tag is discovered but never built.** Most multibranch setups do not auto-build
newly pushed tags. Trigger the tag build, or accept that releases are cut on demand.

**A release re-ships old bugs.** `main` had drifted from the release tags. Keep `main` the
source of truth and tag from it.

**Functional tests cannot find `log_user`.** They must subclass
`Redmine::IntegrationTest`, not plain `ActionDispatch::IntegrationTest`.
