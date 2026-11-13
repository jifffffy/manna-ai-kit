# Design

## Context

See `proposal.md` — Why. The current `manna init` in `generator/urbot/simple-init.mjs` creates or reuses a
bare Urbot checkout (default `./urbot`) and routes. The kit itself is external, so an OpenCode session opened
in the checkout has no local skills, workflows, policies, or commands. The installed kit package currently
ships `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`, manifests, and `docs/`, but not
`.opencode/` or `openspec/`.

## Goals / Non-Goals

**Goals:**

- Make `manna init` produce a workspace that is self-contained for OpenCode.
- Keep the Urbot checkout inside the workspace at `./urbot`.
- Copy a curated, safe subset of the kit; do not copy kit-maintenance tests.
- Generate a workspace `AGENTS.md` with unambiguous paths.
- Make the copy idempotent and refreshable.
- Ship the copy inputs in the package.

**Non-Goals:**

- Auto-applying a routed workflow.
- A second runtime, domain model, or UI.
- Updating the workspace automatically when the installed kit changes.
- Copying the kit's own tests, lock, or OpenSpec change history.

## Decisions

### D1. Workspace layout and defaults

```text
manna-workspace/
├── AGENTS.md                 # generated workspace entry point
├── .opencode/                # commands + OpenCode skills
├── skills/                   # canonical Manna skills
├── workflows/
├── policies/
├── shared/
├── docs/
├── generator/                # local CLI snapshot
├── skills.json
├── .well-known/
├── .claude-plugin/
├── openspec/
│   ├── config.yaml
│   └── specs/                # kit capability specs, no archived changes
├── .gitignore
└── urbot/                    # the fixed Urbot checkout
```

`manna init "<request>"` defaults the workspace to `./manna-workspace`. `--workspace <dir>` chooses another
root. `--dir <dir>` remains the Urbot checkout override; without it the checkout is `<workspace>/urbot`.

This is **BREAKING** for the default destination: the checkout is no longer `./urbot`; it is
`./manna-workspace/urbot`. `--dir` preserves explicit checkout control.

*Alternative considered:* copy the kit into the Urbot checkout root. Rejected — it mixes tooling with the
product and makes the Urbot diff noisy.

### D2. Copy set and exclusions

Copy from the installed kit root (`KIT_ROOT`, resolved from the CLI module) into the workspace:

```text
AGENTS.md template source     -> generated workspace AGENTS.md
.opencode/                    -> .opencode/
skills/                       -> skills/ and .opencode/skills/<urbot-*>
workflows/                    -> workflows/
policies/                     -> policies/
shared/                       -> shared/
docs/                         -> docs/
generator/                    -> generator/
skills.json                   -> skills.json
.well-known/                  -> .well-known/
.claude-plugin/               -> .claude-plugin/
openspec/config.yaml          -> openspec/config.yaml
openspec/specs/               -> openspec/specs/
```

Do **not** copy:

```text
.git/  node_modules/  target/  .manna-run/
scripts/dev/  evals/  package.json  skills.lock  openspec/changes/
```

The workspace is a consumer snapshot, not a kit checkout. `generator/` is copied so the local CLI and skill
scripts work; `package.json`/`skills.lock`/`scripts/dev`/`evals` are kit maintenance and would be stale or
irrelevant.

*Alternative considered:* copy the whole kit. Rejected — it ships maintenance tests and a lock that no longer
matches the generated workspace `AGENTS.md`.

### D3. Generated workspace AGENTS.md

Do not copy the kit's maintenance-oriented `AGENTS.md` to the workspace root. Generate a small consumer
`AGENTS.md` from `generator/urbot/workspace-agents.md`:

- This is a self-contained Manna workspace.
- Local kit: workspace root (`skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`).
- Urbot checkout: `./urbot`; all Urbot source paths from the kit instructions are relative to it.
- Start with `skills/urbot-router/SKILL.md` and follow local workflows.
- CLI: global `manna`, or `node generator/manna.mjs` in the workspace.
- OpenSpec root: `./openspec`; `.opencode` supplies the `opsx` commands.
- Do not create a second runtime/domain; do not edit the copied kit for product changes.

The template uses a `{{URBOT_PROJECT}}` placeholder; the default renders `./urbot`, and `--dir` outside the
workspace renders the absolute path.

*Alternative considered:* copy and prepend the kit `AGENTS.md`. Rejected — its maintenance and source-path
sections assume the kit root is the Urbot root.

### D4. OpenCode discovery

