# Proposal

## Why

`manna init "<request>"` routes a request before the workspace exists, so the route cannot be acted on. The
confirmed layout is that `manna init demo` **is** the project: the Urbot repository is cloned into `demo/`, and
the Manna kit is layered into that same directory. Users also want exactly **one** `AGENTS.md`, and they expect
Manna itself to carry the build, run, and test knowledge for Urbot instead of leaving that only in the Urbot
repository's prose.

## What Changes

- **`manna init` requires a project name.** `manna init demo` creates `./demo`. A missing name is an error.
- **Clone Urbot into the project directory.** If `demo/` is missing or empty, clone
  `https://github.com/jifffffy/urbot` at the latest semver tag (falling back to `main`). If `demo/` is already a
  valid Urbot checkout, reuse it. If `demo/` exists and is not a Urbot checkout, fail before writing.
- **Copy the Manna kit into the project root, overwriting existing kit files**, so `demo/` holds both the Urbot
  checkout (`pom.xml`, `src/main/java/com/embabel/urbot/`) and the Manna layer (`skills/`, `workflows/`,
  `.opencode/`, `openspec/`, `AGENTS.md`). There is no nested `demo/urbot/`. An existing file at a kit path is
  replaced, so re-running `init` always refreshes the Manna layer.
- **Replace `AGENTS.md` with the Manna-owned file.** `init` deletes the cloned Urbot `AGENTS.md` and writes
  the Manna workspace `AGENTS.md` in its place. Manna now owns the whole agent contract for the project: layout,
  routing, tool safety, the extension model, and the everyday build/run/test workflow. Exactly one
  `AGENTS.md` remains, and OpenCode loads it automatically. Because the kit copy always overwrites, `--force`
  is removed from `init`.
- **Manna absorbs the necessary Urbot content.** Port the operational content of the Urbot `AGENTS.md` into
  the Manna workspace template: run/build prerequisites, test strategy, the extension model, RAG/memory scoping,
  and the known gotchas. Add the build/run/test steps to the `urbot-verification` skill and workflow, route
  build/run/test requests to it, and keep the `AGENTS.md` commands aligned with that skill.
- **No request and no routing.** `init` prints `workspace`, `kit`, `source`, `entry` (always `AGENTS.md`), and
  `next`; it does not print `inspection` or select a workflow. Routing stays with `manna urbot inspect
  --request` and the OpenCode session.
- **BREAKING**: the positional argument is now a project directory, not a request; `manna init` with no name
  fails; `--workspace`, `--dir`, and `--force` are removed from `init` because copying always overwrites
  kit-owned files; `inspection` is gone from the output; `init` replaces the tracked `AGENTS.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `urbot-inspect-and-route`: init becomes project-directory creation with a required name, clone-or-reuse, kit
  copy, a replaced `AGENTS.md`, and no routing; the unambiguous-route requirement moves to `urbot
  inspect`.
- `manna-workspace`: the workspace root is the Urbot checkout, `AGENTS.md` is a Manna-owned file that replaces
  the Urbot one, tracked files are otherwise untouched, and the output ends with an OpenCode handoff.
- `manna-urbot-orchestrator`: Manna documents and routes the Urbot build, run, and test steps through the
  verification skill and workflow.

## Impact

- `generator/urbot/simple-init.mjs` (required project, clone/reuse rules, output, no `inspectCommand`)
- `generator/urbot/workspace.mjs` (merged root, overwrite copy, replaced `AGENTS.md`, `.git/info/exclude`,
  no `urbot/` ignore)
- `generator/urbot/workspace-agents.md` (full Manna-owned entry point with the absorbed Urbot operations)
- `generator/manna.mjs` (top-level help text)
- `skills/urbot-verification/SKILL.md`, `workflows/urbot-verification.md`, `workflows/routing/pipeline.json`
- `scripts/dev/test-simple-init.mjs` (project-name contract, single `AGENTS.md`, content coverage, ignore rules)
- `README.md`, `AGENTS.md`, `docs/architecture.md`
- `openspec/specs/urbot-inspect-and-route/spec.md`, `openspec/specs/manna-workspace/spec.md`,
  `openspec/specs/manna-urbot-orchestrator/spec.md`
- `skills.lock`
- **Out of scope**: changing the copy set beyond the entry point and ignore handling, the router's intent
  model beyond build/run/test triggers, automatic workflow application, committing the kit files, a second
  runtime/domain, and any UI.
