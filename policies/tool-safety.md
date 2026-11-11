# Tool Safety Policy

Every tool generated or modified by a manna workflow must declare its effect on the world. This is the
primary safety boundary of an agent service.

## Side-effect taxonomy

| `side_effects` | Meaning | Default approval |
|----------------|---------|------------------|
| `none` | Pure computation; no I/O | none |
| `read` | Reads local state, a database, or a read-only remote API | none |
| `internal-write` | Writes to this project's own store (Neo4j, files, cache) | review |
| `external-write` | Writes to a system the user does not own here (playlist, ticket, email, webhook) | review + idempotency |
| `destructive` | Deletes or irreversibly mutates user data | never auto-apply; explicit human confirmation |

Omission is a validation error, not a default.

## Required fields

```json
{
  "name": "createPlaylist",
  "kind": "http",
  "side_effects": "external-write",
  "idempotent": false,
  "idempotency_key": "userId + hash(trackIds)",
  "approval": "required",
  "dry_run": true,
  "timeout_seconds": 20,
  "secrets": ["SPOTIFY_CLIENT_SECRET"]
}
```

- `external-write` must set `idempotent: true` with an `idempotency_key`, or `dry_run: true` plus an
  explicit approval checkpoint.
- `destructive` must set `approval: "explicit"`, and the workflow must stop and name the exact data
  affected.
- Tools may not read secrets from files committed to the repo. Use environment variables or a secret
  manager.

## Domain boundary

A tool's inputs and outputs must map to Urbot-owned types in the bot package's `domain/`.
If a tool needs a new field, entity or relation, stop and reopen `CHECKPOINT: DOMAIN` or
`CHECKPOINT: GRAPH`. Never give a tool a private type.

## Execution rules

1. Validate input against the tool's JSON schema before calling.
2. Enforce timeouts; never let a tool block the agent loop indefinitely.
3. Return structured errors (`code`, `message`, `retryable`), not raw stack traces.
4. Log tool name, side effect, duration, and outcome; never log secrets or full user payloads.
5. For `read` tools, prefer pagination and hard limits to prevent runaway context.
6. For `external-write`, write the audit record **before** the call and the outcome after.

## Checkpoints

- **Before** an `external-write`: show the user the exact action, target and payload.
- **Before** a `destructive` action: show affected records and require typed confirmation.
- **After** any write: report what changed and how to reverse it.

## Anti-patterns

- A tool that both reads and writes but declares only `read`.
- A write endpoint with no idempotency key that the agent may retry.
- Hiding a destructive operation inside a "cleanup" or "sync" tool.
- Passing secrets through tool parameters or prompts.
