# Workflow: Urbot Tool Development

**Goal:** add a Urbot tool capability — `@LlmTool`, `LlmReference`, `ToolishRag`, `Subagent`, or MCP — to an
existing bot profile, with explicit side effects, secrets, tests, and verification.

## Scope

This workflow touches the bot package, the bot profile properties, and the bot's test package. It does not
implement domain entities, relations, or memory. If the tool needs those, stop and hand off to
`urbot-domain-memory`.

## Ordered steps

1. **Discover** — run `urbot-discovery` to read the project, bot profile, existing tools, and target package.
2. **Tool** — run `urbot-tool` to plan the kind, target files, side effect, secrets, idempotency, and
   collection type.
3. **Approve** — stop at `CHECKPOINT: TOOLS`. Show the exact files, side effect, secrets, and tests. Do not
   write before approval.
4. **Apply** — after approval, run:

   ```bash
   node skills/urbot-tool/scripts/apply.mjs \
     --project <urbot-checkout> \
     --bot <bot> \
     --kind <llm-tool|llm-reference|toolish-rag|subagent|mcp> \
     --name <name> \
     --description "<description>" \
     --side-effect <read|internal-write|external-write|destructive> \
     --approve
   ```

   For writes, add `--secrets`, `--idempotency-key`, or `--dry-run`. For MCP, add
   `--mcp-transport`, `--mcp-command`/`--mcp-url`, `--mcp-args`, and `--mcp-env`.

5. **Verify** — run `urbot-verification`:

   ```bash
   ./mvnw -q -DskipTests compile
   ./mvnw -q test
   ```

   The generated tests prove the bean is collected with the bot profile active and absent without it. MCP is
   verified at the properties level; no live server is required.

6. **Report** — kind, bot, side effect, secrets, idempotency, files, collection type, tests, and verification.

## Examples

| Input | Kind | Artifacts |
|-------|------|-----------|
| "增加天气查询工具" | `llm-tool` | `@LlmTool` weather class, `Tool` bean, test |
| "接入 Stripe" | `llm-reference` | `@LlmTool` class, `LlmReference` bean, `external-write` dry-run stub, `STRIPE_SECRET_KEY` |
| "增加 MCP 工具" | `mcp` | profile-scoped `spring.ai.mcp.client.*` properties, offline properties test |
| "添加一个 Subagent" | `subagent` | `@Agent` class, `Subagent` bean, test |
| "增加 ToolishRag 文档引用" | `toolish-rag` | `ToolishRag` bean, test |

## Side effects and secrets

- `read` — no write approval.
- `internal-write` — review.
- `external-write` — idempotency or dry-run plus approval; declare the secret environment variable; the
  generated method is a dry-run stub.
- `destructive` — blocked; never auto-applied. Stop for explicit human confirmation.

The declarations live in Manna's plan/report. Do not add a machine-readable tool spec to Urbot.

## Domain and memory handoff

If the tool needs a new `NamedEntity`, relation, or memory behavior, stop before writing and report
`urbot-domain-memory` as the next separate workflow. Do not run both workflows in one pass.

## Output

```text
Route: urbot-tool-development
Skills: urbot-discovery → urbot-tool → urbot-verification
Kind: llm-tool
Bot: travel
Side effect: read
Secrets: ...
Collection: Tool
Files: ...
Compile: pass/fail
Tests: pass/fail
CHECKPOINT: TOOLS (before write)
```

## Do not

- Write before `CHECKPOINT: TOOLS`.
- Add a tool to a missing bot profile; route to `urbot-profile-change`.
- Add an external write without idempotency/dry-run and a declared secret.
- Generate a destructive tool automatically.
- Create domain, relation, or memory artifacts here.
- Modify `src/main/java/com/embabel/urbot/`.
- Create a second Spring Boot application or copy the Urbot domain model.
