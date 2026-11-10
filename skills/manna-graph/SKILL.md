---
name: manna-graph
description: Design Neo4j labels, relationships, constraints, queries and migrations for a capability slice.
version: 0.1.0
mode-default: review
requires:
  - shared/schemas/graph-schema.schema.json
  - shared/patterns/neo4j-conventions.md
  - policies/approval-checkpoints.md
---

# Manna Graph

## When to use

Immediately after `manna-domain` and before `manna-agent` / `manna-tools`. The relation contract defines
the tool boundaries; tools must not invent graph shapes.

- A capability needs persistence or relationship queries.
- An existing graph schema changes.

## Inputs

- Capability spec `domain` and `graph`.
- Query patterns the agent/tools need.
- Existing labels and relationships.

## Process

1. **Decide whether graph is justified.** If a flat store or live tool is enough, set
   `graph.enabled: false` and record why.
2. **Define nodes** from consolidated domain entities. Add only queried/persisted fields.
3. **Define the relation contract**: relationship type, `from`, `to`, direction, cardinality, and the
   query that justifies it. Use verbs, not navigation names. A relation with no query or invariant does
   not enter the model.
4. **Define constraints/indexes**:
   - unique `id` for every label,
   - index lookup properties,
   - no destructive constraint changes without rollback.
5. **Define read queries**:
   - parameterized,
   - bounded with `LIMIT`,
   - explicit projections.
6. **Define migration**:
   - additive by default,
   - dry-run for backfill,
   - rollback statement.
7. **Stop at `CHECKPOINT: GRAPH`.**

## Output

`graph` section plus `.manna/features/<id>.graph.json`, `src/main/resources/cypher/schema.cypher`, and
the relation entries in `.manna/domain.json`.

```text
Graph: enabled, read_only=true
Labels: Work(id,name), Performance(id,workId,durationSeconds)
Rels: Performance -RECORDING_OF-> Work
Constraints: work_id, performance_id
Migration: additive
CHECKPOINT: GRAPH
```

## Do not

- Let an LLM generate write Cypher.
- Add a label with no query or persistence need.
- Change a constraint destructively without a snapshot and rollback.
- Store unbounded arrays on nodes.
