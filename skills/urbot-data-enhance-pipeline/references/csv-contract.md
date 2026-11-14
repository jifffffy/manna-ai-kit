# CSV review contract

The CSV is the review artifact and Git is the audit trail. One file represents one batch.

## Required columns

| Column | Required | Meaning |
|--------|----------|---------|
| `status` | yes | `pending`, `approved`, or `rejected` (case-insensitive) |
| `reason` | yes | Human-readable justification; quote it when it contains a comma |
| `confidence` | for claims | 0–1 certainty that the row is correct |
| `strength` | for relationships | 0–1 significance of the relationship |
| key columns | yes | Identify the row, for example `from` and `to`, or `id` |

A batch declares its key columns, for example:

```text
from,to,reason,strength,confidence,status
ludwig-van-beethoven-1770,johannes-brahms-1833,"Brahms studied Beethoven's symphonies",0.90,0.95,pending
```

## Status semantics

- `pending` — generated, not reviewed. Never applied.
- `approved` — reviewed and accepted. The only status that may be applied.
- `rejected` — reviewed and declined. Kept for the record; never applied.

Deleting a wrong row is also allowed; `rejected` is for rows worth keeping in the audit trail.

## Key columns

The key columns form the identity of a row and are used to detect duplicates. They are declared per batch and
must be present in the header. A duplicate key is a validation error, because applying the same row twice is
never intended.

## Quoting

- Quote a field that contains a comma, a quote, or a newline.
- Escape an embedded quote by doubling it (`""`).
- The header row is mandatory; an empty CSV is not reviewable.

## Audit fields

The CSV itself keeps `reason` and the confidence/strength value. The Urbot apply step records `source` and
`reviewedAt` on the written relationship or record so the graph shows that the data was reviewed.

## Validation rules

`scripts/review-csv.mjs` enforces:

- the header exists and contains `status`, `reason`, and every declared key column;
- every row has a known status;
- every `reason` is non-empty;
- every `confidence`/`strength` value is a number between 0 and 1;
- no two rows share the same key;
- in `--mode apply`, no row is `pending`, at least one row is `approved`, and no row is invalid.
