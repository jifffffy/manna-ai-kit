# Neo4j Conventions

## Labels

- PascalCase, singular: `Work`, `Performance`, `Venue`.
- Every persisted node has a stable `id` string and `name` where a human label exists.
- Add `createdAt` / `updatedAt` as `Instant` when the capability needs ordering or audit.

## Relationships

- SCREAMING_SNAKE_CASE verbs: `RECORDING_OF`, `PERFORMED_BY`, `PART_OF`.
- Direction expresses ownership or derivation, not navigation convenience.
- Declare cardinality in the spec. Do not infer it from a list field.
- Avoid bidirectional duplicates; pick one direction and query with `<-[]-` when needed.

## Constraints and indexes

- Unique constraint on every `id`.
- Index every property used in a lookup, especially `name` and external IDs.
- Constraint changes are review-only; destructive migrations are never autofix.

## Query policy

- Read tools use parameterized Cypher only.
- If an LLM generates Cypher, bind it to a `DataDictionary` and reject unknown labels, properties and
  relationship types. Never allow generated writes.
- Cap result size in the query (`LIMIT`) and in the tool contract.
- Prefer explicit projections over `RETURN n` for large nodes.

## Migrations

- Default to additive: new labels/relationships/properties.
- Backfills must be idempotent and have a dry-run mode.
- Breaking changes require a written rollback and a data snapshot.
- Record applied migrations in `.manna/graph-migrations.json`.

## Example

```cypher
CREATE CONSTRAINT work_id IF NOT EXISTS
FOR (w:Work) REQUIRE w.id IS UNIQUE;

CREATE INDEX work_name IF NOT EXISTS
FOR (w:Work) ON (w.name);
```
