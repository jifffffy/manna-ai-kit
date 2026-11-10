# Domain-Anchored, Agent-Delivered Design

Manna distinguishes three things that are easy to conflate:

| Concern | Role |
|---------|------|
| **Domain + Neo4j relations** | Design anchor: the structure of the world |
| **Agent + Tools** | Runtime core: what happens on that structure |
| **Capability slice** | Delivery unit: one independently runnable increment |

The old "agent-first" wording was misleading. Tools must not define the domain. If each tool grows its
own types, the project fragments. Anchor the relevant domain subgraph and relation contract first, then
design the agent and tools against it.

## The order

```text
1. Capability brief
   goal, acceptance, non-goals

2. Domain slice
   only the entities, relations and invariants this capability needs
   check the canonical registry; reuse before adding

3. Neo4j relation contract
   labels, relationship types, direction, cardinality, constraints, queries
   a relation with no query or invariant does not enter the model

4. Agent + Actions
   goals, steps, confirmations, typed inputs/outputs

5. Tools
   atomic tools: graph queries/writes, external APIs
   composite tools: playbooks
   agent tools: subagents (a subagent is a tool)

6. DICE memory
   propositions projected onto the same relation vocabulary

7. Pipeline
   how data enters this subgraph

8. Transport
   REST + SSE, optional CLI/MCP

9. Evals
   contract, integration, behavior
```

## Why domain first

- The relation contract defines tool boundaries. `AgendaEntry -REFERENCES-> Session` tells you exactly
  what `findSession` and `addToAgenda` need.
- Tool inputs/outputs stop inventing their own types.
- Subagent boundaries become obvious: a subagent is a tool over a coherent subgraph.
- Neo4j constraints, indexes and queries are designed before code depends on them, avoiding retrofit
  migrations.
- Memory and pipelines reuse the same vocabulary instead of creating parallel models.

## Why not whole-domain first

This is a **domain slice**, not a full ontology. Model only what the capability needs, then register it
in `.manna/domain.json`. The canonical registry and the validator prevent a later slice from forking a
type or changing a relationship shape silently.

## Tool graph

Tools are not a flat list:

```text
atomic tool      -> one graph query/write or one external API
composite tool   -> a playbook of atomic tools
agent-level tool -> a subagent that achieves a sub-goal
```

Design the tool graph after the domain and actions, not before. Every tool still declares
`side_effects`, approval and idempotency (`policies/tool-safety.md`).

## Gap check

After tool design, check whether the tools revealed a missing entity, field or relation. If yes:

1. reopen `CHECKPOINT: DOMAIN` or `CHECKPOINT: GRAPH`,
2. update the canonical registry,
3. then continue to generation.

Do not patch the gap by giving one tool a private type.

## Design modes

- `graph-first` (default): Neo4j relations are the system of record or a core part of the value.
- `capability-first`: tool-only agents with no graph model. Still keep the domain slice explicit, but
  skip graph/memory/pipeline with `enabled: false` and a reason.

Set `project.designMode` in the project spec.

## When to use a structured agent instead of utility

- **Utility**: open-ended conversation, tools are the product, order is unknown.
- **Structured**: the flow is known and must be predictable, expensive, or audited.
  Use `@Agent` + `@Action` + `@AchievesGoal`.
- **Hybrid**: a utility chat exposes a structured subagent as a tool. This is the Impromptu pattern
  for expensive two-phase work (plan first, then assemble).
