# Proposal

## Why

Manna is currently framed as a project generator that scaffolds and maintains its own Spring Boot
application. That creates a second runtime, a second domain model, and a second source of truth alongside
Urbot, so every change has to be maintained in two places. This change repositions Manna as a
**natural-language development orchestrator for Urbot**: Urbot remains the only system that defines how the
application is built and behaves; Manna only decides which development workflow a user's request should follow
and how to apply that workflow against the Urbot source tree.

## What Changes

- Rewrite `AGENTS.md` and `README.md` around the new positioning: **Urbot decides "how to develop"; Manna
  decides "which development flow the request takes"**.
- Declare Urbot as the sole source of truth. Manna SHALL NOT generate a second Spring Boot application and
  SHALL NOT define a second domain model.
- Record the authoritative Urbot extension model: bot package layout
  (`<BotName>Configuration` / `<BotName>Tools` / `<BotName>Agent` / `domain/`), bot resources
  (`application-<botname>.properties`,
  `prompts/personas|objectives|behaviours/<botname>.jinja`).
- Record that configuration is source-first: the outdated property names in
  `src/main/java/com/embabel/bot/README.md` (`urbot.persona`, `urbot.objective`, `urbot.max-words`,
  `urbot.chat-llm.model`) are obsolete. `UrbotProperties.java`, `ChatbotOptions.java`, `application.yml` and
  the actual `application-<profile>.properties` win. Document the current binding example
  (`urbot.bot-packages`, `urbot.chat.persona`, `urbot.chat.objective`, `urbot.chat.behaviour`,
  `urbot.chat.max-words`, `urbot.chat.llm.model`, `urbot.chat.llm.temperature`).
- Freeze three inventories: **retain**, **rewrite**, **deprecate**. This change marks deprecations only; it
  does not move files.
- **BREAKING**: the retained assets are re-scoped to Urbot. `manna-router` becomes an Urbot intent router;
  the remaining skills are renamed/merged per the rewrite inventory; all workflows become Urbot development
  steps.
- **BREAKING**: mark the Manna project generator, its schemas, `.manna/*` project artifacts, `designMode` and
  `F-001` capability IDs as deprecated for this product (removal happens in a later change).
- Define the minimal CLI surface for this repositioning: `manna urbot init` and `manna urbot inspect`.
  Further workflow commands are introduced in later changes.

## Capabilities

### New Capabilities

- `manna-urbot-orchestrator`: defines the orchestrator's positioning, repository-authority rules, retained /
  rewritten / deprecated asset contract, configuration source-of-truth, and the minimal `manna urbot` CLI
  surface.

### Modified Capabilities

None. No existing capability specs exist under `openspec/specs/`.

## Impact

- **Documentation**: `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/` guidance.
- **Retained (re-scoped)**: `skills/manna-router` architecture, `workflows/routing/pipeline.json` structure,
  `scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`,
  `.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`,
  golden routing eval mechanism, and the skills/workflow document format.
- **Rewritten**: `manna-router` → Urbot intent router; `manna-discovery` → `urbot-discovery`;
  `manna-tools` → `urbot-tool`; `manna-domain` + `manna-graph` + `manna-memory` → `urbot-domain-memory`;
  `manna-agent` merged into `urbot-profile` or `urbot-tool`; `manna-evals` → `urbot-verification`; all
  workflows and `AGENTS.md` rewritten for Urbot.
- **Deprecated (marked only)**: `templates/agent-core/`, generator `init`/`slice`/`validate`/`lock`,
  `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`,
  `memory-schema.schema.json`, `pipeline-schema.schema.json`, `.manna/domain.json`,
  `.manna/project.spec.json`, generated-project `.manna/lock.json`, `project.designMode`, `F-001` capability
  IDs.
- **CLI**: adds the `manna urbot init` and `manna urbot inspect` command surface; no remote fetch or real
  modification workflow is implemented by this change.
- **Out of scope**: remote repository retrieval, the full router and skill/workflow rewrite, real modification
  workflows, moving deprecated content into `legacy/`, generating a second Spring Boot application, and
  defining a second domain model.
