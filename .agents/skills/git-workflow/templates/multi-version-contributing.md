# Contributing Guidelines (Multi-Version Pattern)

This project follows a specific Git Flow pattern to support multiple parallel versions and "flavours".

## Branching Strategy

### Protected Branches
The following branches are **PROTECTED**. Direct work is strictly prohibited:
- `master`
- `product_v2` (Legacy)
- `product_v2_appserver` (Intermediate)
- `product_v3_appserver` (Latest/Active)

### Feature Development
- **Source**: Branch from the relevant version branch (e.g., `product_v3_appserver`).
- **Naming**: `feature/<issue-id>-<description>`
- **Target**: Pull Request back to the **source version branch**.

### Hotfixing
- **Source**: Latest release tag or production branch for the version.
- **Naming**: `hotfix/<issue-id>-<description>`
- **Target**: Both the version branch (e.g., `product_v3_appserver`) and the production branch/tag.

## Commit Message Convention
All commits MUST follow the **Conventional Commits** specification:
`<type>(<scope>): <description>`

Allowed types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `perf`, `test`, `build`, `ci`.

## Porting Changes
Changes applying to multiple versions must be **cherry-picked**. Do not merge different core version branches into each other.
