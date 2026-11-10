---
name: manna-discovery
description: Turn a domain and requirement into a testable capability spec before any code is written.
version: 0.1.0
mode-default: suggest
requires:
  - shared/schemas/capability-spec.schema.json
  - shared/schemas/project-spec.schema.json
  - shared/patterns/domain-anchored-design.md
  - policies/approval-checkpoints.md
---

# Manna Discovery

## When to use

- A new project.
- A new capability inside an existing project.
- A vague request that needs acceptance criteria.

## Inputs

- Domain and user need.
- Constraints: latency, data sources, auth, side effects, compliance.
- Existing project spec, `.manna/domain.json` and canonical entities if any.

## Process

1. **Restate the brief** as:
   - Context
   - Objective (one)
   - Inputs
   - Constraints
   - Acceptance criteria (measurable)
   - Non-goals
2. **Ask at most three questions** if a decision materially changes the design. Otherwise choose a
   reasonable default and record it as an assumption.
3. **Draft the capability spec** using `shared/schemas/capability-spec.schema.json`, in design order:
   - `id` (`F-001`), `name`, `className`, `package`
   - `capability`
   - `domain` (the minimal subgraph this capability needs)
   - `graph`, `memory`, `pipeline`: `enabled` true/false with a reason
   - `agent` (mode, goal, confirmations)
   - `tools` (names and preliminary side effects, mapped to domain types)
   - `transport`
   - `evals` (acceptance → assertions)
4. **Set the project design mode.** For a new project, `project.designMode` is `graph-first` by default.
   Use `capability-first` only for tool-only agents with no graph model.
5. **Check the tool surface** for danger early: any external write or destructive action is flagged now.
6. **Stop at `CHECKPOINT: SPEC`.**

## Quality bar for acceptance criteria

Good:
- "Returns at least one structured `Recording` with `source`, `workId`, and `url`."
- "Does not call `createPlaylist` without a confirmation."
- "Re-applying the same CSV row does not create a duplicate."

Bad:
- "Works well."
- "Looks good."
- "Fast."

## Output

`.manna/features/<id>.spec.json` plus a short report:

```text
Capability: F-001
Design mode: graph-first
Objective: ...
Verticals: graph=on memory=on pipeline=off
Danger flags: external-write createPlaylist
Assumptions: ...
Open questions: ...
CHECKPOINT: SPEC
```

## Do not

- Finalize entities or Neo4j labels in this skill; `manna-domain` and `manna-graph` own that.
- Design tools before the domain slice; tools must map to canonical types.
- Add a vertical "because the template has it".
- Write code.
- Accept an unmeasurable acceptance criterion.
