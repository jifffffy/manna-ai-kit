# Design

## Context

See `proposal.md` — Why. Impromptu's `data/pipeline` package is the reference:

- `Enhancer` defines `generate`, `shouldGenerate`, `apply(boolean ignoreStatus)`, `shouldApply`, and an
  `ApplyResult`;
- `ComposerEnhancementPipeline` discovers enhancers, drives generation, commits progress, and applies;
- each enhancer writes a CSV and loads approved rows with `MERGE`/existence checks;
- the REST controller and Vaadin panel trigger generate/apply.

Urbot is headless. The pipeline must live in the bot package, and Manna must generate it rather than document a
Node-side gate. The current skill's `scripts/review-csv.mjs` becomes an optional pre-check only.

`NamedEntity` (Embabel 1.5.4) exposes `getId()`, `getName()`, `getDescription()`, and `labels()`, so generated
code can use stable IDs and names without reflection.

## Goals / Non-Goals

**Goals:**

- Generate a complete, compilable Java pipeline in `com.embabel.bot.<bot>.data`.
- Adapt the CSV schema, typed record, and Cypher to the bot's domain types.
- Keep generation deterministic and pattern-based.
- Keep the CSV/Git human review gate.
- Expose headless REST generate/apply, disabled by default and profile-scoped.

**Non-Goals:**

- LLM calls, prompt templates, or generated business heuristics beyond the chosen pattern.
- A UI, admin backend, review table, force apply, or delete endpoint.
- Changing the CSV review format (Markdown is evaluated separately).
- Putting a Neo4j driver or pipeline runtime in Manna.

## Generator contract

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
  [--key sourceId,targetId] \
  [--properties reason,confidence] \
  [--source-label <Label>] \
  [--target-label <Label>] \
  [--approve] [--force]
```

- `--source` and `--target` are simple type names resolved in
  `src/main/java/com/embabel/bot/<bot>/domain/`.
- A missing type, a type that is not a `NamedEntity`, or a missing `application-<bot>.properties` fails before
  writing.
- Without `--approve`, output is a plan with the batch, key columns, CSV path, and every file.
- Existing files are reported; `--force` overwrites. The properties file is appended to, never rewritten.

## Domain inspection

1. Validate `pom.xml` and `src/main/java/com/embabel/urbot/`.
2. Resolve the bot directory and `application-<bot>.properties`.
3. Scan `domain/**/*.java` for `interface <Name> ... extends ... NamedEntity` (directly or through a local
   interface). Record the simple name and package.
4. Fail if the source or target is absent, or if it does not expose `getId()`/`getName()` through the
   `NamedEntity` contract.
5. Neo4j labels default to the simple type name, with `--source-label`/`--target-label` overrides.

## CSV schema

Default columns, derived from the domain and the requested properties:

```text
sourceId,targetId,reason,confidence,status
```

- `sourceId`/`targetId` are the `NamedEntity` ids.
- `reason` and `confidence` come from `--properties`; `strength`/`divergence` are allowed.
- `status` is always last.
- `--key` defaults to `sourceId,targetId`.

The generated `ReviewCsv` handles quoted fields, doubled quotes, duplicate keys, and status validation. The
batch's typed record mirrors the columns.

## Generated files

| File | Responsibility |
|---|---|
| `data/EnhancementBatch.java` | `id`, `csvPath`, `keyColumns`, `shouldGenerate`, `generate`, `shouldApply`, `apply`, `ApplyResult` |
| `data/ReviewCsv.java` | CSV read/write, quoting, status parsing, duplicate-key detection |
| `data/EnhancementPipeline.java` | `@Service @Profile`, discovers `List<EnhancementBatch>`, `generate(id)`, `apply(id)`, `infos()` |
| `data/<Batch>Enhancer.java` | `@Component @Profile`, domain iteration, `candidatesFor(...)` pattern hook, pending CSV, approved-only apply |
| `data/DataEnhancementController.java` | `@RestController`, profile-scoped, property-gated, list/generate/apply |
| `test/.../<Batch>EnhancerTest.java` | CSV round-trip, duplicate rejection, approved-only filter, no Neo4j |

The enhancer reads the CSV path from
`@Value("${urbot.data-enhancement.<batch>.csv:data/enhancements/<batch>.csv}")`. The controller is enabled by
`urbot.data-enhancement.enabled=true` (default `false`).

## Pattern generation

`--match contains` generates:

```java
private List<Candidate> candidatesFor(SourceType source, List<TargetType> targets) {
    var sourceName = source.getName().toLowerCase(Locale.ROOT);
    return targets.stream()
            .filter(target -> sourceName.contains(target.getName().toLowerCase(Locale.ROOT)))
            .map(target -> new Candidate(source.getId(), target.getId(),
                    "Name contains " + target.getName(), 0.5))
            .toList();
}
```

`--match none` generates the same method with a `// TODO: implement the domain pattern` body returning an empty
list. The method is the documented extension point; no LLM is generated.

