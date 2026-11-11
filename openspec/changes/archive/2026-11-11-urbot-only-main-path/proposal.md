# Proposal

## Why

The one-release compatibility window for the old generator is over. The main path still carries `legacy/`,
eleven `manna-*` skills, eight legacy workflows, and generator-era patterns/schemas alongside the Urbot
orchestration. That is dual maintenance with no remaining product value. This change deletes the legacy files
and leaves a single Urbot-only main path.

## What Changes

- **Delete `legacy/` entirely**: the retired generator, templates, examples, schemas, tests, and old golden
  evals.
- **Delete the legacy skills and workflows**:
  - Remove `manna-discovery`, `manna-agent`, `manna-tools`, `manna-domain`, `manna-graph`, `manna-memory`,
    `manna-pipeline`, `manna-transport`, `manna-evals`, and `manna-release`.
  - Rename `manna-router` to `urbot-router` and rewrite it as the 8-step Urbot intent router with the Urbot
    routing table. The router architecture is retained; only the legacy name and content are removed.
  - Remove `workflows/requirement-to-slice.md`, `feature-add.md`, `feature-modify.md`, `tool-integration.md`,
    `memory-tuning.md`, `data-pipeline.md`, `quality-gate.md`, and `release.md`.
- **Delete the remaining generator-era shared assets**: `shared/patterns/` and `shared/schemas/` (the
  `domain-slice`, `tool-contract`, and `transport-schema` files). Keep `shared/SKILL-template.md` as the
  document format and update its example to an Urbot name.
- **Make the manifests Urbot-only**: `skills.json`, `.well-known/agent-skills/index.json`,
  `.claude-plugin/plugin.json`, and `policies/modes.json` list the seven Urbot skills only
  (`urbot-router`, `urbot-discovery`, `urbot-profile`, `urbot-tool`, `urbot-domain-memory`, `urbot-prompt`,
  `urbot-verification`).
- **Make routing Urbot-only**: `workflows/routing/pipeline.json` declares only the six `urbot-*` entrypoints
  and their `skillRoutes`; the validator's router exception becomes `urbot-router`.
- **Replace the retirement guard**: `check:legacy` becomes `check:urbot-only`, asserting that no `legacy/`,
  `manna-*` skill/workflow, legacy shared asset, or legacy manifest entry remains. `npm test` runs it.
- **Update documentation and inventories**: `AGENTS.md`, `README.md`, and `docs/architecture.md` state that
  the main path is Urbot-only, the legacy files are deleted, and the retained orchestration spine is the
  router, routing pipeline, manifests, modes, tool-safety policy, kit lock, golden evals, and document format.
- **Retain the orchestration spine**: the router architecture as `urbot-router`, `workflows/routing/pipeline.json`,
  `scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`,
  `.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, the kit `skills.lock`,
  golden routing evals, and `shared/SKILL-template.md`.
- **Non-goals**: no changes to the Urbot orchestration logic (`generator/urbot/`, the Urbot workflows, or the
  profile/tool behavior); no second Spring Boot application; no reintroduction of legacy paths.

## Capabilities

### New Capabilities

- `urbot-only-main-path`: defines the legacy deletion, the Urbot-only skill/workflow/manifest inventory, the
  `urbot-router` content, the retained spine, the Urbot-only guard, and the documentation contract.

### Modified Capabilities

None. `manna-urbot-orchestrator`, `urbot-inspect-and-route`, `urbot-profile-change`, and
`urbot-tool-development` keep their behavior. `retire-legacy-generator-paths` is superseded by the deletion
planned here.

## Impact

- **Deleted**: `legacy/`, ten `manna-*` skills, eight legacy workflows, `shared/patterns/`, `shared/schemas/`.
- **Renamed**: `skills/manna-router` → `skills/urbot-router` with Urbot routing content.
- **Updated**: `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`,
  `policies/modes.json`, `workflows/routing/pipeline.json`, `scripts/dev/validate-kit.mjs`,
  `scripts/dev/check-positioning.mjs`, `package.json` (`check:urbot-only`, `npm test`), `AGENTS.md`,
  `README.md`, `docs/architecture.md`, `shared/SKILL-template.md`, and `skills.lock`.
- **Tests**: the Urbot routing/profile/tool checks and the new `check:urbot-only` guard; `npm test` and
  `openspec validate urbot-only-main-path --strict`.
- **Out of scope**: Urbot orchestration behavior changes, permanent data migration, and any second
  application.
