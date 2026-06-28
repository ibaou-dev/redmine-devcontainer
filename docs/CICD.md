# CI/CD for Redmine plugins

A recommended, self-contained CI/CD pipeline for a Redmine plugin developed with this
devcontainer. The CI configuration lives **in the plugin's own repository** (so the plugin
is buildable anywhere), while this devcontainer remains the local dev workspace.

This guide is infrastructure-agnostic — replace the placeholders (`<ci-server>`,
`<sonar-server-name>`, `<sonar-scanner-tool>`, `<git-host>`, `<owner>/<repo>`,
`<git-token-credential>`) with your own. It was distilled from running this pipeline across
several real plugins; the **Gotchas** section is the part that will save you the most time.

## Pipeline shape

```
push branch → CI (build image → test → rubocop → SonarQube branch/PR analysis → quality gate)
            → PR (gate) → merge to main → package tarball → tag → publish release
```

## Files to add to the plugin repo

```
<plugin>/
├── Jenkinsfile                 # or your CI's pipeline definition
├── docker-compose.ci.yml       # ephemeral test stack (tmpfs postgres + built image)
├── sonar-project.properties    # SonarQube config (projectKey, sources, coverage path)
└── ci/
    ├── Dockerfile              # official redmine: image + plugin + FULL bundle (incl. test group)
    ├── run-tests.sh            # writes test db config, migrates, boot-check, runs tests (+coverage)
    ├── coverage_boot.rb        # starts SimpleCov before boot (via RUBYOPT) — optional
    ├── package.sh              # builds <plugin_id>-vX.Y.Z.tar.gz (top dir = plugin id)
    └── gitea-release.sh        # publishes the tarball to a release on tag builds
```

A worked, battle-tested reference implementation lives in the `redmine_git_mirror` plugin —
copy its `ci/`, `Jenkinsfile`, `docker-compose.ci.yml`, and `sonar-project.properties`, then
substitute your plugin id, repo, and SonarQube `projectKey`.

## Setup steps

1. **Add the CI files** above; set `sonar.projectKey`, the plugin id in the Dockerfile `COPY`
   and test `NAME=`, and the repo in `gitea-release.sh`.
2. **CI job**: a multibranch pipeline pointing at the plugin repo, with **branch, PR, and
   tag** discovery enabled, on an agent that has Docker + Docker Compose v2.
3. **SonarQube**: a server registered in your CI; a scanner tool; for branch/PR analysis on
   Community Edition you need the community branch plugin (loaded into BOTH the web and CE
   JVMs).
4. **Quality gate**: assign a realistic gate per plugin (see below) and remove the default
   `new_coverage ≥ 80%` if it is not achievable.
5. **Release**: on a tag build, `package.sh` builds the tarball and `gitea-release.sh`
   publishes it (using a write-access token credential).

## Quality gates — be realistic per plugin

The default "Sonar way" `new_coverage ≥ 80%` is often impractical for Redmine plugins
(service code is thread/git/cron-heavy; new-code coverage is also unreliable until the main
branch has been analysed once). Recommended per-repo gates, keeping the strict quality
conditions (`new_violations = 0`, `new_duplicated_lines_density ≤ 3`, hotspots reviewed):

- **Well-tested plugin** → gate on **overall** `coverage ≥ <floor>` (stable per-PR), or keep
  new-code coverage if it genuinely clears it.
- **Plugin with few/no tests** (e.g. a theme companion) → a **no-coverage** gate (drop both
  coverage conditions); add tests and tighten over time.

## Gotchas (learned the hard way)

- **The devcontainer dev image omits the Ruby `test` bundle group** (lean runtime). Tests
  need mocha etc., so the **CI image must `bundle install` the full bundle** — don't reuse
  the dev image for tests.
- **Eager-load crashes hide in the test env.** The test environment does **not** eager-load,
  so a `l()`/`I18n.t` call in a module/class body (or any load-time error) passes CI but
  **crash-loops Redmine in production**. Add a boot check to CI:
  `bundle exec rails runner "Rails.application.eager_load!"`. Never translate at load time —
  defer into a method.
- **Remote / DinD CI daemons don't see host bind mounts.** A `docker compose` host bind mount
  (`.:/usr/src/...`) silently resolves to nothing on a remote daemon and shadows baked-in
  image content. Bake the plugin into the image (`COPY .`) and rebuild each run; extract
  artifacts (e.g. coverage) with `docker cp`, not a bind mount.
- **SonarQube Ruby coverage wants the `simplecov_json_formatter` output** (`coverage/coverage.json`),
  not SimpleCov's native `.resultset.json`. Start SimpleCov before boot (via `RUBYOPT`) so
  files loaded at boot are tracked, and rewrite the report's container paths to the CI
  workspace so SonarQube maps coverage to sources. Exclude `db/migrate/**`, `config/**`.
- **CI agents may not have python3.** Keep helper scripts (e.g. release publishing) in pure
  shell — parse JSON with `grep`/`sed`, not python.
- **`COMPOSE_PROJECT_NAME` must be unique per job AND build.** Build numbers restart per
  branch/PR job, so `ci-${BUILD_NUMBER}` collides across jobs; derive it from the job name
  too, e.g. `${JOB_NAME//[^a-z0-9]/-}-${BUILD_NUMBER}`.
- **Newly pushed tags are discovered but not auto-built** by most multibranch setups —
  trigger the tag build (or accept that releases are cut on demand).
- **Don't release from a stale `main`.** If `main` has drifted from your release tags, a new
  release can re-ship old bugs. Keep `main` the source of truth and tag from it.
- **Functional tests need `Redmine::IntegrationTest`** (not plain `ActionDispatch::IntegrationTest`)
  to get Redmine's `log_user` helper.
