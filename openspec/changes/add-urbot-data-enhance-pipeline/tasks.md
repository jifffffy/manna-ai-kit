# Tasks

## 1. Skill content

- [x] 1.1 Create `skills/urbot-data-enhance-pipeline/SKILL.md` from `shared/SKILL-template.md` with `name`, `description`, `version: 0.1.0`, `mode-default: review`, and `requires` paths; verify `npm run validate` accepts the frontmatter.
- [x] 1.2 Document the process in `SKILL.md`: discover, generate pending rows, stop at `CHECKPOINT: REVIEW`, validate, apply approved rows, verify; verify the sections match the workflow.
- [x] 1.3 Write `references/csv-contract.md`: required columns, `pending`/`approved`/`rejected` semantics, key columns, quoting, and audit fields; verify it matches the validator behavior.
- [x] 1.4 Write `references/urbot-implementation.md`: `Enhancer` interface, profile-scoped configuration, CSV helpers, approved-only filter, idempotent Cypher, `source`/`reviewedAt`, and a no-Neo4j contract test; verify it names only Urbot-owned packages.
- [x] 1.5 State the safety contract in `SKILL.md`: apply is an `internal-write`, force/delete is `destructive`, no auto-apply, no UI, no second runtime.

## 2. Reviewer script

- [x] 2.1 Implement `skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs` with `--csv`, `--key`, `--mode review|apply`, `--json`, and exit codes 0/1/2; verify it runs with `node` and no dependencies.
- [x] 2.2 Validate headers, status values, numeric confidence/strength, and duplicate keys; verify each failure names the offending row.
- [x] 2.3 In `--mode apply`, fail on any `pending` row, on zero `approved` rows, and on invalid rows; verify the counts and row numbers are printed.
- [x] 2.4 Add `scripts/dev/test-data-enhance-pipeline.mjs` covering a clean CSV, a pending row, an unknown status, a missing column, and a duplicate key; verify it exits non-zero on failures.
- [x] 2.5 Add `test:data` to `package.json` and include it in `npm test`; verify `npm run test:data` and `npm test` pass.

## 3. Workflow, routing, and evals

- [x] 3.1 Create `workflows/urbot-data-enhance-pipeline.md` with discovery → generate → `CHECKPOINT: REVIEW` → validate → apply → verify; verify it references only the skill's own files and existing policies.
- [x] 3.2 Add the `urbot-data-enhance-pipeline` entrypoint and `skillRoutes` entry to `workflows/routing/pipeline.json` with data-enhancement and human-review triggers; verify `npm run validate` and `npm run check:urbot-only` pass.
- [x] 3.3 Add data-enhancement intent words and route details to `generator/urbot/route.mjs`; verify the request routes to the new workflow and does not collide with domain or tool intents.
- [x] 3.4 Add `evals/fixtures/urbot/data-enhance.json` and `evals/golden/urbot-data-enhance-pipeline.eval.json`; update `scripts/dev/test-routing.mjs` to eight routes and seven eval files, and verify `npm run test:routing` passes.

## 4. Inventory, manifests, and docs

- [x] 4.1 Add the skill to `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, and `policies/modes.json` with mode `review`; verify `npm run validate` passes.
- [x] 4.2 Update `scripts/dev/check-urbot-only.mjs` skill, workflow, entrypoint, and `skillRoutes` lists; verify `npm run check:urbot-only` passes.
- [x] 4.3 Update the router table, `AGENTS.md`, `README.md`, and `docs/architecture.md` to nine skills and eight workflows, including the Urbot-only inventory sections; verify `npm run check:positioning` passes.
- [x] 4.4 Update the affected main specs (inventory and routing) through the change deltas; verify `openspec validate add-urbot-data-enhance-pipeline --strict` passes.
- [x] 4.5 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh after the shipped-file edits.

## 5. Verification

- [x] 5.1 Run `npm run validate`, `npm run check:positioning`, `npm run check:urbot-only`, `npm test`, and `openspec validate add-urbot-data-enhance-pipeline --strict`; confirm all pass.
- [x] 5.2 Verify the validator end to end on a scratch CSV: review mode reports counts, apply mode fails on a pending row, and apply mode passes after the row is approved.
