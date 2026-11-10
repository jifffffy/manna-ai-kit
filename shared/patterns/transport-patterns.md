# Transport Patterns (Headless)

Default surface: REST + SSE. Add CLI or MCP only when the capability spec asks.

## REST

- `POST /api/chat` with `{ "conversationId": "...", "message": "..." }`.
- `POST /api/chat/stream` returns `text/event-stream` with one `message` event then `done`.
- `GET /api/health` for liveness.
- `GET /api/capabilities` lists capability ids and goals (no secrets).
- Errors: `{ "code": "...", "message": "...", "retryable": false }` with a stable HTTP status.

## SSE

- One event per assistant message.
- Always terminate with a `done` event, even on error.
- Timeout the emitter; do not hold a request forever.
- Do not stream internal chain-of-thought or raw tool payloads.

## Authentication

- Default to API key for generated services.
- OAuth/JWT only when the spec requires real user accounts.
- Never put tokens in URLs or logs.

## MCP

- Expose read-only tools first.
- External-write tools require the same approval metadata as HTTP tools.
- MCP tool names must match the tool contract names.

## CLI

- `pipeline generate|apply|rollback` for data curation.
- `chat "..."` only for local debugging.
- CLI commands must be idempotent and print the ledger path.