Copy `.opencode/` from the kit, including `commands/opsx-*.md` and `skills/openspec-*`. Then copy each
`skills/urbot-*` directory to `.opencode/skills/<id>` so OpenCode's skill loader discovers the Manna skills.
Keep the canonical `skills/` copy as the documentation and source for scripts.

`openspec/config.yaml` and `openspec/specs/` make the copied `opsx` commands usable. Do not copy
`openspec/changes/`; the workspace starts without the kit's change history.

### D5. Safe, idempotent copy

- If the workspace is missing: create it and copy the manifest.
- If it exists: copy missing files, never delete unrelated files, and preserve existing copies.
- `--force` refreshes the copied kit files and the generated `AGENTS.md`; it does not delete files outside the
  manifest.
- The Urbot checkout is handled by the existing checkout reuse/clone logic at `<workspace>/urbot` or `--dir`.
- The copy uses `fs.cpSync` for directories and writes generated files explicitly; it never copies `.git` or
  the kit's change history.

*Alternative considered:* fail if the workspace exists. Rejected — re-running `init` should be safe and should
allow a partial copy to complete.

### D6. Packaging

Add to `package.json` `files`:

```json
".opencode/",
"openspec/config.yaml",
"openspec/specs/"
```

The workspace `AGENTS.md` template lives at `generator/urbot/workspace-agents.md`, already inside the shipped
`generator/` tree. The installed CLI resolves `KIT_ROOT` two levels above `generator/urbot/simple-init.mjs`,
so the copy works from an npm install, not only from the kit checkout.

### D7. Output and tests

The result becomes:

```json
{
  "workspace": "/.../manna-workspace",
  "kit": { "copied": ["..."], "skipped": ["..."] },
  "source": { "repository": "...", "requestedRef": "...", "resolvedCommit": "...", "directory": "<workspace>/urbot" },
  "inspection": { "...": "..." }
}
```

Extend `scripts/dev/test-simple-init.mjs` to create a temp workspace and assert:

- the workspace contains the copy set and `urbot/`;
- `AGENTS.md` names `./urbot`, `skills/urbot-router`, and `openspec`;
- `.opencode/commands/opsx-propose.md` and `.opencode/skills/urbot-router/SKILL.md` exist;
- `openspec/config.yaml` and `openspec/specs/` exist;
- `scripts/dev/`, `evals/`, `package.json`, `skills.lock`, and `openspec/changes/` are absent;
- a modified copied file survives a second run and is refreshed by `--force`;
- the Urbot checkout's `git status` is unchanged and the route still resolves.

### D8. Docs and lock

Update `README.md`, `AGENTS.md`, and `docs/architecture.md` with the workspace-first command, defaults,
`--workspace`/`--dir`/`--force`, and the instruction to open the workspace in OpenCode. Regenerate
`skills.lock`.

## Risks / Trade-offs

- **Workspace snapshot drifts from the installed kit** → `--force` refreshes; document the snapshot semantics.
- **Copied `.opencode/skills` duplicates the root `skills/`** → Keep root as canonical and document the
  OpenCode copies; the duplicate is intentional for discovery.
- **`--dir` outside the workspace** → Render an absolute `URBOT_PROJECT` in the generated `AGENTS.md`.
- **Nested Urbot Git checkout inside the workspace** → Add `urbot/` to the workspace `.gitignore`; the Urbot
  checkout keeps its own Git history.
- **Package `files` misses a copy input** → Ship `.opencode/`, `openspec/config.yaml`, and `openspec/specs/`;
  test from an installed-package-shaped temp root.
- **Copying too much creates a second kit checkout** → Exclude maintenance tests, lock, package metadata, and
  OpenSpec changes.

## Migration Plan

1. Add the workspace template and copy manifest.
2. Extend `simple-init` to create/reuse the workspace and copy the kit.
3. Add `--workspace`/`--force`, change the default checkout to `<workspace>/urbot`, and add `workspace`/`kit`
   to the result.
4. Add package `files` entries for the copy inputs.
5. Extend the init test for the workspace layout, OpenCode discovery, idempotency, and Urbot read-only.
6. Update docs and `skills.lock`.
7. Run `npm run validate`, `npm run lock:check`, `npm test`, and
   `openspec validate self-contained-manna-workspace --strict`.
8. Roll back by restoring the old default checkout and removing the copy/template/tests/docs changes; the
   Urbot checkout is untouched.

## Open Questions

None blocking. The workspace default is `./manna-workspace`; users who want a different name pass
`--workspace`. A later change can add an explicit `manna workspace sync` command if snapshot refresh becomes a
routine need.
