---
name: manna-tools
description: Design tool contracts with explicit side effects, permissions, idempotency and failure behavior.
version: 0.1.0
mode-default: review
requires:
  - shared/schemas/tool-contract.schema.json
  - policies/tool-safety.md
  - policies/approval-checkpoints.md
  - shared/patterns/embabel-patterns.md
---

# Manna Tools

## When to use

After `manna-domain`, `manna-graph` and `manna-agent`. Tools are designed against the anchored domain and
the agent's actions; they do not invent entities.

- A capability needs any external or state-changing operation.
- An existing tool changes schema, target, or side effect.
- An MCP/API integration is proposed.

## Inputs

- Capability spec `tools` and `agent.confirmations`.
- `.manna/domain.json` and the relation contract.
- Access details, auth model, rate limits, timeouts.

## Tool graph

Design tools as a graph, not a flat list:

- **atomic** — one graph query/write or one external API call;
- **composite** — a playbook over atomic tools;
- **agent-level** — a subagent, which in Embabel is also a `Tool`.

A subagent tool must still operate on the canonical entities and relations.

## Process

1. **Write the contract before the adapter**:
   `name`, `description`, `kind`, `side_effects`, `idempotent`, `idempotency_key`, `approval`,
   `dry_run`, `timeout_seconds`, `secrets`, `input`, `output`.
2. **Classify side effects** using `policies/tool-safety.md`.
3. **Design the happy path and the failure path**:
   - structured error: `code`, `message`, `retryable`,
   - bounded retries only for idempotent reads,
   - audit record before and after writes.
4. **Design the approval UX** for a headless client:
   - show exact action, target, payload diff,
   - allow deny with no side effect,
   - never rely on a UI.
5. **Gap check** — if a tool needs a new entity, field or relation, stop and reopen
   `CHECKPOINT: DOMAIN` or `CHECKPOINT: GRAPH`. Do not give the tool a private type.
6. **Define tests**:
   - fake adapter contract test (no network),
   - integration test tagged `integration`,
   - eval that the agent asks before an external write.
7. **Stop at `CHECKPOINT: TOOLS`.**

## Output

Updated spec `tools` plus:

```text
Tools:
- searchRecordings: read, idempotent, approval=none
- createPlaylist: external-write, idempotency_key=user+hash(tracks), approval=required
Danger: 1 external write
Secrets: SPOTIFY_CLIENT_SECRET (env only)
CHECKPOINT: TOOLS
```

## Do not

- Write an adapter before the contract.
- Design tools before domain/relations or let a tool introduce its own entity type.
- Declare `read` when a tool also writes.
- Retry a non-idempotent write.
- Put secrets in the spec, prompt, CSV, or `application.yml`.
- Expose a destructive tool through MCP without explicit approval.
