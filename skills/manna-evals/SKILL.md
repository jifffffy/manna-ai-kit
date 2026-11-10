---
name: manna-evals
description: Create layered contract, integration and behavior evals for generated capabilities.
version: 0.1.0
mode-default: review
requires:
  - shared/patterns/generation-invariants.md
  - policies/approval-checkpoints.md
  - workflows/quality-gate.md
---

# Manna Evals

## When to use

- A capability slice is generated or changed.
- A regression needs a permanent assertion.
- A release gate is requested.

## Layers

1. **Spec** — schema, `designMode`, domain registry consistency, explicit vertical flags, tool safety. No LLM.
2. **Contract** — records/tools/endpoints validate; no network, no LLM. Include an assertion that no
   entity is duplicated across slice packages and no relation shape conflicts.
3. **Integration** — real Neo4j/API/LLM; tagged `integration`; not in default test runs.
4. **Behavior** — agent output and tool-call assertions; may use an LLM.

Never replace a lower layer with a higher one.

## Process

1. **Map acceptance criteria to assertions.** Each criterion gets at least one check.
2. **Write contract tests** first:
   - tool side effects declared,
   - external writes have idempotency or dry-run,
   - domain invariants hold,
   - endpoint shapes match.
3. **Write integration tests** only for real external boundaries. Use `@Transactional` rollback when the
   store supports it.
4. **Write behavior evals** for:
   - the agent using canonical entity/relation types (no tool-private model),
   - expected tool graph (atomic → composite → subagent),
   - expected action/tool selection,
   - refusal/confirmation before a write,
   - structured output shape,
   - irrelevant memory not recalled.
5. **Mark flaky and expensive checks** clearly.
6. **Stop at `CHECKPOINT: EVALS`.**

## Golden eval shape

```json
{
  "id": "requirement-to-slice",
  "skill": "manna-discovery",
  "fixture": "examples/example.spec.json",
  "expected": {
    "must_detect": ["external-write tool"],
    "must_create": [".manna/features/F-001.spec.json"],
    "must_do": ["stop at CHECKPOINT: SPEC"],
    "must_not": ["create a UI", "skip side_effects"]
  },
  "pass_criteria": "spec validates and all invariant checks pass",
  "triggers": { "should": ["build a new capability"], "should_not": ["fix a typo"] }
}
```

## Do not

- Use an LLM to assert something a schema check can assert.
- Mark a live-LLM test as a unit test.
- Delete a failing eval to make the gate green.
- Treat a rerun-until-green result as a pass.
