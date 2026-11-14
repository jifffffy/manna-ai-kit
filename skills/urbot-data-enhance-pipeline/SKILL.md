---
name: urbot-data-enhance-pipeline
description: Generate reviewable data enhancement CSV batches, gate them on human review, and apply only approved rows.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - policies/approval-checkpoints.md
  - policies/tool-safety.md
---

# Urbot Data Enhancement Pipeline

## When to use

A Urbot project needs to enrich its graph in bulk: relationship inference, nationality or technique assignment,
instrumentation, or any LLM- or pattern-generated data that a human must sign off before it becomes durable
knowledge.

Use this skill to define the batch, generate candidates, run the review gate, and apply only approved rows.

## Inputs

- The target Urbot project and bot/domain package.
- The batch name and the graph relationship or attribute it produces.
- The key columns that identify a row.
- The generator: an LLM prompt, a deterministic matcher, or both.
- The confidence or strength semantics for the batch.

## Process

1. **Discover.** Run `urbot-discovery` to confirm the bot package, the domain types, and the Neo4j access path.
2. **Define the batch.** Pick the CSV path (`data/enhancements/<batch>.csv` by default), the key columns, and
   the relationship type. Record them in the workflow notes.
3. **Implement generation in Urbot.** The enhancer writes the header and `status=pending` rows; it never writes
   the graph. Generation skips when the CSV already has reviewed rows.
4. **Generate and stop.** Produce the CSV, report the row count and path, then stop at `CHECKPOINT: REVIEW`.
5. **Review in the CSV and Git.** A human sets each row to `approved` or `rejected`, deletes wrong rows, and
   commits. Run `review-csv.mjs` in review mode to validate structure and counts.
6. **Gate apply.** Run `review-csv.mjs --mode apply`. It fails while any row is `pending`, when nothing is
   approved, or when a row is invalid. Do not bypass it.
7. **Apply.** The Urbot apply step filters `status=approved` (case-insensitive), skips relationships that
   already exist, records `source` and `reviewedAt`, and reports loaded/skipped/failed counts.
8. **Verify.** Compile, run the Urbot contract tests, re-run the validator, and spot-check the applied counts.

## Checkpoints

- `CHECKPOINT: REVIEW` — after generation and before any apply. The human review outcome is required.
- `CHECKPOINT: APPLY` — before a force apply or any delete. A force apply ignores the status column, prints the
  rows it would write, and requires explicit approval. It is never automatic.

## Review gate

```bash
node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
  --csv data/enhancements/<batch>.csv \
  --key <key columns> \
  --mode review

node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
  --csv data/enhancements/<batch>.csv \
  --key <key columns> \
  --mode apply
```

`review` reports structure errors and per-status counts. `apply` additionally fails on pending rows, on zero
approved rows, and on any invalid row.

## Output

A report with the batch path, row counts by status, validator result, apply result, verification commands, and
the files changed in Git.

## Do not

- Write graph data during generation.
- Apply `pending` or `rejected` rows.
- Auto-approve rows or let the agent review its own output.
- Run a force apply or delete without explicit approval.
- Add a UI, admin endpoint, approval table, or a Neo4j driver to Manna.
- Create a second runtime, domain model, or persistence layer.

## References

- `references/csv-contract.md` — columns, statuses, keys, and quoting.
- `references/urbot-implementation.md` — the expected Urbot-side Java shape.
