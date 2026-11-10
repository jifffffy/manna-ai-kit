# Workflow: Add a Capability

**Goal:** add one new vertical slice to an existing project without disturbing existing behaviour.

## Steps

1. **Read reality** — read `.manna/project.spec.json`, `.manna/domain.json`, `.manna/state.json`,
   the lock and the existing `src/main/java` tree. Never trust memory after context truncation.
2. **Discover** — load `manna-discovery`. Write `.manna/features/<new-id>.spec.json`.
   Stop at `CHECKPOINT: SPEC`.
3. **Domain and relation impact analysis** — list:
   - new vs reused entities,
   - field/type changes to existing entities,
   - new vs reused relationship types and their `from → to` shape,
   - new graph labels, constraints and queries,
   - registered entities that can be reused unchanged.
   The generator/validator rejects a new slice that forks an existing entity into a different package
   or reuses a relationship type with a different shape. Consolidate or reuse before generating.
4. **Anchor the domain** — load `manna-domain`. Stop at `CHECKPOINT: DOMAIN`.
5. **Anchor Neo4j** — load `manna-graph`. Stop at `CHECKPOINT: GRAPH`.
6. **Agent** — load `manna-agent`. Stop at `CHECKPOINT: AGENT`.
7. **Tools** — load `manna-tools`. Stop at `CHECKPOINT: TOOLS`.
8. **Memory / pipeline** — load `manna-memory` and `manna-pipeline` only if the spec enables them.
9. **Generate** — `node generator/manna.mjs slice <project> <slice.spec.json>`.
10. **Consolidate domain** — run the post-slice consolidation pass and confirm `.manna/domain.json`
    contains the new entities/relations exactly once.
11. **Test** — add a contract test; reuse existing test fixtures.
12. **Verify** — `node generator/manna.mjs validate <project>` plus the full quality gate.
13. **Update ledger** — append the slice and its checkpoints to `.manna/state.json`.

## Gap check

If tool design reveals a missing entity, field or relation, reopen `CHECKPOINT: DOMAIN` or
`CHECKPOINT: GRAPH` before generating. Do not add a tool-private type.

## Gates
- Domain and relation checkpoints precede agent and tools.
- The new slice compiles independently.
- Existing contract tests still pass.
- No existing tool's side effects changed silently.
- No duplicate entity in two slice packages.
- No new UI or admin surface.

## Do not
- Copy an existing entity "to be safe".
- Design tools before the domain slice and relation contract.
- Add a new transport when the capability can ride the existing chat endpoint.
- Modify an existing tool's side effects without reopening `CHECKPOINT: TOOLS`.
