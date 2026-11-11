# urbot-tool-development Specification

## Purpose
Defines how Manna generates Urbot tools — `@LlmTool`, `LlmReference`, `ToolishRag`, `Subagent`, and MCP — with
explicit side effects, secrets, approval, generated tests, and verification through Urbot's own build.

## Requirements

### Requirement: Tool kinds generate the expected Urbot artifacts

`urbot-tool` SHALL support five tool kinds and generate the corresponding artifacts in the target bot package:

- `llm-tool`: an `@LlmTool` class and a Spring `Tool` bean.
- `llm-reference`: an `@LlmTool` class and an `LlmReference` bean.
- `toolish-rag`: a `ToolishRag` bean.
- `subagent`: an `@Agent` class and a `Subagent` bean.
- `mcp`: profile-scoped `spring.ai.mcp.client.*` properties consumed by the existing `McpToolsConfiguration`.

Each kind SHALL place its beans in a `@Configuration @Profile("<bot>")` class in the bot package.

#### Scenario: LLM tool is generated

- **WHEN** a user requests a weather tool
- **THEN** an `@LlmTool` class and a Spring `Tool` bean are created in the target bot package
- **AND** the configuration class is profile-gated

#### Scenario: Reference and RAG beans are generated

- **WHEN** a user requests an `LlmReference` or `ToolishRag`
- **THEN** the corresponding `LlmReference` bean is created
- **AND** `ToolishRag` uses the injected `SearchOperations`

#### Scenario: Subagent is generated

- **WHEN** a user requests a Subagent
- **THEN** an `@Agent` class and a `Subagent` bean are created
- **AND** the Subagent consumes a declared input type

#### Scenario: MCP is configuration-first

- **WHEN** a user requests an MCP tool
- **THEN** profile-scoped `spring.ai.mcp.client.*` properties are written
- **AND** the existing `McpToolsConfiguration.mcpTools` bean exposes the clients without a core edit

### Requirement: ChatActions collects generated beans

Generated `Tool`, `LlmReference`, `ToolishRag`, and `Subagent` beans SHALL be discoverable through Spring's
`List<Tool>` / `List<LlmReference>` injection, which is how `ChatActions` collects them. No explicit wiring in
core code SHALL be required.

#### Scenario: Beans are visible to the collection contract

- **WHEN** the generated tool configuration is loaded with the bot profile active
- **THEN** the generated `Tool` or `LlmReference` bean is present in the context by that type
- **AND** the inactive profile does not expose it

#### Scenario: MCP uses the existing collection path

- **WHEN** MCP properties are added for a bot profile
- **THEN** the existing `mcpTools` bean remains the collection point
- **AND** no core `McpToolsConfiguration` edit is made

### Requirement: Side effects are declared using Manna's policy

Every generated tool SHALL declare exactly one side effect: `read`, `internal-write`, `external-write`, or
`destructive`. The declaration SHALL live in Manna's plan/report and SHALL NOT create a second
machine-readable tool spec in Urbot.

#### Scenario: Read tool is declared

- **WHEN** a read-only weather or RAG tool is generated
- **THEN** its Manna plan declares `read`
- **AND** no write approval is required

#### Scenario: Internal write is declared

- **WHEN** a tool writes only to the project's own state
- **THEN** its plan declares `internal-write`
- **AND** the workflow requires review

#### Scenario: No second tool spec

- **WHEN** a tool is generated
- **THEN** Urbot receives Java beans, properties, and tests
- **AND** Manna does not add a machine-readable Urbot tool-spec file or schema

### Requirement: Secrets are declared by environment variable

A generated tool that needs a secret SHALL name the environment variable in its Manna plan and SHALL NOT embed
the secret value in source, properties, or tests.

#### Scenario: Stripe secret is named

- **WHEN** a Stripe integration is planned
- **THEN** the plan declares `STRIPE_SECRET_KEY`
- **AND** no secret value appears in the generated files

#### Scenario: Missing secret is visible

- **WHEN** a tool needs a secret that was not declared
- **THEN** the workflow stops before writing and asks for the environment variable name

### Requirement: External writes and destructive actions are safe

`external-write` tools SHALL require idempotency (or dry-run) plus approval. `destructive` tools SHALL NEVER be
auto-applied; this change SHALL only plan them and stop for explicit human confirmation.

#### Scenario: External write requires idempotency

- **WHEN** a Stripe write is planned
- **THEN** the plan declares an idempotency key or dry-run mode
- **AND** the generated tool does not perform a real charge

#### Scenario: Destructive action is blocked

- **WHEN** a destructive tool is requested
- **THEN** the workflow stops without writing
- **AND** reports that destructive actions require explicit human confirmation

