# Design

## Context

See `proposal.md` — Why. Phase 2 made profile writes the first mutation path. Phase 3 adds the tool path. The
authoritative Urbot behavior is source-backed:

- `ChatActions` is injected with `List<LlmReference>` and `List<Tool>`; Spring collects every bean of those
  types from the application context. No core wiring is needed for a bot tool.
- `@LlmTool` methods are converted with `Tool.fromInstance(instance)`, which returns one `Tool` per annotated
  method. A single `Tool` bean can select one of them, or an `LlmReference` can expose the whole instance.
- `LlmReference.of(name, description, tools, notes)` creates a reference; `ToolishRag` is an `LlmReference`
  built from `SearchOperations` and can filter by the `context` metadata key and unfold its tools.
- `Subagent.ofClass(Agent.class).consuming(Input.class)` creates a tool that delegates to an `@Agent` class.
- MCP clients come from `spring.ai.mcp.client.*`; `McpToolsConfiguration.mcpTools` already exposes them as a
  single `Tool` bean.
- `./mvnw test` runs unit tests only and needs no Neo4j or API key.

## Goals / Non-Goals

**Goals:**

- Generate the five tool kinds in the target bot package with profile-gated configuration.
- Make the `ChatActions` collection contract explicit and testable.
- Keep Manna's side-effect, secret, idempotency, and approval policy as development guidance.
- Hand off domain/memory changes to a separate workflow.
- Verify with Urbot compile/tests and generated offline tests.

**Non-Goals:**

- Domain or memory implementation.
- A second machine-readable Urbot tool spec.
- Router execution of multiple unbounded workflows.
- Live Stripe/MCP/LLM calls in CI.
- Core Urbot edits or a second application.

## Decisions

### D1. Five tool kinds and generated artifacts

`skills/urbot-tool/scripts/apply.mjs` takes `--kind` and generates:

| Kind | Main artifacts |
|------|----------------|
| `llm-tool` | `<ToolName>Tools.java` (`@LlmTool`), `<ToolName>ToolConfiguration.java` (`Tool` bean), test |
| `llm-reference` | `<ToolName>Tools.java`, config with `LlmReference` bean, test |
| `toolish-rag` | config with `ToolishRag` bean, test |
| `subagent` | `<ToolName>Agent.java` (`@Agent`/`@Action`), config with `Subagent` bean, test |
| `mcp` | profile-scoped `spring.ai.mcp.client.*` properties, offline properties test |

Each configuration class is `@Configuration @Profile("<bot>")` in
`src/main/java/com/embabel/bot/<bot>/`. Using one config per tool avoids editing the profile configuration
and keeps re-runs idempotent.

Representative generated code:

```java
@Configuration
@Profile("travel")
public class WeatherToolConfiguration {
    @Bean
    Tool weatherTool() {
        return Tool.fromInstance(new WeatherTools()).get(0);
    }
}
```

```java
@Bean
LlmReference travelDocs(SearchOperations searchOperations) {
    return new ToolishRag("travel_docs", "Travel documents", searchOperations)
            .withMetadataFilter(new PropertyFilter.Eq("context", "global"))
            .withUnfolding();
}
```

```java
@Bean
Subagent weatherSubagent() {
    return Subagent.ofClass(WeatherAgent.class).consuming(String.class);
}
```

*Alternative considered:* edit the existing bot `Configuration` class in place. Rejected — it is harder to
merge safely and makes re-runs non-idempotent.

### D2. ChatActions collection is the contract

`ChatActions` collects `List<Tool>` and `List<LlmReference>`; it does not need to know the tool kinds. The
generated tests therefore assert the beans by those types:

```java
new ApplicationContextRunner()
    .withUserConfiguration(WeatherToolConfiguration.class)
    .withPropertyValues("spring.profiles.active=travel")
    .run(context -> assertThat(context.getBeansOfType(Tool.class)).containsKey("weatherTool"));
```

A second run without the profile asserts the bean is absent. For `ToolishRag`, the test provides a mock
`SearchOperations`; for `Subagent`, it asserts the `Tool` bean. MCP is verified at the properties level because
the existing `mcpTools` bean is the collection point and no live server is required.

*Alternative considered:* instantiate all of `ChatActions` in each generated test. Rejected — it needs
`UrbotProperties`, memory, persistence, and event dependencies; asserting the injected bean types proves the
same collection contract with less coupling.

