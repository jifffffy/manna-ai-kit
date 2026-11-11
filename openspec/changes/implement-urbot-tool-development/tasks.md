# Tasks

## 1. Implement the urbot-tool skill

- [x] 1.1 Implement `skills/urbot-tool/scripts/apply.mjs` with `--project`, `--bot`, `--kind`, `--name`, `--description`, `--side-effect`, `--secrets`, `--idempotency-key`, `--dry-run`, `--requires`, `--approve`, and `--force`; verify a run without `--approve` returns a plan and writes nothing.
- [x] 1.2 Validate the target checkout and bot: require `pom.xml`, `src/main/java/com/embabel/urbot/`, and the bot package; return `status: "profile-required"` and route to `urbot-profile-change` when the bot profile is missing.
- [x] 1.3 Implement the `llm-tool` kind: generate `<ToolName>Tools.java` with `@LlmTool`/`@LlmTool.Param`, a `<ToolName>ToolConfiguration.java` with a `Tool` bean using `Tool.fromInstance(...)`, and the generated test; verify the files and `@Profile("<bot>")`.
- [x] 1.4 Implement the `llm-reference` kind: generate the `@LlmTool` class and an `LlmReference` bean using `LlmReference.of(...)`; verify the bean type and profile gating.
- [x] 1.5 Implement the `toolish-rag` kind: generate a config with `ToolishRag(name, description, SearchOperations)` using the `context` metadata filter and `.withUnfolding()`; verify the `LlmReference` bean.
- [x] 1.6 Implement the `subagent` kind: generate an `@Agent`/`@Action` class and a `Subagent` bean using `Subagent.ofClass(...).consuming(...)`; verify the `Tool` bean.
- [x] 1.7 Implement the `mcp` kind: add profile-scoped `spring.ai.mcp.client.*` properties (stdio or SSE) to the bot properties and rely on the existing `McpToolsConfiguration.mcpTools`; verify no core edit.
- [x] 1.8 Refuse to overwrite existing generated files without `--force`; verify a second approved run is a no-op and reports existing files.
- [x] 1.9 Update `skills/urbot-tool/SKILL.md` with the five kinds, `@LlmTool`/`LlmReference`/`ToolishRag`/`Subagent`/MCP usage, the collection contract, the `CHECKPOINT: TOOLS`, the script usage, and the profile/domain handoffs.

## 2. Enforce side effects, secrets, and safe writes

- [x] 2.1 Define the allowed side effects (`read`, `internal-write`, `external-write`, `destructive`) and require exactly one per tool plan; verify the plan output contains it.
- [x] 2.2 Require `external-write` to declare an idempotency key or dry-run mode; verify a Stripe plan without either is rejected.
- [x] 2.3 Generate an external-write tool as a dry-run stub that does not perform a real mutation; verify the generated method returns a dry-run result and contains no live client call.
- [x] 2.4 Require secrets to be declared as environment variable names (e.g. `STRIPE_SECRET_KEY`) and never write the value; verify the generated files contain no secret value.
- [x] 2.5 Return `status: "blocked-destructive"` and write nothing for `destructive`; verify the workflow stops for explicit confirmation.
- [x] 2.6 Keep the declarations in Manna's plan/report and add no machine-readable Urbot tool-spec file; verify the generated Urbot diff contains only Java, properties, and tests.

## 3. Implement the urbot-tool-development workflow

- [x] 3.1 Rewrite `workflows/urbot-tool-development.md` with the ordered flow `urbot-discovery → urbot-tool → urbot-verification`, the `CHECKPOINT: TOOLS` before writes, the apply step, and the verification step.
- [x] 3.2 Add the examples and expected artifacts to the workflow: weather (`@LlmTool`), Stripe (`external-write` dry-run), MCP (profile properties), Subagent (`@Agent` + bean), and ToolishRag (reference bean).
- [x] 3.3 Update `skills/urbot-verification/SKILL.md` to name the tool verification commands, generated tests, and bean-collection check; keep it read-only.
- [x] 3.4 Update the `TOOLS` checkpoint guidance to approve tool contracts, side effects, idempotency, secrets, and target files; never approve domain/memory or core edits.

