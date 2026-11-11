# Workflow: Urbot Tool Development

**Goal:** add a Tool, MCP tool, subagent, or reference to a Urbot bot.

## Phase 1 scope

Skeleton only. Inspect and report a tool plan; do not write.

## Ordered steps

1. Run `urbot-discovery` to read the target bot and existing tools.
2. Define the tool contract: name, kind, side effects, idempotency, approval.
3. Map the tool to bot-owned types; do not invent a second model.
4. Output `src/main/java/com/embabel/bot/<botname>/<BotName>Tools.java` and verification commands.
5. Stop at `CHECKPOINT: TOOL PLAN`.

## Output

A tool plan that satisfies `policies/tool-safety.md`.

## Do not

- Add an external write without idempotency and approval.
- Write files in Phase 1.
