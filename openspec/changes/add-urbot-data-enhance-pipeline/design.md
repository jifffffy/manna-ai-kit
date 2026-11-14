# Design

## Context

See `proposal.md` — Why. Impromptu's `data/pipeline` package implements the pattern: `Enhancer` exposes
`generate`, `shouldGenerate`, `apply`, and `shouldApply`; CSV rows carry `status`; `ComposerEnhancementPipeline`
filters `approved` on apply (`ComposerInfluenceLoader.loadApproved`), and the reviewer edits the CSV before the
UI or REST apply runs. Urbot is headless, so the UI and REST controller are replaced by CSV editing, Git, and a
validator; the graph-side rules stay the same.

Manna is a content-and-tooling kit with zero npm dependencies. It cannot open a Neo4j connection; the skill
therefore owns the contract, the review gate, and the validator, while the Urbot project owns the Java
generate/apply implementation.

## Goals / Non-Goals

**Goals:**

- Capture the review mechanism as a reusable Urbot skill and workflow.
- Make the review gate executable: a validator that fails apply while pending or invalid rows remain.
- Keep the flow headless and Git-auditable.
- Integrate the skill with routing, manifests, modes, evals, and documentation.

**Non-Goals:**

- Shipping a Neo4j driver or a Manna-side apply command.
- A UI, admin endpoint, or approval table.
- Generating the Java pipeline into a Urbot bot automatically in this change.
- Changing existing skills or workflows.

## Decisions

### D1. Skill shape and mode

`skills/urbot-data-enhance-pipeline/` contains `SKILL.md`,
`references/csv-contract.md`, `references/urbot-implementation.md`, and `scripts/review-csv.mjs`. The
`mode-default` is `review` because generation writes a CSV and apply writes the graph; both are gated. `skills.json`,
the well-known index, the Claude plugin, and `policies/modes.json` all list the same id and mode.

### D2. CSV is the contract

The canonical columns are:

```text
<key columns...>, reason, confidence, status
```

- `status` is one of `pending`, `approved`, `rejected`.
- `reason` is required and may contain commas when quoted.
- `confidence` (or `strength` for relationship types that need it) is a 0–1 number.
- Key columns identify the row (`from`/`to` for relationships, an id for attributes) and are declared per batch.
- The file lives under `data/enhancements/<batch>.csv` unless the Urbot project already owns a data directory.

A relationship batch also records `source` and `reviewedAt` when applied; the CSV itself stays human-editable.

*Alternative considered:* a database review table (rejected — needs an admin surface and hides the diff).

### D3. Review happens in the CSV and Git

The reviewer opens the CSV in any spreadsheet or text editor, changes `status` to `approved` or `rejected`,
deletes wrong rows, and commits. The Git diff is the audit trail. The workflow stops at
`CHECKPOINT: REVIEW`; apply is unreachable before the checkpoint is approved. No UI or admin endpoint is added.

### D4. One validator with two modes

`scripts/review-csv.mjs`:

```bash
node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
  --csv data/enhancements/composer-influences.csv \
  --key from,to \
  --mode review            # or --mode apply
```

- `review` mode: validate headers, statuses, duplicate keys, and numeric fields; print counts; exit non-zero on
  structural errors only.
- `apply` mode: additionally fail when any row is `pending`, when no row is `approved`, or when a row is
  invalid; this is the gate the apply step calls first.
- `--json` prints a machine-readable summary.
- Exit codes: `0` valid, `1` invalid, `2` usage error.

The script has no dependencies and never writes to the CSV or the graph.

### D5. Apply semantics

The Urbot implementation filters `status=approved` case-insensitively. It skips a relationship that already
exists (count first or use `MERGE`), records `source='llm-generated'` and `reviewedAt`, and returns
loaded/skipped/failed counts. A force apply (ignore status) is a separate action: it prints the rows it would
write, requires explicit approval, and is listed in `neverAutofix`. The skill never calls force by default.

### D6. Urbot implementation guidance is a reference, not a generator

`references/urbot-implementation.md` shows the expected Java shape: an `Enhancer` interface with
`generate`/`shouldGenerate`/`apply`/`shouldApply`, a profile-scoped configuration, CSV read/write helpers, status
filtering, idempotent Cypher, and a contract test that uses CSV fixtures without Neo4j. It does not generate
files; building the pipeline is a Urbot change that follows the existing discovery and verification steps.

*Alternative considered:* an `apply.mjs` that emits Cypher (rejected — parameter binding and review are better
handled by the Urbot command; the kit cannot test it against Neo4j).

### D7. Routing and inventory

Add an `urbot-data-enhance-pipeline` entrypoint with skills
`urbot-discovery → urbot-data-enhance-pipeline → urbot-verification` and triggers for data enhancement, CSV
review, approved-data apply, `数据增强`, and `人工审核`. Add the matching `skillRoutes` entry and route words in
`route.mjs`. Add one golden eval and fixture. Update the inventory to nine skills and eight workflows in the
validator lists, manifests, modes, router table, README, AGENTS, architecture, and the affected specs.

### D8. Tests

Add `scripts/dev/test-data-enhance-pipeline.mjs` with CSV fixtures:

- a clean reviewed CSV passes `review` and `apply`;
- a pending row fails `apply` but passes `review`;
- an unknown status, a missing column, and a duplicate key fail both modes;
- `--json` reports counts.

Wire it into `package.json` as `test:data` and into `npm test`. Extend the routing runner to eight routes and
seven eval files.

## Risks / Trade-offs

- **Large CSVs in Git** → Batches are per relationship type and reviewed in place; the workflow recommends
  splitting oversized batches rather than changing the format.
- **A reviewer mistakenly approves a wrong row** → The reason/confidence columns and the Git diff make the
  decision reviewable; rejected rows stay for the record.
- **Pending rows reach the graph** → The apply gate fails on pending rows and the default filter is
  case-insensitive `approved`.
- **Force apply misuse** → It is destructive, prints the intended rows, and requires explicit approval.
- **CSV contract drift between batches** → `references/csv-contract.md` fixes the shared columns; per-batch key
  columns are declared in the batch header and the workflow.
- **Kit cannot verify graph writes** → The skill reports commands and counts; the Urbot project owns the
  contract test and the real apply.

## Migration Plan

1. Add the skill, references, workflow, and validator.
2. Add the route, triggers, eval fixture, and routing runner expectations.
3. Update manifests, modes, inventory lists, docs, and the affected specs.
4. Add the validator test and wire it into `npm test`.
5. Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and
   `openspec validate add-urbot-data-enhance-pipeline --strict`.
6. Roll back by deleting the skill, workflow, eval, and route, and restoring the previous inventory counts.

## Open Questions

None.
