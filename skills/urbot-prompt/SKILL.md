---
name: urbot-prompt
description: Plan persona, objective, and behaviour prompt changes for a Urbot bot.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
---

# Urbot Prompt

## When to use

A request changes how a bot speaks or what it optimizes: persona, objective, or behaviour.

## Inputs

- The target profile.
- The current `prompts/personas|objectives|behaviours/<botname>.jinja`.

## Process (Phase 1: skeleton)

1. Inspect the current prompt resources and the source-backed config bindings.
2. State the prompt files that would change.
3. Stop at `CHECKPOINT: PROMPT PLAN`.
4. Do not write in Phase 1.

## Output

A prompt plan naming the exact Jinja resources and verification commands.

## Do not

- Use obsolete property names such as `urbot.persona`.
- Edit prompts in Phase 1.
