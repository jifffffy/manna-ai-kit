---
name: urbot-data-enhance-pipeline
description: Generate the Java data-enhancement pipeline for a Urbot bot, with CSV review and approved-only apply.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - policies/approval-checkpoints.md
  - policies/tool-safety.md
---

# Urbot Data Enhancement Pipeline

## When to use

A Urbot bot needs to enrich its graph in bulk: relationship inference, classification, instrumentation, or any
pattern-derived data that a human must sign off before it becomes durable knowledge.

The pipeline is Java code inside the bot. This skill generates that code from the bot's domain types; it does
not run a Node-side pipeline.

## Inputs

- The target Urbot project and bot profile.
- The batch name and the graph relationship it produces.
- The source and target domain types (they must extend `NamedEntity`).
- The Neo4j relationship type and, optionally, label overrides.
- The CSV path, key columns, and extra review properties.
- The pattern mode: `contains` or `none`.

## Process

1. **Discover.** Run `urbot-discovery` to confirm the bot package, domain types, and Neo4j access path.
2. **Plan the Java pipeline.** Run the generator without `--approve`. It reads the domain package, resolves the
   source and target types, and lists every file it will write.
3. **Approve.** Re-run with `--approve`. The generator writes the batch lifecycle, CSV helper, pipeline
   service, enhancer, REST controller, and test into `com.embabel.bot.<bot>.data`.
4. **Generate candidates.** Call the generate path (REST or the Spring bean). It writes `status=pending` rows
   and never writes the graph.
5. **Stop at `CHECKPOINT: REVIEW`.** A human reviews the CSV, sets `approved` or `rejected`, deletes wrong rows,
   and commits. Optionally run `scripts/review-csv.mjs` as a pre-check.
6. **Apply.** Call the apply path with confirmation. It writes only approved rows, skips existing
   relationships, records `source` and `reviewedAt`, and reports loaded/skipped/failed counts.
7. **Verify.** Run `urbot-verification`: compile, contract tests, and a spot check of the applied counts.

## Generator

```bash
node skills/urbot-data-enhance-pipeline/scripts/apply.mjs \
  --project <dir> \
  --bot <bot> \
  --name <batch> \
  --source <SourceType> \
  --target <TargetType> \
  --relationship <REL_TYPE> \
  [--match contains|none] \
  [--csv data/enhancements/<batch>.csv] \
  [--properties reason,confidence] \
  [--source-label <Label>] \
  [--target-label <Label>] \
  [--approve] [--force]
```

- `--key` defaults to `sourceId,targetId` and must name exactly those two columns.
- `--properties` defaults to `reason,confidence`; `strength` and `divergence` are also supported. `reason` is
  required.
- Without `--approve` the generator writes nothing and returns the plan.
- Existing generated files are reported; `--force` overwrites them. The properties file is appended to, never
  rewritten.
- `--match contains` generates a deterministic `contains` rule over `NamedEntity.getName()`;
  `--match none` generates a `TODO` hook that returns no candidates.
- No LLM call and no prompt template is generated.

## Generated files

```text
src/main/java/com/embabel/bot/<bot>/data/
├── EnhancementBatch.java          # generate/apply lifecycle
├── ReviewCsv.java                 # quoted CSV, duplicate keys, status counts
├── EnhancementPipeline.java       # discovers batches, generate/apply
├── <Batch>Enhancer.java           # domain iteration, pattern hook, approved-only apply
└── DataEnhancementController.java # REST list/generate/apply

src/test/java/com/embabel/bot/<bot>/data/<Batch>EnhancerTest.java
```

The controller is profile-scoped and disabled by default. Enable it with
`urbot.data-enhancement.enabled=true`.

## REST surface

```text
GET  /api/data-enhancements
POST /api/data-enhancements/{id}/generate
POST /api/data-enhancements/{id}/apply?confirm=true
```

There is no force or delete endpoint. Apply without `confirm=true` returns 400. The existing Spring Security
configuration protects the endpoints.

## Checkpoints

- `CHECKPOINT: REVIEW` — required between generation and apply.
- `CHECKPOINT: APPLY` — required before enabling the REST controller or running apply.
- `CHECKPOINT: VERIFICATION REPORT` — closes the flow.

## Output

A report with the generated files, batch id, CSV path, status counts, apply result, verification commands, and
the Git diff.

## Do not

- Implement the pipeline in Node or claim the validator is the pipeline.
- Write the graph during generation.
- Apply pending or rejected rows.
- Add a force or delete endpoint, a UI, an admin backend, or a review table.
- Auto-approve rows or let the agent review its own output.
- Generate LLM calls or prompt templates from this skill.
- Create a second runtime or domain model.

## References

- `references/csv-contract.md` — columns, statuses, keys, and quoting.
- `references/urbot-implementation.md` — the generated Java contract and extension points.
