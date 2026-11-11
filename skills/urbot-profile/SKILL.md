---
name: urbot-profile
description: Plan and review a new or modified Urbot bot profile without writing during Phase 1.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
---

# Urbot Profile

## When to use

A request creates or modifies a bot profile: `application-<botname>.properties`, the bot package, and its
persona/objective/behaviour resources.

## Inputs

- The target bot name and profile.
- The current profile configuration and prompt files.
- The user's acceptance criteria.

## Process (Phase 1: skeleton)

1. Inspect the existing bot package and `application-<botname>.properties`.
2. State the files that would change.
3. Stop at `CHECKPOINT: PROFILE PLAN`.
4. Do not write in Phase 1.

## Output

A profile plan listing configuration keys, prompt resources, and route.

## Do not

- Create a second profile mechanism beside `urbot.bot-packages` and `urbot.chat.*`.
- Write files in Phase 1.
