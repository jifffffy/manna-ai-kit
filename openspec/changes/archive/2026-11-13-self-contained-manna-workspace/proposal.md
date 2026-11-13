# Proposal

## Why

The current `manna init` leaves the Manna kit outside the generated project and only creates a bare Urbot
checkout. That is the wrong unit of work: opening the checkout in OpenCode does not give the reader the local
orchestration layer, skills, workflows, policies, or commands. The generated directory should be a
**self-contained Manna workspace** that can be opened in OpenCode and used immediately.

## What Changes

- **`manna init` creates or reuses a workspace** (default `./manna-workspace`) instead of only a bare
  `./urbot` checkout.
- **Copy the local Manna kit into the workspace**:
  - a generated workspace `AGENTS.md`;
  - `.opencode/` commands and skills;
  - `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`;
  - `skills.json`, `.well-known/`, `.claude-plugin/`;
  - `openspec/config.yaml` and `openspec/specs/` (an OpenSpec root without the kit's change history);
  - a workspace `.gitignore`.
  - Copy the Manna skills into `.opencode/skills/` as well, so OpenCode's skill loader sees them (the root
    `skills/` remains the canonical documentation).
  - Do not copy kit-maintenance assets: `scripts/dev/`, `evals/`, `package.json`, `skills.lock`, or
    `openspec/changes/`.
- **Generate a workspace `AGENTS.md`** that tells OpenCode:
  - the local kit is the workspace root (`skills/`, `workflows/`, `policies/`, `generator/`, `docs/`);
  - the Urbot checkout is `./urbot` and all Urbot source paths are relative to it;
  - start with `skills/urbot-router/SKILL.md` and the local workflows;
  - use the global `manna` command or `node generator/manna.mjs`;
  - the OpenSpec root is `./openspec`.
- **Place the Urbot checkout at `<workspace>/urbot`** by default. Add `--workspace <dir>`; keep `--dir` as an
  explicit checkout override. The workspace copy is still fixed to `https://github.com/jifffffy/urbot` and the
  latest semver tag/`main` fallback.
- **Keep the init read-only for Urbot**: it writes the workspace kit copy and may clone the Urbot checkout, but
  it does not modify Urbot source and does not execute the routed workflow.
- **Make the copy idempotent**: reuse an existing workspace; copy missing files; preserve user-modified files
  unless `--force` is passed. `--force` refreshes the copied kit and the generated workspace `AGENTS.md`.
- **Add `workspace` and `kit` to the result** alongside `source` and `inspection`, so the user can open the
  workspace directly.
- **Ship the copy inputs**: add `.opencode/`, `openspec/config.yaml`, and `openspec/specs/` to the package
  `files`; add a workspace `AGENTS.md` template under `generator/urbot/`.
- **BREAKING**: the default `manna init` destination changes from `./urbot` to
  `./manna-workspace` with `./urbot` inside. `--dir` still points at the checkout, and `--workspace` chooses
  the self-contained workspace root.

## Capabilities

### New Capabilities

- `manna-workspace`: defines the self-contained workspace layout, the kit copy set, the generated
  `AGENTS.md`, OpenCode skill discovery, idempotent refresh, and the packaging contract.

### Modified Capabilities

- `urbot-inspect-and-route`: the one-step init creates/reuses a workspace, copies the local orchestration
  layer, defaults the Urbot checkout to `<workspace>/urbot`, and returns `workspace`/`kit` with the existing
  `source`/`inspection`.

## Impact

- **CLI**: `generator/urbot/simple-init.mjs` gains workspace creation, kit copying, `AGENTS.md` generation, and
  `--workspace`/`--force`; `generator/manna.mjs` usage and output expand.
- **Package**: `package.json` `files` adds `.opencode/`, `openspec/config.yaml`, `openspec/specs/`; a new
  `generator/urbot/workspace-agents.md` template ships with the CLI.
- **Tests**: `scripts/dev/test-simple-init.mjs` is updated/extended to assert the workspace layout, copied
  skills, `.opencode` discovery, AGENTS paths, idempotency, and Urbot reuse/read-only behavior.
- **Docs**: `README.md`, `AGENTS.md`, and `docs/architecture.md` describe the workspace-first init and how to
  open it in OpenCode.
- **Lock**: `skills.lock` is regenerated.
- **Out of scope**: automatic execution of the routed workflow, a second runtime or domain model, Vaadin/UI,
  and deleting or rewriting the kit's own maintenance tests.
