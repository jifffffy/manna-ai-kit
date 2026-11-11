# Architecture

## Positioning

Manna is a **natural-language development orchestrator for Urbot**, not an application factory.

- Urbot decides **how to develop**: runtime, configuration, domain, and extension conventions.
- Manna decides **which development flow a request takes**: route, inspect, plan, apply, verify.
- Authoritative Urbot repository: <https://github.com/jifffffy/urbot>.

Manna does not own a Spring Boot runtime and does not define a domain model. The retired generator, templates,
schemas, examples, and tests live under `legacy/`; they are historical reference only and are not part of the
main path.

## Layers

```text
Instructions   AGENTS.md (Urbot-authoritative)
Skills         how to perform one kind of Urbot change
Workflows      order, checkpoints, hand-offs
Policies       modes, tool safety, approvals
Shared         patterns, schemas, report contracts
Evals          golden routing and verification checks
Urbot CLI      generator/manna.mjs + generator/urbot/
Legacy         legacy/ (historical, not shipped, do not import)
```

## Urbot authority

Resolve behavior from the Urbot source, in order: `pom.xml`, `src/main/java/com/embabel/urbot/`,
`src/main/java/com/embabel/bot/<botname>/`, `application-<profile>.properties`,
`src/main/resources/prompts/`, `src/test/`, Git history. Prose is fallible metadata; source wins.

A bot is an extension inside Urbot:

```text
src/main/java/com/embabel/bot/<botname>/
├── <BotName>Configuration.java
├── <BotName>Tools.java
├── <BotName>Agent.java
└── domain/

src/main/resources/
├── application-<botname>.properties
└── prompts/{personas,objectives,behaviours}/<botname>.jinja
```

Configuration follows the same rule: `UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`, and
the actual `application-<profile>.properties` are authoritative. The legacy names `urbot.persona`,
`urbot.objective`, `urbot.max-words`, and `urbot.chat-llm.model` are obsolete.

## Minimal CLI (Phase 1: read-only)

```bash
manna urbot init \
  --repo https://github.com/jifffffy/urbot \
  --ref <ref> \
  --dir <dir> \
  [--write-state]

manna urbot inspect \
  --repo https://github.com/jifffffy/urbot \
  --ref <ref> \
  --project <dir> \
  --request "<natural language request>" \
  [--write-state]
```

`init` records the resolved commit. `inspect` reads the project and routes the request without writing to it.
State writing is opt-in and gitignored. Later changes add `plan`, `apply`, and real modification workflows.

## Orchestration flow

```text
Request
  → route to a Urbot workflow
  → inspect authoritative source
  → plan the smallest change
  → apply inside the Urbot source tree
  → verify (compile, contract test, eval)
  → review as a Git diff / PR
```

The router is the retained `skills/manna-router` architecture, driven by
`workflows/routing/pipeline.json`. Skills and workflows are content; the validator, manifests, modes, tool
safety, lock, and golden routing eval mechanism are the spine that stays intact.

## Asset disposition

- **Retain**: routing architecture, routing pipeline structure, validator, manifests, plugin metadata, modes,
  tool-safety policy, kit lock, golden routing eval mechanism, document format.
- **Rewrite**: all `manna-*` skills to `urbot-*` names (see `README.md`), all workflows to Urbot development
  steps, and `AGENTS.md` to Urbot-authoritative guidance.
- **Moved to `legacy/`**: `legacy/templates/agent-core/`, the retired generator commands and `lib/`, the five
  project schemas, `legacy/examples/`, `legacy/scripts/`, and `legacy/evals/golden/`. `.manna` project
  artifacts, `project.designMode`, and `F-001` IDs live inside those assets. Deletion is a later release.

## Verification ladder

1. Source inspection against the authority order.
2. Spec and workflow consistency.
3. Compile.
4. Contract tests (no LLM, no network).
5. Integration tests (tagged `integration`).
6. Behavior and routing evals.
7. Safety review and drift/lock check.

Higher layers never replace lower ones.

## Non-goals

- A second Spring Boot application or a second domain model.
- UI or admin surfaces; review stays in Git.
- Fully autonomous delivery without human review.
- Extending the deprecated generator.
