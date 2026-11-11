---
name: urbot-verification
description: Report Urbot project state and verification commands without modifying source.
version: 0.1.0
mode-default: suggest
requires:
  - policies/approval-checkpoints.md
  - docs/architecture.md
  - workflows/routing/pipeline.json
---

# Urbot Verification

## When to use

A request asks whether a Urbot project compiles, passes tests, or regressed.

## Inputs

- The target Urbot project.
- The requested verification scope.

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
4. Run or report the relevant commands: `./mvnw -q -DskipTests compile` and `./mvnw -q test`.
5. State that integration tests are excluded unless the environment provides them.
6. Stop at `CHECKPOINT: VERIFICATION REPORT`.
7. Do not edit source and do not claim a command passed unless it ran.

## Output

A verification report with observed state, commands, and open items.

## Do not

- Modify source or Git state.
- Mark a check as passed without running it.
- Hide a skipped integration test.
