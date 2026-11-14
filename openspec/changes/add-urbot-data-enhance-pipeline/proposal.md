# Proposal

## Why

Impromptu already proves a safe pattern for LLM-generated knowledge: generate candidate rows into CSV with
`status=pending`, let a human approve or reject them, and load only approved rows into the graph. Urbot is
headless and has no equivalent flow, and Manna has no skill for building one. Extracting the pattern gives
Urbot a reviewable data-enhancement path without a UI, and keeps bulk graph writes behind a human gate.

## What Changes

- **Add the `urbot-data-enhance-pipeline` skill** (mode `review`) under `skills/`, with `SKILL.md`,
  `references/csv-contract.md`, `references/urbot-implementation.md`, and a zero-dependency reviewer script
  `scripts/review-csv.mjs`.
- **Define the review contract**: CSV is the review surface and Git is the audit trail. Statuses are `pending`,
  `approved`, and `rejected`; only `approved` rows may be applied; `rejected` rows stay for the record.
- **Add the validator**: `review-csv.mjs` checks headers, statuses, and duplicate keys, prints per-status
  counts, and in `--mode apply` fails while any row is still `pending`.
- **Add the workflow** `workflows/urbot-data-enhance-pipeline.md` with a `CHECKPOINT: REVIEW` between generate
  and apply.
- **Route it**: a new `urbot-data-enhance-pipeline` entrypoint and `skillRoutes` entry, plus routing intents for
  data enhancement and human review, and a golden eval with a fixture.
- **Update the inventory**: 9 skills and 8 workflows in `skills.json`, `.well-known`, `.claude-plugin`,
  `policies/modes.json`, the router table, `AGENTS.md`, `README.md`, `docs/architecture.md`, and the affected
  specs; refresh `skills.lock`.
- **No API or runtime break**: the new flow is additive. The apply step is an `internal-write`; `force`/delete
  remains `destructive` and is never auto-applied.

## Capabilities

### New Capabilities

- `urbot-data-enhance-pipeline`: generate reviewable enhancement batches, gate them on human CSV review, and
  apply only approved rows idempotently.

### Modified Capabilities

- `urbot-only-main-path`: the Urbot-only inventory grows to nine skills and eight workflows across the
  manifests, modes, and entry documentation.
- `urbot-inspect-and-route`: the routing table adds the data-enhancement intent, the skill/workflow inventory
  requirement grows, and the golden-eval requirement covers the new route.

## Impact

- `skills/urbot-data-enhance-pipeline/` (SKILL.md, references, `scripts/review-csv.mjs`)
- `workflows/urbot-data-enhance-pipeline.md`
- `workflows/routing/pipeline.json`, `generator/urbot/route.mjs`
- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, `policies/modes.json`,
  `skills.lock`
- `evals/golden/urbot-data-enhance-pipeline.eval.json`, `evals/fixtures/urbot/data-enhance.json`,
  `scripts/dev/test-routing.mjs`
- `scripts/dev/check-urbot-only.mjs`, `scripts/dev/check-positioning.mjs` expectations
- `scripts/dev/test-data-enhance-pipeline.mjs`, `package.json`
- `AGENTS.md`, `README.md`, `docs/architecture.md`
- `openspec/specs/urbot-only-main-path/spec.md`, `openspec/specs/urbot-inspect-and-route/spec.md`
- **Out of scope**: a Urbot UI or admin surface, a Manna-side Neo4j driver, automatic apply, changing existing
  bot, tool, domain, or verification workflows, and any second runtime or domain model.
