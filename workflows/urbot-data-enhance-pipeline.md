# Workflow: Urbot Data Enhancement Pipeline

**Goal:** generate a Java data-enhancement pipeline for a Urbot bot, review its CSV output, and apply only
approved rows.

## Phase 1 scope

The pipeline is Java code in the bot package. The flow is review-gated: generation writes a CSV, a human
reviews it, and apply loads approved rows only.

## Ordered steps

1. Run `urbot-discovery` to confirm the bot package, domain types, and Neo4j access path.
2. Plan the pipeline with `urbot-data-enhance-pipeline`:
   - batch name, source and target `NamedEntity` types, relationship type;
   - CSV path, key columns, and review properties;
   - pattern mode (`contains` or `none`).
3. Run the generator without `--approve` and review the plan.
4. Re-run with `--approve`; the generator writes the Java pipeline, REST controller, test, and properties.
5. Compile with `./mvnw -q -DskipTests compile` and run `./mvnw -q test`.
6. Generate candidates through the REST endpoint or the Spring bean; report the CSV path and pending count.
7. Stop at `CHECKPOINT: REVIEW`. A human sets `approved` or `rejected`, deletes wrong rows, and commits.
8. Optionally validate the review:

   ```bash
   node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
     --csv data/enhancements/<batch>.csv \
     --key sourceId,targetId \
     --mode apply
   ```

9. Stop at `CHECKPOINT: APPLY`, enable `urbot.data-enhancement.enabled=true` if needed, and apply with
   `confirm=true`. The response reports loaded/skipped/failed counts.
10. Run `urbot-verification`, then stop at `CHECKPOINT: VERIFICATION REPORT` with the counts and the Git diff.

## Generated surface

```text
GET  /api/data-enhancements
POST /api/data-enhancements/{id}/generate
POST /api/data-enhancements/{id}/apply?confirm=true
```

There is no force, delete, or status-rewrite endpoint.

## Output

A report with the generated files, batch id, CSV path, status counts, apply result, verification commands, and
the Git diff.

## Do not

- Implement the pipeline in Node.
- Write the graph during generation.
- Apply pending or rejected rows without review.
- Add a UI, admin backend, approval table, force endpoint, or delete endpoint.
- Generate an LLM call or prompt template from this workflow.
- Create a second runtime or domain model.
