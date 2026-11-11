---
name: manna-pipeline
description: Design file-based ingest, enrichment, human review and idempotent apply without an admin UI.
version: 0.1.0
mode-default: review
requires:
  - shared/patterns/pipeline-review.md
  - policies/approval-checkpoints.md
---

# Manna Pipeline

## When to use

After the domain slice and graph schema exist, and before transport. The pipeline feeds the anchored
subgraph; it does not invent its own schema.

- Domain data is generated, imported, enriched or curated over time.
- A human must approve LLM-generated facts before they enter the graph.

## Inputs

- Capability spec, source format, target entities.
- Review workflow constraints (who reviews, where).

## Process

1. **Map columns to canonical entities and relations** in `.manna/domain.json`. If a column needs a new
   entity or relation, reopen `CHECKPOINT: DOMAIN` or `CHECKPOINT: GRAPH`.
2. **Define the file contract**:
   - format (`csv`/`jsonl`),
   - required columns including `id` and `status`,
   - stable id rule.
3. **Define the lifecycle**: `pending` → `approved`/`rejected` → applied.
4. **Define apply**:
   - approved-only by default,
   - idempotent, batched,
   - ledger path for rollback.
5. **Define rollback**: delete applied ids only.
6. **Stop at `CHECKPOINT: PIPELINE`.**
7. **Generate the stub** and a sample candidate file.
8. **Test**:
   - apply twice → no duplicates,
   - rejected rows not applied,
   - rollback removes only ledger ids.

## Output

`pipeline` section plus `data/<capability>/candidates.csv` and a CLI/API apply command.

```text
Pipeline: enabled, csv-git
Columns: id, status, source, relationship, confidence
Apply: approved-only, batch=100, ledger=.manna/pipeline-applied.json
Rollback: delete-applied-ids
CHECKPOINT: PIPELINE
```

## Do not

- Add a review UI or admin endpoint.
- Apply all rows without an explicit review checkpoint.
- Mutate rows after apply.
- Use a non-unique id.
