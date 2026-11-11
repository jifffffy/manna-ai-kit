---
name: urbot-domain-memory
description: Plan NamedEntity, relation, and memory changes inside a Urbot bot domain package.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
---

# Urbot Domain and Memory

## When to use

A request adds or changes a NamedEntity, relation, or memory behavior.

## Inputs

- The target bot package and its `domain/` types.
- The requested entity, relations, and memory propositions.

## Process (Phase 1: skeleton)

1. Inspect the existing `src/main/java/com/embabel/bot/<botname>/domain/` types.
2. Reuse existing types before adding a new one.
3. State the target files and verification commands.
4. Stop at `CHECKPOINT: DOMAIN MEMORY PLAN`.
5. Do not write in Phase 1.

## Output

A domain/memory plan that keeps the entity model inside Urbot.

## Do not

- Copy the Urbot domain model into Manna.
- Fork an entity into a second package.
- Write files in Phase 1.