### Requirement: The tool workflow runs in order with approval

`urbot-tool-development` SHALL run `urbot-discovery → urbot-tool → urbot-verification`. It SHALL stop at
`CHECKPOINT: TOOLS` before writing and SHALL run verification after the approved write.

#### Scenario: Write follows discovery and approval

- **WHEN** a tool change is requested
- **THEN** discovery reads the target bot before any write
- **AND** the plan is shown at `CHECKPOINT: TOOLS`
- **AND** files are written only after approval

#### Scenario: Verification follows the write

- **WHEN** the approved tool is written
- **THEN** `urbot-verification` runs the Urbot compile and tests
- **AND** reports the generated test result

### Requirement: Domain and memory changes are handed off

If a tool needs a new domain entity or memory behavior, the tool workflow SHALL stop and hand off to the
separate `urbot-domain-memory` workflow. The router SHALL select one workflow at a time and SHALL NOT execute
multiple unbounded flows.

#### Scenario: Domain-dependent tool stops

- **WHEN** a tool's input or output requires a new `NamedEntity` or memory behavior
- **THEN** the tool workflow stops before writing
- **AND** reports `urbot-domain-memory` as the next separate workflow

#### Scenario: Router selects one flow

- **WHEN** a request mixes a tool and a domain change
- **THEN** the router selects one primary workflow or asks one question
- **AND** it does not run both workflows concurrently

### Requirement: Examples are reproducible

The workflow SHALL support these inputs:

- "增加天气查询工具" — a read `@LlmTool`.
- "接入 Stripe" — an `external-write` tool with `STRIPE_SECRET_KEY`, idempotency or dry-run, and approval.
- "增加 MCP 工具" — profile-scoped MCP properties.
- "添加一个 Subagent" — an `@Agent` class and a `Subagent` bean.

#### Scenario: Weather example is generated

- **WHEN** the weather request is routed to `urbot-tool-development`
- **THEN** an `@LlmTool` weather class and a `Tool` bean are created
- **AND** the plan declares `read`

#### Scenario: Stripe example is safe

- **WHEN** the Stripe request is planned
- **THEN** the plan declares `external-write`, `STRIPE_SECRET_KEY`, and idempotency or dry-run
- **AND** the generated code is a dry-run stub

#### Scenario: MCP and Subagent examples are generated

- **WHEN** the MCP or Subagent request is routed
- **THEN** the MCP properties or the Subagent agent/config are generated
- **AND** the corresponding collection type is present

### Requirement: Generated tests prove collection

The workflow SHALL generate a bot-local test that activates the bot profile and asserts the generated bean is
discoverable as the type `ChatActions` collects, and that the inactive profile does not expose it. MCP tests
SHALL assert the profile-scoped properties without starting a live server.

#### Scenario: Tool test proves active and inactive states

- **WHEN** the generated tool test runs
- **THEN** the bean is present with the bot profile active
- **AND** absent when the profile is inactive

#### Scenario: MCP test is offline

- **WHEN** the MCP test runs
- **THEN** it asserts the profile-scoped properties
- **AND** it does not require Docker or a live MCP server

### Requirement: Verification uses Urbot's own commands

The workflow SHALL verify with `./mvnw -DskipTests compile` and `./mvnw test` in the target Urbot checkout.
It SHALL also run the generated tests. No core Urbot files SHALL be modified, and no second Spring Boot
application or copied domain model SHALL be created.

#### Scenario: Compile and tests pass

- **WHEN** the generated tools are applied to a Urbot checkout
- **THEN** `./mvnw -DskipTests compile` exits successfully
- **AND** `./mvnw test` exits successfully

#### Scenario: Core files are untouched

- **WHEN** a tool is applied
- **THEN** files under `src/main/java/com/embabel/urbot/` are unchanged
- **AND** no Tool or domain artifact is created outside the bot package

### Requirement: The Manna kit verifies the workflow

The Manna kit SHALL include a deterministic tool test in `npm test` and a real-checkout mode that runs the
Urbot compile, tests, and generated tests. The change SHALL pass `npm test` and
`openspec validate implement-urbot-tool-development --strict`.

#### Scenario: Deterministic test covers all kinds

- **WHEN** `npm test` runs
- **THEN** it generates each tool kind in a temporary fixture
- **AND** asserts side effects, secrets, profile gating, collection types, and generated tests

#### Scenario: Real-checkout mode runs Urbot verification

- **WHEN** the tool test is given a real Urbot checkout
- **THEN** it copies the checkout, applies the examples, and runs the Urbot compile and tests
- **AND** it does not modify the original checkout
