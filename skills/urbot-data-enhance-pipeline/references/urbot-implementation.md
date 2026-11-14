# Generated Java pipeline

The generator writes this shape into `com.embabel.bot.<bot>.data`. It is the pipeline; Manna does not run it
and does not open a Neo4j connection.

## Files

| File | Responsibility |
|---|---|
| `EnhancementBatch.java` | `id`, `csvPath`, `keyColumns`, `shouldGenerate`, `generate`, `shouldApply`, `apply`, `ApplyResult` |
| `ReviewCsv.java` | Quoted CSV read/write, duplicate-key detection, status counts |
| `EnhancementPipeline.java` | `@Service @Profile`, discovers batches, `generate(id)`, `apply(id)`, `infos()` |
| `<Batch>Enhancer.java` | `@Component @Profile`, domain iteration, pattern hook, pending CSV, approved-only apply |
| `DataEnhancementController.java` | `@RestController`, profile-scoped, property-gated, list/generate/apply |
| `<Batch>EnhancerTest.java` | CSV round-trip, duplicate rejection, status counts, no Neo4j |

## Lifecycle

```java
public interface EnhancementBatch {
    String id();
    Path csvPath();
    List<String> keyColumns();
    default boolean shouldGenerate() { return true; }
    default boolean shouldApply() { return true; }
    void generate() throws IOException;
    ApplyResult apply() throws IOException;
    record ApplyResult(int loaded, int skipped, int failed) {}
}
```

- `generate()` writes the header plus `status=pending` rows. It skips when the CSV already has rows.
- `apply()` filters case-insensitively by `status=approved`, skips existing relationships, writes
  `source='generated'` and `reviewedAt`, and returns counts.
- `shouldApply()` skips when the relationship type already has data.

## Pattern hook

```java
private List<Candidate> candidatesFor(<Source> source, List<<Target>> targets) {
    // --match contains: name containment
    // --match none: TODO, returns List.of()
}
```

This method is the only place to add domain rules. It must return candidates with the configured properties.
The generator never emits an LLM call.

## Persistence

- Load endpoints through `NamedEntityDataRepository.findAll(<Type>.class)`.
- Existence check with a `MATCH ... RETURN count(r)` query.
- Write with `MERGE` and `SET`, binding `sourceId`, `targetId`, and the configured properties.
- Labels default to the simple domain type name and can be overridden with `--source-label` /
  `--target-label`.

## Configuration

```properties
urbot.data-enhancement.enabled=false
urbot.data-enhancement.<batch>.csv=data/enhancements/<batch>.csv
```

The controller is absent unless `urbot.data-enhancement.enabled=true`. The pipeline bean still exists for tests
and direct injection.

## REST

```text
GET  /api/data-enhancements
POST /api/data-enhancements/{id}/generate
POST /api/data-enhancements/{id}/apply?confirm=true
```

No force or delete. The endpoints sit behind the existing Spring Security configuration.

## Tests

`<Batch>EnhancerTest` covers the CSV helper only, so it runs without Neo4j. The generated apply path should be
covered by a project test tagged `@Tag("integration")` when a live database is available.
