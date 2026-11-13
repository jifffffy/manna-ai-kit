# Proposal

## Why

The self-contained workspace introduced a `./manna-workspace` subdirectory by default. That adds a nesting
level users do not want: they open a project directory and expect Manna to initialize that directory, with the
Urbot checkout at `./urbot`, not create another workspace directory inside it. Initializing in place also lets
an existing `.gitignore` be extended instead of replaced.

## What Changes

- **Default `manna init` to the current working directory.** The workspace root is `.`; the Urbot checkout is
  `./urbot`. No `./manna-workspace` directory is created by default.
- Keep `--workspace <dir>` for users who explicitly want a different workspace root. Keep `--dir` as the Urbot
  checkout override.
- **Append to an existing `.gitignore`** instead of skipping or replacing it: add missing `.manna-run/` and
  the checkout ignore entry, preserve all existing lines.
- **Reject the Manna kit root** as a workspace to avoid copying the kit into itself or overwriting its
  `AGENTS.md`.
- Preserve the existing copy set, `--force` refresh, OpenCode discovery, and Urbot read-only behavior.
- Update the init test, README/AGENTS/architecture docs, and the `manna-workspace` and
  `urbot-inspect-and-route` specs.
- **BREAKING**: the default workspace path changes from `./manna-workspace` to `.` (with `./urbot` inside).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `manna-workspace`: adds the in-place workspace default, `.gitignore` append behavior, and kit-root guard.
- `urbot-inspect-and-route`: the one-step init defaults to the current working directory and `./urbot` rather
  than a nested workspace directory.

## Impact

- `generator/urbot/workspace.mjs` (default and `.gitignore` handling)
- `scripts/dev/test-simple-init.mjs`
- `README.md`, `AGENTS.md`, `docs/architecture.md`
- `openspec/specs/manna-workspace/spec.md`, `openspec/specs/urbot-inspect-and-route/spec.md`
- `skills.lock`
- **Out of scope**: automatic workflow application, a second runtime/domain, UI, and changing the copy set
  beyond the `.gitignore` behavior.
