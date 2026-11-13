# AGENTS.md — Manna Workspace

This project is a Urbot checkout with the Manna AI Kit layered at the same root. OpenCode loads this file
automatically. Manna owns the development flow; Urbot remains the only runtime and domain authority.

## Layout

- Project root: the Urbot checkout (`pom.xml`, `src/main/java/com/embabel/urbot/`, `mvnw`)
- Manna kit: `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`
- OpenCode discovery: `.opencode/commands/` and `.opencode/skills/`
- OpenSpec root: `openspec/` (`config.yaml` and `specs/`)

All Urbot source paths are relative to {{URBOT_PROJECT}}.

## Start here

1. Read `skills/urbot-router/SKILL.md` to choose the development flow.
2. Use the matching document in `workflows/` for that flow.
3. Use the skill references and scripts under `skills/`.
4. Run the global `manna` command, or `node generator/manna.mjs` in this workspace.
5. Use the `opsx` commands from `.opencode/commands/` for OpenSpec changes.

## Build, run, and test

- Neo4j is required before startup: `docker compose up -d` (Bolt `7891`, HTTP `8892`; not the default
  7687/7474). `DrivineStore` calls `provision()` at bean creation, so the app fails without it.
- The provider is chosen by Maven profile activation on environment variables, not runtime config: export
  `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` *before* running so the matching `embabel-agent-starter-*` is on the
  classpath.
- Compile: `./mvnw -q -DskipTests compile`
- Unit tests: `./mvnw -q test`
- One test: `./mvnw -Dtest=<ClassName>Test test`
- Package: `./mvnw -DskipTests package`
- Run the default assistant: `./mvnw spring-boot:run`
- Run a bot profile: `./mvnw spring-boot:run -Dspring-boot.run.profiles=<bot>`
- No lint or formatter plugin is configured; verify with compile plus tests.
- `./aot.sh` uses plain `mvn` (not `./mvnw`), needs Java 24+, and deletes `target/` and `extracted/`.

## Tests

- `./mvnw test` runs unit tests only; no database or API key is needed.
- `*IT.java` are excluded from test compilation and Surefire in `pom.xml`, so Maven and CI never run them. Run
  them from the IDE (or temporarily remove both `testExcludes` and `excludes`); they need live Neo4j and an API
  key, use `@ActiveProfiles("it")`, `TestUrbotApplication` (security excluded), and clean up their isolated
  contexts.
- After changing prompts, run `TemplateRenderingTest`: it renders every Jinja template and catches broken
  `{% include %}`s, including ones from the `dice` dependency.
- `ByokFactoryClasspathTest` guards Embabel version-skew startup failures. Keep Embabel artifacts aligned
  through the `embabel-agent-dependencies` BOM; several artifacts are snapshots, so use `-U` to refresh.
- Smoke-test startup after dependency bumps: the Drivine RAG module (`embabel-agent-rag-neo-drivine`) has no
  release, only a `0.1.2-SNAPSHOT` built against old Embabel, while Embabel 1.5.x requires Spring Framework 7
  and Boot 4. `mvn test` will not catch wiring or classpath failures.

## Extension model (do not modify core for a new bot)

- Core code: `com.embabel.urbot`. Custom bots: `com.embabel.bot.<name>`, with every bean gated by
  `@Profile("<name>")`.
- A bot package is invisible unless listed in `urbot.bot-packages`; `BotPackageScanConfiguration` scans its
  beans and `PropositionConfiguration` also builds the DICE entity schema from the same packages.
- `Tool`, `LlmReference`, `ToolishRag`, and `Subagent` beans are auto-collected by `ChatActions` through
  `List<...>` injection — no explicit wiring.
- Entity extraction is only typed for `NamedEntity` subinterfaces in `urbot.bot-packages` or
  `urbot.memory.entity-packages`. The built-in `com.embabel.domain.personal` interfaces are not active by
  default (`entity-packages: []`).
- Config lives under `urbot.chat.*` (`persona`, `objective`, `behaviour`, `llm.model`, `max-words`).
  `src/main/java/com/embabel/bot/README.md` shows stale flat names such as `urbot.persona`; trust
  `application.yml` and `ChatbotOptions`.
- Templates are name-resolved from `src/main/resources/prompts/{personas,objectives,behaviours}/<name>.jinja`.

## RAG and memory scoping

- Every chunk carries metadata key `context` (`DocumentService.Context.CONTEXT_KEY`).
- Personal context is `<userId>_<contextName>` (default context name is `personal`, for example `1_personal`);
  global context is the literal `global`.
- `RagConfiguration.globalDocuments` filters `context=global`; `UrbotUser.references()` filters
  `context=effectiveContext()`. Preserve these filters when adding retrieval.

## Gotchas

- Login users come from `DummyUrbotUserService`: `alice` and `ben`, password `test` for both. The README's
  `admin`/`user` credential table is stale; Spring Security's generated form login is the only remaining entry
  point.
- `NullRequestCache` in `SecurityConfiguration` is deliberate: it prevents phantom JSESSIONID creation from
  stale requests that caused spontaneous logouts. Do not remove it; see `notes/LOGOUT.md`.
- Neo4j actuator health is intentionally disabled because Drivine manages its own connection.
- The MCP client is enabled by default and Brave search shells out to `docker run -i --rm mcp/brave-search`, so
  Docker must be running even with an empty `BRAVE_API_KEY`; disable it with
  `spring.ai.mcp.client.enabled=false` if it is not needed.
- `org.jspecify:jspecify` is an explicit dependency (Vaadin previously supplied it transitively); keep it if
  nullness annotations are used.
- Spring Security 7 removed `AntPathRequestMatcher`; use `PathPatternRequestMatcher` for request matchers (see
  `SecurityConfiguration`).

## Manna workflow

- Route before acting: `skills/urbot-router` and `workflows/routing/pipeline.json` decide the flow.
- Use `manna urbot inspect --project <dir> --request "<nl>"` for an explicit read-only route.
- Tool safety is non-negotiable: read `policies/tool-safety.md`. Default to read-only; `external-write` needs
  idempotency and approval; `destructive` is never auto-applied.
- One logical step per edit: inspect, plan, compile, contract test, then behavior check.
- Apply the smallest Urbot change; do not rewrite a bot or feature set in one pass.
- Human review stays in Git. Review diffs and pull requests; do not add a UI or admin surface.

## Source of truth

Resolve behavior from the project root, in this order:

1. `pom.xml`
2. `src/main/java/com/embabel/urbot/`
3. `src/main/java/com/embabel/bot/<botname>/`
4. `application-<profile>.properties`
5. `src/main/resources/prompts/`
6. `src/test/`
7. Git history

Source wins over prose. The bot `README.md` is known to lag the code and is not authoritative.

## Do not

- Create a second Spring Boot application, runtime, or domain model.
- Add Manna-generated project, spec, or domain artifacts; change Urbot source and specs instead.
- Edit the copied kit for product changes; change the Urbot checkout instead.
- Add a UI or admin surface; review changes in Git.
