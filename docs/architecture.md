# Architecture

## Positioning

Manna is a **project accelerator + evolution method**, not an autonomous app factory. It is feasible
because the target surface is deliberately constrained:

- one stack: Java 21 + Spring Boot + Embabel + Neo4j,
- headless: REST + SSE, optional CLI/MCP,
- no admin UI: data review is file + Git + CLI,
- domain-anchored, agent-delivered: domain + Neo4j relations are the design anchor; agent + tools are
  the runtime core.

## Layers

```text
Instructions   AGENTS.md
Skills         how to do one kind of work well
Workflows      order, checkpoints, hand-offs
Policies       modes, tool safety, approvals
Shared         schemas + patterns + conventions
Generator      deterministic code generation + validation + lock
Evals          golden behaviour checks
```

## Capability slice

A slice is the unit of generation and change. It is designed in this order: domain slice → Neo4j
relation contract → agent → tools → memory → pipeline → transport → evals. It contains:

| Part | Artifact |
|------|----------|
| Capability | `.manna/features/<id>.spec.json` |
| Domain | `<Entity>.java` + invariants + `.manna/domain.json` |
| Graph | `cypher/<id>.cypher` + repository + relation contract |
| Agent | `<Cap>Agent.java` |
| Tools | `<Cap>Tools.java` + tool contracts (atomic/composite/subagent) |
| Memory | `<Cap>Memory.java` + recall policy |
| Pipeline | `<Cap>Pipeline.java` + candidates.csv |
| Transport | controller + SSE contract |
| Evals | contract test + golden eval |
| Docs | `docs/capabilities/<id>.md` + ADR |

A slice may explicitly disable graph, memory or pipeline, but must state a reason.

`domain.json` is the anti-fragmentation registry. The validator rejects duplicate entity names across
slice packages, conflicting field signatures, and one relationship type with two different shapes.

## Generation order

1. Validate spec and `designMode`.
2. Render the fixed headless core.
3. For each capability: domain → graph → agent → tools → memory → pipeline → transport → tests → docs.
4. Write the spec, feature specs, domain registry, state and lock.

The generator never calls an LLM. Anything requiring judgement belongs in a skill/workflow.

## State

```text
.manna/
├── project.spec.json     # normalized project + capabilities
├── features/<id>.spec.json
├── features/<id>.graph.json
├── features/<id>.memory.json
├── features/<id>.pipeline.json
├── evals/<id>.eval.json
├── domain.json           # canonical entity/relation registry
├── state.json            # RUN_ID, phase, capabilities
└── lock.json             # generated file hashes + digest
```

After context truncation, re-read the spec, state and lock before continuing.

## Verification ladder

1. Spec schema + invariants.
2. Compile.
3. Contract tests (no LLM, no network).
4. Integration tests (Neo4j/API/LLM, tagged `integration`).
5. Behavior evals.
6. Safety review + drift/lock check.

Higher layers never replace lower ones.

## Why no UI/admin

- UI generation is high-variance and expensive to verify.
- Admin surfaces create a second, unaudited write path around tool approvals.
- CSV/JSONL + Git gives review, diff and rollback for free.

## Non-goals

- Arbitrary domains or stacks.
- Fully autonomous production delivery.
- Replacing human judgement on tool side effects, data deletion or schema migrations.
