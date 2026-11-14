# Workflow: Urbot Data Enhancement Pipeline

**Goal:** enrich the Urbot graph from generated candidates without letting unreviewed data become durable
knowledge.

## Phase 1 scope

The flow is review-gated: generation writes a CSV, a human reviews it, and apply loads only approved rows.

## Ordered steps

1. Run `urbot-discovery` to confirm the bot package, domain types, and Neo4j access path.
2. Define the batch: CSV path, key columns, relationship or attribute, and the confidence/strength meaning.
3. Generate candidates with `urbot-data-enhance-pipeline`: the header plus `status=pending` rows, no graph
   writes. Skip when the CSV already contains reviewed rows.
4. Report the CSV path and counts, then stop at `CHECKPOINT: REVIEW`.
5. A human reviews the CSV, sets `approved` or `rejected`, deletes wrong rows, and commits.
6. Validate the review:

   ```bash
   node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
     --csv data/enhancements/<batch>.csv \
     --key <key columns> \
     --mode review
   ```

7. Gate apply:

   ```bash
   node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
     --csv data/enhancements/<batch>.csv \
     --key <key columns> \
     --mode apply
   ```

   Do not apply when this fails.
8. Apply approved rows only. Skip existing relationships, record `source` and `reviewedAt`, and report
   loaded/skipped/failed counts.
9. Run `urbot-verification`: `./mvnw -q -DskipTests compile` and `./mvnw -q test`, plus the CSV validator again.
10. Stop at `CHECKPOINT: VERIFICATION REPORT` with the counts and the changed files.

## Checkpoints

- `CHECKPOINT: REVIEW` — required between generation and apply.
- `CHECKPOINT: APPLY` — required before force apply or delete. A force apply ignores status, prints the rows it
  would write, and is never automatic.
- `CHECKPOINT: VERIFICATION REPORT` — closes the flow.

## Output

A report with the batch path, status counts, validator results, apply results, verification commands, and the
Git diff.

## Do not

- Write the graph during generation.
- Apply pending or rejected rows.
- Auto-approve or let the agent approve its own output.
- Run a force apply or delete without explicit approval.
- Add a UI, admin endpoint, or approval table.
- Create a second runtime or domain model.
