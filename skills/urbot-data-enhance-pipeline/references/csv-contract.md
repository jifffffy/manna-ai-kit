# CSV review contract

The CSV is the human review artifact and Git is the audit trail. The generated Java pipeline is the
enforcement point; `scripts/review-csv.mjs` is an optional pre-check.

## Columns

The generator writes the header from the batch definition:

```text
sourceId,targetId,reason,confidence,status
```

| Column | Source | Meaning |
|---|---|---|
| `sourceId` | source `NamedEntity.getId()` | Source endpoint |
| `targetId` | target `NamedEntity.getId()` | Target endpoint |
| `reason` | pattern | Why the candidate exists |
| `confidence` | pattern | 0–1 certainty; `strength`/`divergence` are also supported |
| `status` | review | `pending`, `approved`, or `rejected` |

`status` is always last. `reason` is required. Numeric properties must be between 0 and 1.

## Status semantics

- `pending` — generated, not reviewed. Never applied.
- `approved` — reviewed and accepted. The only status that may be applied.
- `rejected` — reviewed and declined. Kept for the record; never applied.

Deleting a wrong row is also allowed.

## Keys

The key columns default to `sourceId,targetId`. A duplicate key is a validation error: the same relationship
must not appear twice in one batch.

## Quoting

- Quote a field that contains a comma, a quote, or a newline.
- Escape a quote by doubling it (`""`).
- The header row is mandatory.

## Audit

The CSV keeps `reason` and the confidence/strength values. Apply records `source='generated'` and
`reviewedAt=datetime()` on the relationship.

## Optional pre-check

```bash
node skills/urbot-data-enhance-pipeline/scripts/review-csv.mjs \
  --csv data/enhancements/<batch>.csv \
  --key sourceId,targetId \
  --mode apply
```

The script checks the header, statuses, numeric ranges, and duplicate keys. In apply mode it fails while any row
is `pending`, when nothing is approved, or when a row is invalid. The generated Java apply still filters
`approved` itself.
