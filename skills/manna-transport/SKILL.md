---
name: manna-transport
description: Expose capabilities through REST, SSE, CLI or MCP without adding a UI or admin backend.
version: 0.1.0
mode-default: review
requires:
  - shared/schemas/transport-schema.schema.json
  - shared/patterns/transport-patterns.md
  - policies/approval-checkpoints.md
---

# Manna Transport

## When to use

- A capability needs a client-facing surface.
- An endpoint, auth mode or streaming behavior changes.

## Inputs

- Capability spec, agent entrypoint, tool side effects.
- Client type and auth requirements.

## Process

1. **Default to REST + SSE**:
   - `POST /api/chat` for one request/response,
   - `POST /api/chat/stream` for SSE,
   - `GET /api/health`.
2. **Add capability endpoints only if needed**. Prefer routing through chat to avoid endpoint sprawl.
3. **Define request/response types** as records.
4. **Define auth**: API key by default; OAuth/JWT only if real user accounts are required.
5. **Define errors**: stable code, message, retryable flag.
6. **CLI/MCP only if requested**:
   - CLI for pipeline/debug,
   - MCP read-only first, write tools follow `policies/tool-safety.md`.
7. **Stop at `CHECKPOINT: TRANSPORT`.**

## Output

`transport` section plus controller/CLI/MCP stubs.

```text
HTTP: POST /api/chat, POST /api/chat/stream, GET /api/health
SSE: yes, one message event + done
Auth: api-key
CLI: false
MCP: false
CHECKPOINT: TRANSPORT
```

## Do not

- Add an admin endpoint.
- Put tokens in URLs or logs.
- Stream raw chain-of-thought or full tool payloads.
- Add MCP write tools without approval metadata.
