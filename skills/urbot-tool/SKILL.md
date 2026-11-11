---
name: urbot-tool
description: Plan a Urbot Tool, MCP tool, subagent, or reference with explicit side effects and approval.
version: 0.1.0
mode-default: review
requires:
  - policies/tool-safety.md
  - docs/architecture.md
  - workflows/routing/pipeline.json
---

# Urbot Tool

## When to use

A request adds a Tool, MCP tool, subagent, or reference to an existing bot.

## Inputs

- The target bot and tool contract.
- Side effects, idempotency, and approval requirements.

## Process (Phase 1: skeleton)

1. Inspect the target bot's `<BotName>Tools.java` and configuration.
2. Declare the tool name, side effect, idempotency, and approval.
3. State the target files and verification commands.
4. Stop at `CHECKPOINT: TOOL PLAN`.
5. Do not write in Phase 1.

## Output

A tool plan that maps every tool to a bot-owned type.

## Do not

- Invent a second domain model for a tool.
- Add an external write without idempotency and approval.
- Write files in Phase 1.