### D3. Side effects are Manna policy, not a Urbot spec

The only allowed values are `read`, `internal-write`, `external-write`, and `destructive`, matching
`policies/tool-safety.md`. The declaration lives in the Manna plan/report and the workflow output. No
machine-readable Urbot tool-spec file or schema is added. A generated `@LlmTool` remains an ordinary Java
bean.

Mapping:

- `read`: weather lookup, `ToolishRag`, read-only MCP.
- `internal-write`: writes to the project's own state (future memory/pipeline work).
- `external-write`: Stripe charge, external webhook; requires idempotency or dry-run plus approval.
- `destructive`: deletion or irreversible mutation; never auto-applied.

### D4. Safe external writes and destructive actions

- `external-write` requires `--idempotency-key` or `--dry-run`; the generated method is a dry-run stub and
  never performs the real mutation.
- `destructive` returns a plan with `status: "blocked-destructive"` and writes nothing; the workflow stops for
  explicit human confirmation. This change does not auto-generate destructive tools.
- Secrets are named in the plan (`--secrets STRIPE_SECRET_KEY`) and never written into source, properties, or
  tests. `external-write` without a declared secret stops the plan.

### D5. Cross-domain/memory handoff

A tool whose input or output requires a new `NamedEntity`, relation, or memory behavior is out of scope. The
plan returns `requires: "domain" | "memory" | "domain+memory"` and `status: "route-required"` with
`route: "urbot-domain-memory"`; it writes nothing. The tool workflow stops and tells the user to run the domain
and memory workflow first, then return. The router selects one primary workflow or asks one question; it never
runs both unbounded flows.

### D6. Generated tests

Each tool kind gets a bot-local test under `src/test/java/com/embabel/bot/<bot>/`:

- `llm-tool` / `llm-reference` / `subagent`: `ApplicationContextRunner` with the configuration and
  `spring.profiles.active=<bot>`; assert the bean is present by `Tool` or `LlmReference`, and absent without
  the profile.
- `toolish-rag`: same, with a mocked `SearchOperations` bean.
- `mcp`: an offline properties test asserting the profile-scoped `spring.ai.mcp.client.*` entries.

The tests are deterministic and run in `./mvnw test`; they never call Stripe, MCP, or an LLM.

### D7. Router and pipeline metadata

`generator/urbot/route.mjs` reports kind-specific target files and the
`urbot-discovery → urbot-tool → urbot-verification` sequence for `urbot-tool-development`. The tool intent
already matches English and Chinese tool phrases (`tool`, `mcp`, `subagent`, `工具`, `接入`, `子代理`).
`workflows/routing/pipeline.json` lists the three skills for the tool entry.

### D8. Workflow and checkpoint

`workflows/urbot-tool-development.md` runs discovery → tool → verification with `CHECKPOINT: TOOLS` before
writes. The `TOOLS` checkpoint in `policies/approval-checkpoints.md` approves tool contracts, side effects,
idempotency, secrets, and target files; it never approves domain/memory changes or core edits.

## Risks / Trade-offs

- **Generated stubs could be mistaken for working integrations** → Label them as dry-run stubs in the plan and
  test only collection/compilation, not live calls.
- **A tool needs a new domain type** → Stop and hand off to `urbot-domain-memory`; do not create a private type.
- **External writes slip through** → Require idempotency or dry-run plus approval; refuse writes without a
  declared secret.
- **MCP tests could need Docker** → Test the profile-scoped properties offline; never start a server in CI.
- **One config per tool can multiply files** → Acceptable for idempotency; later changes can consolidate.
- **The router might run both tool and domain flows** → The workflow returns `route-required`; the router
  selects one or asks.

## Migration Plan

1. Add `skills/urbot-tool/scripts/apply.mjs` with the five kinds and safety enforcement.
2. Update `urbot-tool/SKILL.md` and `urbot-tool-development.md`.
3. Update the `TOOLS` checkpoint guidance and `urbot-verification`.
4. Update the router, pipeline, and tool fixtures/evals.
5. Add `scripts/dev/test-tool-development.mjs` and wire it into `npm test`.
6. Run the deterministic test, then the real-checkout mode against a Urbot clone.
7. Roll back by removing the script/test and restoring the skeleton docs; generated files live only in the
   target checkout or temp copy.

## Open Questions

None blocking. Real Stripe/MCP integrations and domain/memory workflows are later changes.
