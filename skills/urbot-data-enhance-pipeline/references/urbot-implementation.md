# Urbot implementation shape

This reference describes the expected Urbot-side code. It is guidance, not generated output: the pipeline lives
in the bot package, and Manna never opens a database connection.

## Placement

```text
src/main/java/com/embabel/bot/<botname>/data/
├── <Batch>Enhancer.java
├── <Batch>ReviewCsv.java
└── <Batch>Configuration.java

src/main/resources/application-<botname>.properties
data/enhancements/<batch>.csv
src/test/java/com/embabel/bot/<botname>/data/<Batch>EnhancerTest.java
```

Every bean is gated by `@Profile("<botname>")`, and `urbot.bot-packages=com.embabel.bot.<botname>` must list the
package.

## Interface

```java
public interface EnhancementBatch {
    String id();
    Path csvPath();
    List<String> keyColumns();

    default boolean shouldGenerate() { return true; }
    default boolean shouldApply() { return true; }

    void generate() throws IOException;             // writes pending rows only
    ApplyResult apply() throws IOException;         // loads approved rows only

    record ApplyResult(int loaded, int skipped, int failed) {}
}
```

## Generate

- Write the header and one line per candidate with `status=pending`.
- Never write a relationship during generation.
- Skip when the CSV already has data rows; replacing it requires explicit approval.
- Flush periodically so a long run is recoverable.

## Apply

```java
var approved = rows.stream()
        .filter(row -> "approved".equalsIgnoreCase(row.status()))
        .toList();
```

- Filter case-insensitively; `pending` and `rejected` are never written.
- Use `MERGE` or an existence check so re-running is safe.
- Record `source = "llm-generated"` and `reviewedAt = datetime()` on the relationship.
- Return loaded/skipped/failed counts and log them.
- A force apply that ignores `status` is a separate method, prints the rows it would write, and requires
  approval. It is never wired to a scheduled or automatic path.

## Reading and writing CSV

Use a small parser that handles quoted commas and doubled quotes; do not split on commas. Keep the header stable
so a reviewer can rely on column positions and names.

## Configuration

```properties
urbot.data-enhancement.<batch>.enabled=false
urbot.data-enhancement.<batch>.csv=data/enhancements/<batch>.csv
```

Keep the batch disabled by default. Generation and apply are explicit operations, not startup side effects.

## Tests

- Unit-test the status filter and CSV parsing with fixtures; no Neo4j is needed.
- Assert that `pending` and `rejected` rows never reach the write path.
- Assert that a duplicate key is rejected before apply.
- Keep any live apply test under `@Tag("integration")` so `./mvnw test` stays offline.

## Safety

- Generation is a read of the domain plus a local CSV write.
- Apply is an `internal-write` to Neo4j; it requires the review checkpoint.
- Force apply and deletes are `destructive`; they require explicit approval and are never auto-applied.
