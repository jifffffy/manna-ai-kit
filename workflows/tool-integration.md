# Workflow: Tool Integration

**Goal:** add an external API, MCP server or side-effecting tool with an explicit safety contract.

## Steps

1. **Read the domain and relation contract first.** Map the tool's inputs/outputs to existing entities
   and relationships in `.manna/domain.json`. Reuse them. If the tool needs a new field or relation,
   stop and reopen `CHECKPOINT: DOMAIN` or `CHECKPOINT: GRAPH` before writing the contract.
2. **Classify the integration**:
   - read-only HTTP API → `read`
   - internal store write → `internal-write`
   - third-party write → `external-write`
   - delete/irreversible → `destructive`
3. **Write the tool contract** before code:
   name, description, kind, side_effects, idempotent, idempotency_key, approval, dry_run, timeout,
   secrets, input schema, output schema.
4. **Stop at `CHECKPOINT: TOOLS`.**
5. **Design the adapter**:
   - HTTP: bounded timeout, retries only for idempotent reads, structured errors.
   - MCP: tool names match the contract; no hidden write tools.
   - DB: parameterized queries; no LLM-generated writes.
6. **Add an audit record** for every write: actor, tool, target, payload hash, result.
7. **Add tests**:
   - contract test with a fake adapter (no network),
   - integration test tagged `integration` for the real service,
   - an eval asserting the agent asks before an external write.
8. **Transport** — expose only what the capability needs. No admin endpoints.

## Gates
- Tool I/O maps to canonical entities/relations; no tool-private type.
- External write has idempotency or dry-run.
- Destructive tool requires explicit approval.
- Secrets come from env vars, never the spec or repo.
- Failure path returns a structured error, not a stack trace.

## Do not
- Put API keys in the spec, prompts, CSV or `application.yml`.
- Retry a non-idempotent write automatically.
- Let an MCP tool bypass the approval policy.
