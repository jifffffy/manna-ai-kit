---
name: urbot-domain-memory
description: Plan memory propositions, projections, and recall inside a Urbot bot domain package.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
---

# Urbot Domain and Memory

## When to use

A request adds or changes memory behavior: propositions, projections, recall, or extraction policy. If the
domain model is missing, route to `urbot-domain-design` first; this skill handles memory only.

## Inputs

- The target bot package and its existing `domain/` types.
- The memory propositions, projections, and recall policy requested.

## Process

1. Inspect the existing `src/main/java/com/embabel/bot/<botname>/domain/` types.
2. If the domain model is missing, stop and route to `urbot-domain-design` as a separate workflow.
3. Reuse existing types before adding a proposition or projection.
4. State the memory artifacts, recall policy, and verification commands.
5. Stop at `CHECKPOINT: MEMORY`.
6. Do not write before approval.

## Output

A memory plan that keeps propositions, projections, and recall inside Urbot.

## Do not

- Design entities, aggregates, value objects, or events here; use `urbot-domain-design`.
- Copy the Urbot domain model into Manna.
- Fork an entity into a second package.
- Write memory propositions before `CHECKPOINT: MEMORY`.
