---
name: urbot-verification
description: Report Urbot project state and build, run, test, and verification commands without modifying source.
version: 0.1.0
mode-default: suggest
requires:
  - policies/approval-checkpoints.md
  - docs/architecture.md
  - workflows/routing/pipeline.json
---

# Urbot Verification

## When to use

A request asks whether a Urbot project compiles, passes tests, starts, or regressed.

## Inputs

- The target Urbot project.
- The requested verification scope: build, run, test, or regression.

## Build, run, and test commands

Build and test:

- `./mvnw -q -DskipTests compile`
- `./mvnw -q test`
- Single test: `./mvnw -Dtest=<ClassName>Test test`
- Package: `./mvnw -DskipTests package`
- `TemplateRenderingTest` after any prompt change: it renders every Jinja template and catches broken
  `{% include %}`s.

Run:

- Start Neo4j first: `docker compose up -d` (Bolt `7891`, HTTP `8892`). `DrivineStore` calls `provision()` at
  bean creation, so startup fails without it.
- Export `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` before starting; the Maven profile is selected by those
  environment variables, not by runtime config.
- Default assistant: `./mvnw spring-boot:run`
- Bot profile: `./mvnw spring-boot:run -Dspring-boot.run.profiles=<bot>`
- `./aot.sh` uses plain `mvn`, needs Java 24+, and deletes `target/` and `extracted/`.

Boundaries:

- `*IT.java` are excluded from test compilation and Surefire, so Maven and CI never run them. They need live
  Neo4j and an API key; say so instead of implying they ran.
- No lint or formatter plugin is configured; compile plus tests is the check.
- Smoke-test startup after dependency bumps; `mvn test` does not catch wiring or classpath failures.

## Process

1. Inspect Git status and the current commit.
2. For a profile change, check the activation contract:
   - the configuration class is `@Profile("<bot>")`;
   - `urbot.bot-packages=com.embabel.bot.<bot>` lives in `application-<bot>.properties`;
   - the configuration loads with the profile active and is absent when inactive.
3. For a tool change, check the collection contract:
   - the generated `Tool`/`LlmReference` bean is present with the bot profile active;
   - it is absent without the profile;
   - MCP is verified from profile-scoped properties without a live server;
   - no Stripe/MCP/LLM endpoint is called.
4. Report the commands for the requested scope: compile and test, plus the Neo4j, credential, and profile
   steps when the request asks to run.
5. State that integration tests are excluded unless the environment provides them.
6. Stop at `CHECKPOINT: VERIFICATION REPORT`.
7. Do not edit source and do not claim a command passed unless it ran.

## Output

A verification report with observed state, commands, run prerequisites, and open items.

## Do not

- Modify source or Git state.
- Mark a check as passed without running it.
- Hide a skipped integration test.
- Claim the app starts without Neo4j and a provider key.
