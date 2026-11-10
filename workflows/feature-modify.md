# Workflow: Modify an Existing Capability

**Goal:** change behaviour with an explicit impact analysis and no accidental contract changes.

## Steps

1. **Read** the capability spec, `.manna/domain.json`, the code, the tests and the lock.
2. **Classify the change** in this order:
   - domain change (entities, fields, types, invariants),
   - graph change (labels, relationships, constraints, migration),
   - agent behaviour (goal, action order, confirmations),
   - tool contract (schema, side effect, approval, idempotency),
   - memory change (propositions, recall),
   - transport change (endpoint, auth, streaming).
3. **Anchor before behaviour**. If the change touches domain or graph, do it first and stop at
   `CHECKPOINT: DOMAIN` / `CHECKPOINT: GRAPH`. Only then change agent and tools.
4. **Stop by class**:
   - domain → `CHECKPOINT: DOMAIN`
   - graph → `CHECKPOINT: GRAPH`
   - agent → `CHECKPOINT: AGENT`
   - tool contract → `CHECKPOINT: TOOLS`
   - memory → `CHECKPOINT: MEMORY`
   - transport → `CHECKPOINT: TRANSPORT`
   - behaviour only → no checkpoint, but add a regression eval.
5. **Update the spec first**, then regenerate or apply a controlled code change.
6. **Run the quality gate** (`workflows/quality-gate.md`).
7. **Rollback plan** — for graph or data changes, state the reverse operation before applying.

## Gates
- Domain registry has no duplicate or conflicting type.
- Spec and code agree.
- Every changed tool still declares side effects.
- New graph constraints are additive or have a rollback.
- Regression eval added for behaviour changes.
- No unrelated generated files drift.

## Do not
- Edit generated files without updating the spec and lock.
- Change a `read` tool into a write without approval.
- Change a tool contract before the domain/relation contract it depends on.
- Mix a refactor and a behaviour change in one slice.
