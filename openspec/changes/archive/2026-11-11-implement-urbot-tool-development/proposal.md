# Proposal

## Why

Tools are the most common Urbot extension after profiles. Urbot already provides the extension points:
`ChatActions` injects `List<Tool>` and `List<LlmReference>`, so `@LlmTool`-backed tools, `LlmReference`
beans, `ToolishRag` beans, `Subagent` beans, and MCP clients are collected without touching core code. Manna
should generate those artifacts in the bot package, declare their side effects and secrets using Manna's
existing safety policy, and verify them with Urbot's own compile and test flow — without inventing a second
machine-readable tool spec for Urbot.

## What Changes

- **Implement the `urbot-tool` skill fully.** It generates the supported tool kinds in the target bot package:
  - `llm-tool`: an `@LlmTool` class plus a Spring `Tool` bean.
  - `llm-reference`: an `@LlmTool` class plus an `LlmReference` bean.
  - `toolish-rag`: a `ToolishRag` bean.
  - `subagent`: an `@Agent` class plus a `Subagent` bean.
  - `mcp`: profile-scoped `spring.ai.mcp.client.*` properties that the existing
    `McpToolsConfiguration.mcpTools` bean collects.
  Each kind gets a `<ToolName>ToolConfiguration` class annotated `@Configuration @Profile("<bot>")` in the bot
  package, so `ChatActions` collects the beans through its `List<Tool>` / `List<LlmReference>` injection.
- **Declare side effects and secrets in the Manna plan.** Kinds map to `read`, `internal-write`,
  `external-write`, or `destructive`. The classification is Manna's development-safety policy; it does not add
  a second machine-readable tool spec to Urbot. Secrets are named by environment variable, never embedded.
- **Enforce safe writes.** `external-write` requires idempotency (or dry-run) plus approval; `destructive` is
  never auto-applied and this change only plans it. The generated external-write tool is a dry-run stub and
  does not perform a real charge or mutation.
- **Implement the `urbot-tool-development` workflow**: `urbot-discovery → urbot-tool → urbot-verification`,
  with `CHECKPOINT: TOOLS` before writes. If a tool needs a domain entity or memory change, the workflow stops
  and hands off to the separate `urbot-domain-memory` workflow; the router never runs both unbounded flows.
- **Add the examples**: weather query, Stripe integration, MCP tool, and Subagent. `ToolishRag` is covered as
  a supported kind.
- **Generate tests**: a bot-local test that activates the bot profile, asserts the generated bean is
  discoverable as the type `ChatActions` collects, and asserts the inactive profile does not load it. MCP is
  verified at the configuration level; no live MCP server is required.
- **Verification**: `./mvnw test` and `./mvnw -DskipTests compile` in the target Urbot checkout, plus Manna's
  deterministic tool test and `openspec validate --strict`.
- **Non-goals**: no Domain or Memory workflow, no second machine-readable tool spec, no router executing
  multiple unbounded workflows, and no second Spring Boot application.

## Capabilities

### New Capabilities

- `urbot-tool-development`: defines the five tool kinds, the generated artifacts, `ChatActions` collection,
  the Manna side-effect/secret/approval policy, safe external-write and destructive handling, the
  discovery → tool → verification workflow, cross-domain/memory handoff, examples, tests, and verification.

### Modified Capabilities

None. `urbot-inspect-and-route` already routes tool requests to `urbot-tool-development`;
`urbot-profile-change` remains the bot-profile workflow.

## Impact

- **New implementation**: `skills/urbot-tool/scripts/apply.mjs` and
  `scripts/dev/test-tool-development.mjs`.
- **Updated skill/workflow**: `skills/urbot-tool/SKILL.md`, `workflows/urbot-tool-development.md`,
  `skills/urbot-verification/SKILL.md`, and the `TOOLS` checkpoint guidance.
- **Routing**: `generator/urbot/route.mjs` reports kind-specific target files and the
  `urbot-discovery → urbot-tool → urbot-verification` sequence; the tool entry in
  `workflows/routing/pipeline.json` lists all three skills.
- **Evals/fixtures**: weather, Stripe, MCP, and Subagent tool cases in the existing tool golden eval.
- **Tests**: deterministic `npm run test:tool` in `npm test`, plus a real-checkout mode that copies a Urbot
  checkout, applies the examples, and runs `./mvnw -DskipTests compile`, `./mvnw test`, and the generated
  tests. The kit lock is regenerated.
- **Out of scope**: domain/memory implementation, a second tool spec, multi-workflow router execution, and
  any core Urbot edit.
