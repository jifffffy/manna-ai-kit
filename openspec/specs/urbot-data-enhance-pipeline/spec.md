# urbot-data-enhance-pipeline Specification

## Purpose
Defines a headless, review-gated data enhancement pipeline: generate candidate rows into CSV, review them in
Git, and load only approved rows into the Urbot graph.

## Requirements

### Requirement: Generate produces reviewable candidates

The pipeline SHALL write candidate rows to a CSV file without writing to the graph. Each generated row SHALL
carry a `status` value of `pending`, a `reason`, and a confidence or strength value where the relationship type
supports it. Generation SHALL be skippable and SHALL NOT overwrite a CSV that already contains reviewed rows
without an explicit, approved regeneration.

#### Scenario: Generation writes pending rows only

- **WHEN** the pipeline generates a batch
- **THEN** the output CSV contains a header and rows with `status=pending`
- **AND** no graph relationship is created or updated

#### Scenario: An existing reviewed CSV is not silently replaced

- **WHEN** the output CSV already contains rows
- **THEN** generation skips by default
- **AND** replacing it requires an explicit approved regeneration

### Requirement: Human review happens in CSV and Git

The CSV file SHALL be the review surface and Git SHALL be the audit trail. A reviewer SHALL be able to mark a
row `approved` or `rejected`, and to delete a wrong row. The pipeline SHALL NOT require a UI, an admin backend,
or a database review table.

#### Scenario: A reviewer approves rows

- **WHEN** a reviewer changes `status` from `pending` to `approved`
- **THEN** the approved row is eligible for apply
- **AND** the change is visible as a Git diff

#### Scenario: A reviewer rejects a row

- **WHEN** a reviewer sets `status=rejected`
- **THEN** the row remains in the file for the record
- **AND** it is never applied

#### Scenario: No UI is required

- **WHEN** review is performed
- **THEN** any spreadsheet or text editor plus Git is sufficient
- **AND** no Urbot UI, admin endpoint, or approval table is added

### Requirement: Apply loads approved rows only

The apply step SHALL filter rows case-insensitively by `status=approved`. Rows with `pending` or `rejected`
status SHALL never be written to the graph. Ignoring the status column (a force apply) SHALL be a separate
destructive action, SHALL report what it would write, and SHALL require explicit approval.

#### Scenario: Only approved rows are written

- **WHEN** apply runs on a CSV containing pending, approved, and rejected rows
- **THEN** only the approved rows are written
- **AND** the result reports loaded, skipped, and failed counts

#### Scenario: Pending rows block a normal apply

- **WHEN** any row is still `pending`
- **THEN** the normal apply path does not write that row
- **AND** the report names the pending count

#### Scenario: Force apply is destructive

- **WHEN** a force apply ignores the status column
- **THEN** it is treated as a destructive action
- **AND** it requires explicit approval and is never auto-applied

### Requirement: Apply is idempotent and auditable

Apply SHALL skip a relationship that already exists rather than duplicate it, and SHALL record the review
outcome on the written data, including the source and the review time. Re-running apply against the same CSV
SHALL be safe.

#### Scenario: Re-running apply is safe

- **WHEN** apply runs twice against the same CSV
- **THEN** the second run loads nothing new
- **AND** it reports the skipped rows

#### Scenario: Written data records provenance

- **WHEN** an approved row is written
- **THEN** the relationship or record records its source and review timestamp
- **AND** the original reason and confidence remain available

### Requirement: A reviewer script validates the CSV

The skill SHALL provide a zero-dependency reviewer script that parses the CSV, checks the required header
columns, validates every `status` value, detects duplicate keys, and prints per-status counts. In apply mode it
SHALL fail when any row is still `pending`, when no row is `approved`, or when any row is invalid.

#### Scenario: A clean reviewed CSV passes

- **WHEN** the script runs in apply mode on a CSV with approved rows and no pending rows
- **THEN** it exits successfully
- **AND** it prints the approved, pending, and rejected counts

#### Scenario: Pending rows fail the apply gate

- **WHEN** the script runs in apply mode while a row is `pending`
- **THEN** it exits non-zero
- **AND** it reports the pending row numbers

#### Scenario: Malformed rows fail validation

- **WHEN** a row has an unknown status, a missing required column, or a duplicate key
- **THEN** the script exits non-zero
- **AND** it names the offending row

### Requirement: The workflow gates apply on review

The `urbot-data-enhance-pipeline` workflow SHALL run discovery, generate, review validation, and apply in that
order, and SHALL stop at `CHECKPOINT: REVIEW` between generation and apply. The routed skill sequence SHALL
include `urbot-discovery` and `urbot-verification`.

#### Scenario: Apply is unreachable before review

- **WHEN** the workflow reaches the review checkpoint
- **THEN** it waits for the human review outcome
- **AND** it does not run apply before the checkpoint is approved

#### Scenario: Verification closes the flow

- **WHEN** apply completes
- **THEN** the workflow reports the counts and the verification commands
- **AND** hands the CSV and code changes back as a Git diff
