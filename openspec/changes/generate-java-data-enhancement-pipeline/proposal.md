# Proposal

## Why

The current `urbot-data-enhance-pipeline` skill treats a Node CSV validator plus documentation as the pipeline.
That is the wrong boundary. In Impromptu the pipeline is a Java feature: an `Enhancer` lifecycle, a pipeline
service that drives generation, CSV writers, approved-only loaders, idempotent Cypher, and counts. Manna's job is
to generate that Java code inside the Urbot bot, adapted to the bot's domain types, not to reimplement the
pipeline in Node.

## What Changes

- **Redefine the skill as a Java pipeline generator.** Add `scripts/apply.mjs` with the same plan → approve →
  apply contract as `urbot-profile`, `urbot-tool`, and `urbot-domain-design`.
- **Generate the whole Java pipeline** in `com.embabel.bot.<bot>.data`:
  - `EnhancementBatch` — the generate/apply lifecycle;
  - `ReviewCsv` — quoted CSV parsing/writing, statuses, duplicate keys;
  - `EnhancementPipeline` — discovers batches, runs generate/apply, reports counts;
  - `<Batch>Enhancer` — pattern-based candidate generation and approved-only apply;
  - `DataEnhancementController` — headless REST endpoints;
  - `<Batch>EnhancerTest` — CSV round-trip, approved filter, duplicate rejection, no Neo4j.
- **Only generate pattern-based generation.** No LLM call and no prompt template; the generated
  `candidateFor(...)` method is the explicit extension point for domain rules.
- **Adapt parsing and persistence to the domain.** Read the bot's `domain/` package to resolve the source and
  target `NamedEntity` types, IDs, and Neo4j labels; generate the CSV header, key columns, typed record, and
  Cypher accordingly.
- **Add headless REST endpoints** under `/api/data-enhancements`: list, generate, apply. They are
  profile-scoped, disabled by default, and have no force or delete operation. Apply requires `confirm=true`.
- **Reframe the Node validator** as an optional pre-apply check, not the pipeline. The Java apply enforces the
  same approved-only rule.
- **BREAKING**: the skill no longer claims the Node validator is the pipeline; the generator writes Java files
  and the pipeline lives in Urbot.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `urbot-data-enhance-pipeline`: the pipeline is generated Java code; parsing and Cypher are domain-aware;
  generation is pattern-based; a profile-scoped REST surface is allowed; the CSV/Git review gate remains.

## Impact

- `skills/urbot-data-enhance-pipeline/SKILL.md`, `references/csv-contract.md`,
  `references/urbot-implementation.md`, new `scripts/apply.mjs`
- `workflows/urbot-data-enhance-pipeline.md`
- `scripts/dev/test-data-enhance-pipeline.mjs` (generator fixtures and generated-content checks)
- `package.json`, `skills.lock`
- `openspec/specs/urbot-data-enhance-pipeline/spec.md`
- **Out of scope**: LLM-based generation, a UI or admin backend, force/delete endpoints, changing the CSV review
  format, and any second runtime or domain model.