## Apply

For each approved row:

1. Skip when the relationship already exists (count query).
2. Otherwise `MATCH` the source and target by id and `MERGE` the relationship with `reason`, confidence
   properties, `source='generated'`, and `reviewedAt=datetime()`.
3. Count loaded/skipped/failed; `failed` covers a missing endpoint or a query error.

## REST surface

```text
GET  /api/data-enhancements                  → batch id, CSV path, status counts
POST /api/data-enhancements/{id}/generate    → generate pending rows
POST /api/data-enhancements/{id}/apply?confirm=true → apply approved rows
```

- `@Profile("<bot>")` and `@ConditionalOnProperty(name="urbot.data-enhancement.enabled", havingValue="true")`.
- Apply without `confirm=true` returns 400 and writes nothing.
- No force, delete, or status-rewrite endpoint.
- The existing Spring Security configuration protects the endpoints; no new auth mechanism is generated.

## Safety

- Generation writes only the CSV.
- Apply is an `internal-write` and requires the review checkpoint; the REST confirmation is a second gate.
- The generator never adds a destructive endpoint.
- Manna still ships no Neo4j driver; it only writes Java source and properties.

## Tests

`scripts/dev/test-data-enhance-pipeline.mjs` keeps the validator checks and adds generator fixtures:

- plan without `--approve` writes nothing and lists the files;
- `--approve` writes the interface, CSV helper, pipeline, enhancer, controller, and test;
- the CSV header, keys, labels, relationship, and `@Profile` reflect the fixture domain;
- `--match none` emits the TODO hook; `--match contains` emits the contains rule;
- missing source/target, a non-`NamedEntity` type, and a missing properties file fail before writing;
- `--force` overwrites; existing files are reported otherwise;
- an optional real-checkout run compiles the generated Java with `./mvnw -q -DskipTests compile`.

## Risks / Trade-offs

- **Generated pattern is weak** → The `contains` rule is a starting point and is clearly marked; `none` leaves a
  TODO. The review gate still protects the graph.
- **Domain scan misses an indirect interface** → The scanner follows local `extends` chains and fails closed.
- **Label mismatch with DICE** → Labels default to the simple type name and can be overridden; a wrong label
  yields zero matches, not corrupted data.
- **REST apply is powerful** → Disabled by default, profile-scoped, behind Spring Security, and requires
  `confirm=true`; no force or delete.
- **Generated Java drifts from Urbot APIs** → The generator uses only `NamedEntity`, `NamedEntityDataRepository`,
  and `PersistenceManager`; the optional compile test catches drift.
- **Two CSV readers (Node validator and Java)** → The Java apply is the enforcement point; the Node script is a
  pre-check with shared fixtures.

## Migration Plan

1. Rewrite `SKILL.md` and references around the generator.
2. Implement `scripts/apply.mjs` with plan/approve, domain inspection, and templates.
3. Update the workflow, tests, and `package.json`.
4. Regenerate `skills.lock`; run the full suite.
5. Roll back by restoring the previous documentation-only skill.

## Open Questions

None. The pattern is deterministic, the REST surface is profile-scoped, and the review gate is unchanged.
