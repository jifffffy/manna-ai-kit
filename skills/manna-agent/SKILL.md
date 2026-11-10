---
name: manna-agent
description: Design Embabel agents, actions, goals and confirmation points for one capability slice.
version: 0.1.0
mode-default: review
requires:
  - shared/patterns/embabel-patterns.md
  - shared/patterns/domain-anchored-design.md
  - shared/schemas/capability-spec.schema.json
  - policies/approval-checkpoints.md
---

# Manna Agent

## When to use

After `manna-domain` and `manna-graph` have anchored the entity and relation contract, and before
`manna-tools`. The agent operates on the anchored domain; it does not invent entities.

## Inputs

- Capability spec, especially `agent` and `capability`.
- `.manna/domain.json`, the domain slice and the relation contract.
- Tool and data constraints known so far (preliminary).

## Process

1. **Read the anchor** — load the domain entities and relationship contract first.
2. **Choose the mode**:
   - `utility`: open-ended chat; tools are the product; order unknown.
   - `structured`: known flow, expensive/audited steps, typed data flow.
   - hybrid: utility chat exposes a structured subagent for expensive phases.
3. **Define the goal and terminal action**:
   - one goal per capability,
   - `@AchievesGoal` on the terminal action,
   - typed input and output records (no raw `Map`/`List`).
4. **Define actions**:
   - name, input type, output type,
   - read-only vs write,
   - whether it can rerun,
   - explicit blackboard bindings.
5. **Define confirmations**:
   - before any `external-write`,
   - before any `destructive` action,
   - before a costly multi-step phase when the user should confirm the plan.
6. **Define the model**:
   - cheap/fast model for classification and research,
   - stronger model for final synthesis,
   - explicit temperature.
7. **Stop at `CHECKPOINT: AGENT`.**

## Output

Update the spec `agent` section and optionally generate the skeleton with:

```bash
node generator/manna.mjs slice <project> <slice.spec.json>
```

Report:

```text
Mode: structured
Goal: ...
Actions: [name: input → output, rerun, readOnly]
Confirmations: ...
Model: ...
CHECKPOINT: AGENT
```

## Do not

- Put tool implementation inside an action.
- Design actions before the domain/relation contract is anchored.
- Create one action that both plans and performs a destructive write.
- Use an unstructured string as the only output of a structured agent.
- Skip the confirmation for a costly phase that calls external services.
