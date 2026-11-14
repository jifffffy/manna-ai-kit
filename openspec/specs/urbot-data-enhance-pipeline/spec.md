# urbot-data-enhance-pipeline Specification

## Purpose
Defines a headless, review-gated data enhancement pipeline: generate candidate rows into CSV, review them in
Git, and load only approved rows into the Urbot graph.

## Requirements

### Requirement: Generate produces reviewable candidates

The generated Java enhancer SHALL write candidate rows to a CSV file without writing to the graph. Each
generated row SHALL carry a `status` value of `pending`, a `reason`, and a confidence or strength value where
the relationship type supports it. Generation SHALL be skippable and SHALL NOT overwrite a CSV that already
contains reviewed rows without an explicit, approved regeneration.

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
row `approved` or `rejected`, and to delete a wrong row. The pipeline SHALL NOT require a UI, a review table, or
an admin backend. A profile-scoped REST surface MAY expose generation and apply for headless operation.

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
- **AND** no Urbot UI, review table, or admin backend is added
- **AND** generation and apply may be triggered by a REST call instead

### Requirement: Apply loads approved rows only

The generated Java apply step SHALL filter rows case-insensitively by `status=approved`. Rows with `pending` or
`rejected` status SHALL never be written to the graph. Ignoring the status column (a force apply) SHALL NOT be
exposed by the generated pipeline.

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

The skill SHALL keep its zero-dependency reviewer script as an optional pre-check. The script SHALL parse the
CSV, check the required header columns, validate every `status` value, detect duplicate keys, and print
per-status counts. The generated Java apply SHALL remain the enforcement point.

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

The `urbot-data-enhance-pipeline` workflow SHALL run discovery, generator plan, generation, review validation,
and apply in that order, and SHALL stop at `CHECKPOINT: REVIEW` between generation and apply. The routed skill
sequence SHALL include `urbot-discovery` and `urbot-verification`.

#### Scenario: Apply is unreachable before review

- **WHEN** the workflow reaches the review checkpoint
- **THEN** it waits for the human review outcome
- **AND** it does not run apply before the checkpoint is approved

#### Scenario: Verification closes the flow

- **WHEN** apply completes
- **THEN** the workflow reports the counts and the verification commands
- **AND** hands the CSV and Java changes back as a Git diff

### Requirement: Manna generates the Java pipeline

The `urbot-data-enhance-pipeline` skill SHALL generate the pipeline as Java code in the target bot package. A
plan SHALL list the files and require approval before writing. The generated code SHALL include the batch
lifecycle, the CSV reader/writer, the pipeline service, the batch enhancer, a profile-scoped REST controller,
and a test.

The generator SHALL read the bot's `domain/` package to resolve the source and target `NamedEntity` types and
their Neo4j labels, and SHALL generate the CSV header, key columns, typed record, and Cypher from that domain.
Generation SHALL be pattern-based: no LLM call and no prompt template.

#### Scenario: The generator plans before writing

- **WHEN** the generator runs without `--approve`
- **THEN** it reports the batch, source, target, relationship, CSV path, and every file it would write
- **AND** it writes nothing

#### Scenario: The generated pipeline is complete

- **WHEN** the generator runs with `--approve`
- **THEN** the bot package contains the batch lifecycle, CSV helper, pipeline service, enhancer, REST
  controller, and test
- **AND** every generated bean is gated by `@Profile("<bot>")`

#### Scenario: Parsing follows the domain

- **WHEN** the source and target types are resolved from the domain package
- **THEN** the generated CSV header and listener use their IDs
- **AND** the generated Cypher matches their labels and relationship name
- **AND** a missing type or ID is reported instead of guessed

#### Scenario: Pattern generation only

- **WHEN** the enhancer is generated
- **THEN** candidate generation is an explicit pattern method with no LLM call
- **AND** the method is the documented extension point for domain rules
