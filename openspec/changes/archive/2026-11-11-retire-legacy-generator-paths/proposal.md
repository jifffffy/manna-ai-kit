# Proposal

## Why

The Urbot orchestration path is now the product: `manna urbot init|inspect`, the profile write workflow, and the
tool write workflow have each been verified against a real Urbot checkout. Keeping the old generator, its
templates, schemas, examples, and tests in the main path forces two products to be maintained in parallel. This
change retires the old generator by moving it under `legacy/` for one release, then removal can happen in a
later change without breaking compatibility now.

**Dependency note:** the requested prerequisite `implement-urbot-domain-memory` is not present in this
repository; the latest archived change is `implement-urbot-tool-development`. This change only relocates
legacy generator assets and does not depend on domain/memory code. If that change lands first, this work
rebases cleanly because it does not touch the Urbot orchestration logic.

## What Changes

- **Move to `legacy/`** (do not delete; remove after one release):
  - `templates/agent-core/`
  - the legacy generator commands `init`/`slice`/`validate`/`lock`, their `lib/`, and the old entrypoint
  - `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`,
    `memory-schema.schema.json`, `pipeline-schema.schema.json`
  - the generated `examples/` fixtures and the legacy generator tests
  - `.manna/domain.json`, `.manna/project.spec.json`, generated `.manna/lock.json`, `project.designMode`, and
    `F-001` capability IDs, which live inside the moved templates/examples/schemas
- **Split the CLI**: create a main entrypoint that only dispatches `manna urbot init|inspect`; move the old
  `init`/`slice`/`validate`/`lock` switch and `generator/lib/` to `legacy/generator/`.
- **Extract the lock helper**: move the generic `walk`/`computeDigest` helpers used by
  `scripts/dev/update-lock.mjs` into a main-path module so the lock check no longer imports
  `generator/lib/lock.mjs` (which moves to legacy).
- **Clean references**: no main-path source, script, package script, manifest, or skill `requires` may point at
  `legacy/` or at the moved schemas/templates/examples. Update the legacy `manna-*` skill `requires` that point
  at the moved schemas.
- **Scope the validator**: `scripts/dev/validate-kit.mjs` validates only main-path JSON (skip `legacy/`,
  `.opencode/`, `openspec/`, `.github/`).
- **Scope the lock**: `scripts/dev/update-lock.mjs` excludes `legacy/`; `skills.lock` lists only main-path kit
  content.
- **Remove legacy tests from the main gate**: remove the generator and generated-compile tests from
  `npm test`; add a `check:legacy` guard. Update CI to stop running the legacy compile.
- **Docs**: `AGENTS.md`, `README.md`, and `docs/architecture.md` state that `legacy/` is historical reference
  only, not shipped or imported, and that the main product path is Urbot orchestration. Package metadata and
  the published `files` list drop the legacy directories.
- **Retain**: the `skills/manna-router` architecture (retained as the Urbot intent router), the
  `workflows/routing/pipeline.json` structure, `scripts/dev/validate-kit.mjs`, `skills.json`,
  `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, `policies/modes.json`,
  `policies/tool-safety.md`, the kit `skills.lock`, golden routing evals, and the skills/workflow document
  format.
- **Non-goals**: no permanent deletion of `legacy/` in this change; no changes to the Urbot orchestration
  logic; no second Spring Boot application.

## Capabilities

### New Capabilities

- `retire-legacy-generator-paths`: defines the legacy relocation layout, the main-path reference ban, the
  validator and lock scope, the documentation contract, the retained assets, and the retirement guards.

### Modified Capabilities

None. The Urbot inspect/route, profile, and tool capabilities are unchanged.

## Impact

- **Moved files**: `templates/agent-core/`, `generator/lib/`, the old generator entrypoint, `examples/`, the
  five project schemas, and the legacy generator tests move under `legacy/`.
- **New main files**: a urbot-only `generator/manna.mjs`, `scripts/dev/lock-utils.mjs`, and
  `scripts/dev/check-legacy.mjs`.
- **Updated**: `scripts/dev/update-lock.mjs`, `scripts/dev/validate-kit.mjs`, the legacy `manna-*` skill
  `requires`, `package.json` scripts/files/metadata, `.github/workflows/validate.yml`, `AGENTS.md`,
  `README.md`, `docs/architecture.md`, and `skills.lock`.
- **Tests**: `check:legacy`, `npm test`, `openspec validate retire-legacy-generator-paths --strict`; the
  legacy generator test and compile test are no longer part of the main gate.
- **Out of scope**: permanent deletion, Urbot orchestration changes, and any second application or runtime.
