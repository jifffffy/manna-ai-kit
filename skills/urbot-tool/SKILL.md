---
name: urbot-tool
description: Generate a Urbot Tool, LlmReference, ToolishRag, Subagent, or MCP connection with explicit side effects, secrets, and tests.
version: 0.1.0
mode-default: review
requires:
  - policies/tool-safety.md
  - policies/approval-checkpoints.md
  - docs/architecture.md
  - workflows/routing/pipeline.json
---

# Urbot Tool

## When to use

A request adds a tool capability to an existing Urbot bot: an `@LlmTool`, an `LlmReference`, a `ToolishRag`, a
`Subagent`, or an MCP connection. The bot profile must already exist; otherwise route to
`urbot-profile-change` first.

## Inputs

- The target Urbot checkout and bot.
- The tool kind, name, and description.
- The side effect and any secrets.
- For writes: idempotency or dry-run and approval.

## Kinds

| Kind | Generated artifacts | Collection |
|------|---------------------|------------|
| `llm-tool` | `@LlmTool` class + `Tool` bean + test | `List<Tool>` |
| `llm-reference` | `@LlmTool` class + `LlmReference` bean + test | `List<LlmReference>` |
| `toolish-rag` | `ToolishRag` bean + test | `List<LlmReference>` |
| `subagent` | `@Agent` class + `Subagent` bean + test | `List<Tool>` |
| `mcp` | profile-scoped `spring.ai.mcp.client.*` properties + offline test | existing `mcpTools` bean |

Every non-MCP kind writes a `<ToolName>ToolConfiguration` class annotated `@Configuration @Profile("<bot>")`
in the bot package.

## Process

1. Inspect the bot package, existing tools, configuration, and discovery report.
2. Plan the kind, target files, side effect, secrets, idempotency, and collection type.
3. Stop at `CHECKPOINT: TOOLS`. Do not write before approval.
4. Apply after approval:

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

   Add `--secrets`, `--idempotency-key`, or `--dry-run` for writes; add `--mcp-*` for MCP.

5. Verify with `urbot-verification`: compile, tests, generated tests, and the collection check.

## Collection contract

`ChatActions` injects `List<Tool>` and `List<LlmReference>`. The generated tests assert the bean is present by
that type with the bot profile active and absent without it. MCP uses the existing `McpToolsConfiguration`
`mcpTools` bean; no core wiring is added.

## Side effects

Every tool declares exactly one:

| Side effect | Meaning | Approval |
|-------------|---------|----------|
| `read` | Pure read or RAG retrieval | none |
| `internal-write` | Writes the project's own state | review |
| `external-write` | Writes a system the user does not own | idempotency or dry-run + approval |
| `destructive` | Deletes or irreversibly mutates | never auto-applied |

The declaration lives in the Manna plan/report. Do not add a second machine-readable tool spec to Urbot.

## Secrets and safe writes

- Name secrets as environment variables (`STRIPE_SECRET_KEY`); never write the value.
- `external-write` requires an idempotency key or `--dry-run`; the generated method is a dry-run stub.
- `destructive` returns `blocked-destructive` and writes nothing.
- Never call a live Stripe/MCP/LLM endpoint from the generated tests.

## Domain and memory

If the tool needs a new `NamedEntity`, relation, or memory behavior, stop and route to
`urbot-domain-memory` as a separate workflow. Do not create a private type or run both workflows at once.

## Output

A tool report with kind, bot, side effect, secrets, idempotency, target files, collection type, generated
tests, and verification results.

## Do not

- Write before `CHECKPOINT: TOOLS`.
- Add a tool to a missing bot profile; route to `urbot-profile-change`.
- Add an external write without idempotency/dry-run and a declared secret.
- Add a destructive tool automatically.
- Modify `src/main/java/com/embabel/urbot/`.
- Create a second Spring Boot application or copy the Urbot domain model.
