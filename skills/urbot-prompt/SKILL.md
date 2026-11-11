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

A request changes how a bot speaks or what it optimizes: persona, objective, or behaviour. It is also the
prompt-drafting step inside `urbot-profile-change`.

## Inputs

- The target profile.
- The current `prompts/personas|objectives|behaviours/<botname>.jinja`.
- The user's persona/objective description.

## Process

1. Inspect the current prompt resources and the source-backed config bindings.
2. Draft the persona and objective text, plus an optional behaviour template.
3. In `urbot-profile-change`, hand the draft to `urbot-profile` so the approved write produces
   `prompts/personas/<bot>.jinja` and `prompts/objectives/<bot>.jinja`.
4. For a standalone prompt-only request, state the prompt plan and stop at `CHECKPOINT: PROMPT PLAN`.
5. Do not write prompt files yourself; the profile workflow owns the write after `CHECKPOINT: PROFILE`.

## Output

A prompt plan naming the exact Jinja resources and verification commands.

## Do not

- Use obsolete property names such as `urbot.persona`.
- Edit prompts in Phase 1.
