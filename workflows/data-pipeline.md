# Workflow: Data Pipeline

**Goal:** add a file-based ingest / enrich / review / apply pipeline without an admin UI.

## Steps

1. **Define the source** and the destination entities.
2. **Choose format** (`csv` or `jsonl`) and required columns, including `id` and `status`.
3. **Define the review mode**: `csv-git` or `jsonl-git`.
4. **Define apply**: `approved-only`, idempotent, batch size, ledger path.
5. **Define rollback**: `delete-applied-ids` by default.
6. **Stop at `CHECKPOINT: PIPELINE`.**
7. **Generate** the pipeline stubs and the candidate file.
8. **Review** a sample manually; verify status transitions.
9. **Apply** in dry-run first, then for real.
10. **Test** idempotency: apply twice, expect no duplicates.

## Gates
- Every row has a stable id.
- Re-apply is a no-op.
- Rejected rows remain for audit.
- Rollback only touches ledger ids.
- No UI or admin endpoint is introduced.

## Do not
- Apply `all` rows without a review checkpoint.
- Mutate rows in place after apply.
- Store secrets or PII in candidate files.
