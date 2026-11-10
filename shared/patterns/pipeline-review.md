# Pipeline Review Without an Admin UI

Manna has no admin backend. Data curation uses files, Git and CLI.

## Lifecycle

```
generate → pending
review → approved | rejected
apply → approved rows only
rollback → remove applied ids from the ledger
```

## File layout

```
data/<capability>/
  input/              # raw or imported source data
  candidates.csv      # generated, with status=pending
  applied.json        # ids applied, for rollback
```

## CSV contract

- First row is the header.
- Required columns: `id`, `status`.
- `status` values are configured in the spec (`pending`, `approved`, `rejected`).
- Every row has a stable `id` so re-apply is idempotent.
- Never edit a row in place after apply; create a new candidate id.

## Review

- Reviewers use spreadsheets, editors or Git PRs.
- The workflow must print the exact file path and row count.
- A rejected row stays in the file for audit.
- Applying all rows (`force`) is review-only and must be explicit.

## Apply

- Batch writes with a configured batch size.
- Write the audit ledger before the first write.
- Re-applying the same id is a no-op.
- On failure, report the failed ids and leave the ledger consistent.

## Rollback

`delete-applied-ids` is the default. It deletes only ids present in the ledger and never touches rows
created outside the pipeline.
