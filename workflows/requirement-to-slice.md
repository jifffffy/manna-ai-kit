# Workflow: Requirement to Capability Slice

**Goal:** turn a domain + requirement into one runnable, testable vertical slice without a UI.

## When to use
- A new project or a new capability that does not exist yet.
- The user provides a domain, a user need, and a desired outcome.

## Inputs
- Domain description.
- User intent and constraints.
- Any known external systems or data sources.
- Acceptance criteria (or permission to derive them).

## Steps

1. **Discover** — load `manna-discovery`. Produce `.manna/features/<id>.spec.json` with:
   capability, design mode, domain (preliminary), graph (preliminary), agent (preliminary),
   tools (preliminary), memory, pipeline, transport, evals.
   Stop at `CHECKPOINT: SPEC`.
2. **Anchor the domain** — load `manna-domain`. Model only the subgraph this capability needs. Check
   `.manna/domain.json`; reuse before adding; consolidate duplicate names, fields and relations.
   Stop at `CHECKPOINT: DOMAIN`.
3. **Anchor Neo4j** — load `manna-graph`. Define labels, relationship types, direction, cardinality,
   constraints and read queries. A relation with no query or invariant does not enter the model.
   Stop at `CHECKPOINT: GRAPH`.
4. **Agent** — load `manna-agent`. Define the agent mode (`utility` or `structured`), actions, goal and
   confirmations against the anchored domain. Stop at `CHECKPOINT: AGENT`.
5. **Tools** — load `manna-tools`. Design the tool graph: atomic graph/API tools, composite playbooks,
   and subagents as tools. Every tool declares side effects, idempotency, approval and secrets.
   Stop at `CHECKPOINT: TOOLS`.
6. **Memory** — load `manna-memory`. Project DICE propositions onto the same relation vocabulary.
   Stop at `CHECKPOINT: MEMORY`.
7. **Pipeline** — load `manna-pipeline`. Define file-based ingest, review and idempotent apply.
   Stop at `CHECKPOINT: PIPELINE`.
8. **Transport** — load `manna-transport`. Expose REST + SSE by default; CLI/MCP only if required.
   Stop at `CHECKPOINT: TRANSPORT`.
9. **Generate** — run `node generator/manna.mjs init <spec> <out>` for a new project, or
   `node generator/manna.mjs slice <project> <slice.spec>` for an existing one.
10. **Evaluate** — load `manna-evals`. Add contract tests and golden eval entries.
11. **Verify** — run `node generator/manna.mjs validate <project>` and the project's test command.
12. **Report** — slice id, domain/relation changes, tools/side effects, verticals enabled/disabled,
    checks, open questions.

## Gap check

If tool design reveals a missing entity, field or relation, **stop** and reopen `CHECKPOINT: DOMAIN`
or `CHECKPOINT: GRAPH`. Update `.manna/domain.json`, then continue. Never patch the gap with a
tool-private type.

## Gates
- Spec schema valid and `designMode` explicit.
- Domain registry consistent: no forked entity, no conflicting field or relation shape.
- Every tool has `side_effects`.
- Project compiles and the contract test passes.
- No UI/Vaadin/admin references.
- Graph/memory/pipeline flags are explicit.

## Outputs
- `.manna/features/<id>.spec.json`
- `.manna/domain.json`
- project code + tests + docs
- `.manna/lock.json`

## Do not
- Model the whole domain before delivering one slice.
- Design tools before the domain and relation contract.
- Generate all capabilities at once.
- Add a UI to review data.
- Leave a vertical implicit.