## 4. Cross-domain and memory handoff

- [x] 4.1 Add a `requires` field to the tool plan (`none`, `domain`, `memory`, `domain+memory`); verify each value is reported.
- [x] 4.2 Return `status: "route-required"` with `route: "urbot-domain-memory"` and write nothing when a tool needs a new entity, relation, or memory behavior; verify the workflow stops.
- [x] 4.3 Ensure the router selects one primary workflow or asks one question when a request mixes tool and domain/memory; verify the mixed request does not return two workflows.
- [x] 4.4 Verify the tool workflow does not create `NamedEntity`, `Relations`, memory, or domain files.

## 5. Add examples and fixtures

- [x] 5.1 Add `evals/fixtures/urbot/tool-weather.json` ("增加天气查询工具"), `tool-stripe.json` ("接入 Stripe"), `tool-mcp.json` ("增加 MCP 工具"), and `tool-subagent.json` ("添加一个 Subagent").
- [x] 5.2 Add the four cases to `evals/golden/urbot-tool.eval.json`; verify `npm run test:routing` still passes.
- [x] 5.3 Add a `tool-toolish-rag` fixture or case for the `ToolishRag` kind; verify it routes to `urbot-tool-development`.

## 6. Generated tests and verification

- [x] 6.1 Generate an `ApplicationContextRunner` test for `llm-tool`, `llm-reference`, and `subagent` that asserts the bean is present with the bot profile and absent without it.
- [x] 6.2 Generate a `ToolishRag` test with a mocked `SearchOperations` bean; verify the `LlmReference` bean is present only with the profile.
- [x] 6.3 Generate an offline MCP test that asserts the profile-scoped `spring.ai.mcp.client.*` properties; verify it needs no Docker or live server.
- [x] 6.4 Verify the generated tests assert the same types `ChatActions` collects (`Tool`, `LlmReference`) and are included in `./mvnw test`.

## 7. Router, pipeline, and Manna tests

- [x] 7.1 Update `generator/urbot/route.mjs` so `urbot-tool-development` reports kind-specific target files and the `urbot-discovery → urbot-tool → urbot-verification` sequence; verify the route output.
- [x] 7.2 Update the `urbot-tool-development` entry in `workflows/routing/pipeline.json` to list `urbot-discovery`, `urbot-tool`, and `urbot-verification`; verify `npm run validate` passes.
- [x] 7.3 Add `scripts/dev/test-tool-development.mjs` with a deterministic fixture mode that applies each kind, asserts the generated files, side effects, secrets, profile gating, and collection types, and refuses unsafe writes.
- [x] 7.4 Add the real-checkout mode (`--project <dir>`): copy the checkout, ensure the bot profile exists, apply the tool kinds, and run `./mvnw -q -DskipTests compile`, `./mvnw -q test`, and the generated tests.
- [x] 7.5 Add `test:tool` to `package.json` and include the deterministic mode in `npm test`; verify `npm test` passes without network.
- [x] 7.6 Run the real-checkout mode against a shallow Urbot clone and confirm compile, tests, and generated tests pass; confirm the original clone is unchanged.

## 8. Docs and final verification

- [x] 8.1 Update `AGENTS.md`/`README.md` with the tool write flow, side-effect classification, secrets, `CHECKPOINT: TOOLS`, and the domain/memory handoff; verify `npm run check:positioning` passes.
- [x] 8.2 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.
- [x] 8.3 Run `npm run validate`, `npm run check:positioning`, `npm run test:routing`, `npm test`, and `openspec validate implement-urbot-tool-development --strict`; confirm all pass.
- [x] 8.4 Verify every kind generates the expected artifact, side effects are declared, ChatActions collection is tested, and no core/domain/memory file is created.
