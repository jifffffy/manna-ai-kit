---
name: manna-memory
description: Design DICE propositions, graph projections and recall policy for durable user context.
version: 0.1.0
mode-default: review
requires:
  - shared/patterns/dice-conventions.md
  - policies/approval-checkpoints.md
---

# Manna Memory

## When to use

After the domain, relation contract and tools are anchored; memory projects onto the same vocabulary.

- The agent should remember preferences, constraints or goals across turns/sessions.
- Memory is producing wrong or noisy recall.

## Inputs

- Capability spec and conversation examples.
- What the graph already stores.

## Process

1. **Justify memory.** If the data belongs in the domain graph or a live tool, set
   `memory.enabled: false`.
2. **Define propositions** with subject/predicate/object, confidence, decay.
3. **Map to graph relations** only if a query needs them, using the relation types in
   `.manna/domain.json`. Do not create a parallel memory ontology.
4. **Define recall**: context scope, limit, order, minimum confidence.
5. **Define deletion**: soft delete, user-forget, no resurrection.
6. **Stop at `CHECKPOINT: MEMORY`.**
7. **Add evals**:
   - expected extraction from a seeded conversation,
   - no extraction for transient requests,
   - relevant recall / irrelevant non-recall,
   - deletion honored.

## Output

`memory` section plus `.manna/features/<id>.memory.json` and prompt/schema references.

```text
Memory: enabled, context=user-default
Propositions: User LIKES Composer; User PREFERS Performer
Recall: top 10 by effectiveConfidence, min 0.3
Deletion: soft, user-forget
CHECKPOINT: MEMORY
```

## Do not

- Store full conversations.
- Store sensitive attributes without a stated capability need.
- Let deleted memory come back on the next extraction.
- Raise the recall limit without measuring precision.
