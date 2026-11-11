# Tasks

## 1. Reposition the entry documents

- [x] 1.1 Rewrite the opening of `AGENTS.md` so it states that Urbot decides how to develop and Manna decides which development flow a request takes; verify by searching `AGENTS.md` for the new positioning statement and confirming no claim that Manna generates a second runtime.
- [x] 1.2 Rewrite `README.md` with the same positioning, the fixed repository `https://github.com/jifffffy/urbot`, and the orchestrator boundary; verify both entry documents agree and `rg -n "second|second runtime|project generator" AGENTS.md README.md` shows no contradictory claim.
- [x] 1.3 Update `docs/architecture.md` so the layered model describes Urbot-authoritative orchestration; verify the document no longer presents Manna as the owner of the Spring Boot runtime or domain model.

## 2. Record the Urbot source of truth

- [x] 2.1 Add the authoritative Urbot source inventory to `AGENTS.md` and `README.md`: `pom.xml`, `src/main/java/com/embabel/urbot/`, `src/main/java/com/embabel/bot/<botname>/`, `application-<profile>.properties`, `src/main/resources/prompts/`, `src/test/`, Git history; verify every path is present and the "source wins over prose" rule is stated.
- [x] 2.2 Add the source-priority rule to the orchestration guidance; verify a reviewer can tell that `src/main/java/com/embabel/bot/README.md` is not authoritative when it conflicts with source.

## 3. Document the Urbot extension model

- [x] 3.1 Ensure `design.md` documents the bot package layout (`<BotName>Configuration`, `<BotName>Tools`, `<BotName>Agent`, `domain/`) and the bot resource layout (`application-<botname>.properties`, `prompts/personas|objectives|behaviours/<botname>.jinja`); verify the paths are exact and match the spec scenarios.
- [x] 3.2 Add a short extension-model summary to `README.md` (or `docs/architecture.md`) pointing at `design.md`; verify the summary does not introduce an alternative package or resource convention.

## 4. Make configuration source-first

- [x] 4.1 Add the obsolete-property notice to the docs: `urbot.persona`, `urbot.objective`, `urbot.max-words`, `urbot.chat-llm.model` are out of date because `src/main/java/com/embabel/bot/README.md` lags the source; verify the notice names `UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`, and `application-<profile>.properties` as authoritative.
- [x] 4.2 Add the current binding example (`urbot.bot-packages`, `urbot.chat.persona`, `urbot.chat.objective`, `urbot.chat.behaviour`, `urbot.chat.max-words`, `urbot.chat.llm.model`, `urbot.chat.llm.temperature`); verify no legacy name appears in the example.

## 5. Publish the retain inventory

- [x] 5.1 Add the retain list to `AGENTS.md` and `README.md`: router architecture, routing pipeline structure, `scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`, golden routing eval mechanism, skills/workflow document format; verify each item is named and described as retained and re-scoped.

## 6. Publish the rewrite inventory

- [x] 6.1 Add the rewrite list: `manna-router` → Urbot intent router; `manna-discovery` → `urbot-discovery`; `manna-tools` → `urbot-tool`; `manna-domain` + `manna-graph` + `manna-memory` → `urbot-domain-memory`; `manna-agent` merged into `urbot-profile` or `urbot-tool`; `manna-evals` → `urbot-verification`; all workflows → Urbot development steps; `AGENTS.md` → Urbot-authoritative; verify every current skill and workflow appears exactly once.
- [x] 6.2 Verify the rewrite list does not add a second runtime or a second domain model by checking that each rewritten skill maps to an Urbot-owned artifact.

## 7. Publish the deprecate inventory (mark only)

- [x] 7.1 Add the deprecate list: `templates/agent-core/`; generator `init`/`slice`/`validate`/`lock`; `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`, `memory-schema.schema.json`, `pipeline-schema.schema.json`; `.manna/domain.json`; `.manna/project.spec.json`; generated-project `.manna/lock.json`; `project.designMode`; `F-001` capability IDs; verify each item is labeled deprecated.
- [x] 7.2 Verify deprecation is marking only: confirm no file or directory from the deprecate list is moved or deleted in this change (`git status` shows no `legacy/` move and no removed deprecated assets).

## 8. Specify the minimal CLI surface

- [x] 8.1 Ensure `design.md` contains `manna urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir>` and `manna urbot inspect --repo https://github.com/jifffffy/urbot --ref <ref> --project <dir> --request "<nl>"`; verify both commands and all flags are present.
- [x] 8.2 Verify the CLI section states that later workflow commands are introduced in later changes and that `init`/`inspect` are not presented as already implemented.

## 9. Verification

- [x] 9.1 Run a documentation consistency check: confirm `AGENTS.md`, `README.md`, `design.md`, and the spec all use the same repository URL, extension-model paths, source inventory, and configuration names; verify with `rg -n` for each required phrase.
- [x] 9.2 Verify the retain / rewrite / deprecate inventories are machine-checkable: every current skill directory and workflow document appears in exactly one inventory (allow `rg`/script check), and the counts do not silently shrink.
- [x] 9.3 Verify the minimal CLI scope is explicit and no later command is listed as in scope.
- [x] 9.4 Run `npm test` and confirm the kit generator/validator suite still passes.
- [x] 9.5 Run `openspec validate reposition-manna-as-urbot-orchestrator --strict` and confirm it passes.
- [x] 9.6 Confirm no artifact describes a "second runtime" or "second domain model"; verify with a targeted search and manual review.
- [x] 9.7 Resolve kit-lock drift caused by planning scaffolding: either exclude `openspec/` and `.opencode/` from `scripts/dev/update-lock.mjs` or regenerate `skills.lock`, then verify `npm run lock:check` passes. (Investigation showed these paths already make the lock stale.)
