# Contributing Guidelines (Generic Pattern)

We welcome contributions to this project! To maintain code quality and history, we follow these guidelines.

## Branching Strategy

### Main Branch
- `main` (or `master`) is the stable branch. All development happens in feature branches.

### Feature Development
- **Source**: `main`
- **Naming**: `feat/<description>` or `fix/<description>`
- **Workflow**:
  1. Create a branch from `main`.
  2. Implement your changes.
  3. Ensure all tests pass.
  4. Submit a Pull Request to `main`.

## Commit Message Convention
We use **Conventional Commits** to keep our history clean and automated.

**Format**: `<type>(<scope>): <description>`

**Common Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semi colons, etc; no code change
- `refactor`: Refactoring production code
- `test`: Adding missing tests, refactoring tests; no production code change
- `chore`: Updating build tasks, package manager configs, etc; no production code change
