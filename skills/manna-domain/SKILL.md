---
name: manna-domain
description: Derive and consolidate domain entities, relations and invariants from agent and tool needs.
version: 0.1.0
mode-default: review
requires:
  - shared/schemas/domain-slice.schema.json
  - shared/patterns/domain-anchored-design.md
  - shared/patterns/java-conventions.md
---

# Manna Domain

## When to use

Immediately after `manna-discovery`, before `manna-graph`, `manna-agent` and `manna-tools`. This is the
design anchor: the agent and tools are designed against this domain slice, not the other way around.

## Inputs

- Capability spec.
- Known external systems and the data they expose (for tool mapping later).
- Existing `.manna/domain.json` and canonical domain types.

## Process

1. **Scope the domain slice**: only what this capability needs, not the whole ontology.
2. **List what crosses a boundary**:
   - the capability's goal and the data it must reason over,
   - expected tool inputs/outputs (preliminary),
   - data read from graph/memory/pipeline.
3. **Derive entities** only for things that:
   - have identity,
   - are persisted or referenced across steps,
   - appear in more than one action/tool.
4. **Reuse before adding**. Search existing types by name and shape in `.manna/domain.json`.
5. **Define fields** with types from the allowed set. Prefer `String`, `long`, `Instant` over clever types.
6. **Define invariants** as executable statements where possible.
7. **Consolidation pass**:
   - merge duplicates,
   - normalize names and types,
   - verify relationship direction,
   - delete unused fields.
8. **Register the canonical model.** The generator writes `.manna/domain.json`. The validator rejects
   the same entity name in two different slice packages and rejects conflicting relation shapes. Do not
   bypass this by renaming a duplicate; consolidate it or move it to a shared domain package.
9. **Stop at `CHECKPOINT: DOMAIN`.** The next step is `manna-graph`, not tools.

## Output

Update the cap spec `domain` section and report:

```text
New entities: Work, Performance
Reused: Composer
Relations: Performance -RECORDING_OF-> Work
Invariants: Performance.workId must resolve; durationSeconds >= 0
Removed: none
CHECKPOINT: DOMAIN
```

## Do not

- Create a table/entity for every noun in the prompt.
- Design the domain from individual tool input/output shapes; tools come after this step.
- Add a field because "it might be useful".
- Model UI state as a domain entity.
- Introduce a new type that duplicates an existing one with a different name.
- Fork an existing entity into a new slice package; the generator will reject it.
