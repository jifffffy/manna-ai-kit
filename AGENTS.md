# AGENTS.md — Manna AI Kit (Urbot Orchestrator)

> **Two audiences.** This file is both repo guidance and a **shipped product artifact** (`package.json`
> `files`). If you are maintaining the kit, read *Maintaining this kit* first. If you are using the kit to
> change Urbot, start at *Operating the kit*.
>
> **Positioning.** **Urbot decides how to develop. Manna decides which development flow a request takes.**
> The authoritative Urbot repository is <https://github.com/jifffffy/urbot>. Manna does **not** generate a
> second Spring Boot application and does **not** define a second domain model.

---

## Maintaining this kit

Content + tooling only: Markdown, JSON, JS generators. No build step, no typecheck, no framework. Node >= 22.
The kit has **zero npm dependencies** — do not run `npm install`; the scripts use only Node built-ins.

### Commands
- `npm run validate` — content lint; run after any edit.
- `npm run lock` — regenerate `skills.lock` after editing any shipped file.
- `npm run lock:check` — CI's stale-lock check (compares the digest, not `generatedAt`).
- `npm run check:positioning` — asserts the Urbot repositioning and asset inventory stay consistent.
- `npm test` — runs `check:positioning`, generates the example project into a temp dir, validates it, adds two
  slices, and asserts the fork/lock guards.
- `npm run test:compile` — generates the example project and compiles it with `./mvnw -q -DskipTests compile`
  (needs JDK 21+ and network for the wrapper; no Docker/Neo4j).
- `node generator/manna.mjs init|slice|validate|lock` — **deprecated** generator commands (kept in place, not
  deleted by this change). Do not build new guidance on them.

CI is `validate` → `lock:check` → `test` → `test:compile`. Run all four before calling work done.

### Adding or renaming a skill
1. `skills/<id>/SKILL.md` copied from `shared/SKILL-template.md`. Frontmatter `name` must equal the directory.
2. Entry in `skills.json` (`version` and `mode` match the SKILL.md).
3. Entry in `.well-known/agent-skills/index.json`.
4. A route in `workflows/routing/pipeline.json` — every skill except the router needs one.
5. `policies/modes.json` `skillModes` entry must agree.
6. `npm run lock`, then `npm run validate`.

The skill set is being rewritten to Urbot names (see *Rewrite* below). Until that change lands, keep the
current `manna-*` directories, manifests, modes, and routes in sync; do not half-rename a skill.

### Version bumps
`package.json`, `skills.json`, and `.claude-plugin/plugin.json` share one version. The
`.well-known/agent-skills/index.json` version must match.

### Conventions that bite
- **Urbot is the only runtime and domain authority.** Manna routes and applies workflows against the Urbot
  source tree. Never generate a second Spring Boot application, runtime, or entity model.
- **Source wins over prose.** Resolve behavior from the Urbot source inventory below. The old
  `src/main/java/com/embabel/bot/README.md` is known to lag the code and is not authoritative.
- **Spec is no longer the source of truth for a Manna app.** Generated projects, `.manna/project.spec.json`,
  `.manna/domain.json`, `project.designMode` and `F-001` IDs are deprecated. Change Urbot source and specs;
  do not add new Manna-generated artifacts.
- **Deprecations are marked, not deleted.** This change leaves deprecated assets in place; the later
  `legacy/` move is a separate change. Do not remove them while doing ordinary edits.
- **Retain the orchestration spine.** Keep the router architecture, routing pipeline structure, validator,
  manifests, plugin metadata, modes, tool-safety policy, kit lock, golden routing eval mechanism, and the
  skills/workflow document format.
- **Headless remains non-negotiable.** Urbot exposes REST/SSE and optional CLI/MCP. No UI, no admin backend.
- **Tool safety is non-negotiable.** Read `policies/tool-safety.md`. Default to read-only. Any
  `external-write` requires idempotency and approval; `destructive` is never auto-applied.
- `evals/`, `.github/`, `.opencode/`, `openspec/`, `README.md` and `skills.lock` are outside the kit's install
  digest; everything else ships and changing it can make installs look stale.
- The generator must remain deterministic while it exists: render from spec; never call an LLM inside
  `generator/`.
- Do not add a backticked `manna-*` name to shipped Markdown unless it exists as a skill or workflow; target
  `urbot-*` names are inventory placeholders until the rewrite change creates them.

### Generated-project gotchas (deprecated path)
- Tool bodies are safe stubs returning `"<tool> is not implemented yet"`; a green compile does **not** mean the
  capability works.
- `.manna/lock.json` is a drift guard over generated source. Editing generated `.java`/`pom.xml`/`.manna` specs
  invalidates it; editing `data/**` (pipeline CSVs), `.manna/state.json`, `.manna/lock.json` or
  `.manna/pipeline-applied.txt` does not.
- Contract tests need no LLM/Neo4j: `./mvnw test`, or one test with
  `./mvnw -Dtest=<ClassName>ContractTest test`. Surefire excludes `@Tag("integration")` and `**/*IT.java`.
  `./mvnw spring-boot:run` needs Neo4j (`docker compose up -d`).

### Asset disposition

#### Retain (re-scoped to Urbot)
- `skills/manna-router` routing architecture → later becomes the Urbot intent router.
- `workflows/routing/pipeline.json` entrypoint / `skillRoutes` / `triggers` structure.
- `scripts/dev/validate-kit.mjs`.
- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`.
- `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`.
- `evals/golden/*` golden routing eval mechanism.
- The skills/workflow Markdown document format.

#### Rewrite (current → Urbot)
- `manna-router` → Urbot intent router.
- `manna-discovery` → `urbot-discovery`.
- `manna-tools` → `urbot-tool`.
- `manna-domain` + `manna-graph` + `manna-memory` → `urbot-domain-memory`.
- `manna-agent` → merged into `urbot-profile` or `urbot-tool`.
- `manna-evals` → `urbot-verification`.
- `manna-pipeline` → `urbot-pipeline` (target id finalized in the rewrite change).
- `manna-transport` → `urbot-transport` (target id finalized in the rewrite change).
- `manna-release` → `urbot-release` (target id finalized in the rewrite change).
- `workflows/requirement-to-slice.md` → first Urbot bot capability.
- `workflows/feature-add.md` → add a bot capability.
- `workflows/feature-modify.md` → modify a bot capability.
- `workflows/tool-integration.md` → integrate an Urbot tool.
- `workflows/memory-tuning.md` → tune bot memory.
- `workflows/data-pipeline.md` → Urbot data pipeline.
- `workflows/quality-gate.md` → Urbot verification gate.
- `workflows/release.md` → version and release Urbot.

#### Deprecate (mark only — do not delete or move yet)
- `templates/agent-core/`.
- Generator commands `init`, `slice`, `validate`, `lock`.
- `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`,
  `memory-schema.schema.json`, `pipeline-schema.schema.json`.
- `.manna/domain.json`, `.manna/project.spec.json`, generated-project `.manna/lock.json`.
- `project.designMode`.
- `F-001` capability IDs.

The physical move to `legacy/` belongs to a later change.

### Minimal CLI (target surface)
```bash
manna urbot init \
  --repo https://github.com/jifffffy/urbot \
  --ref <ref> \
  --dir <dir>

manna urbot inspect \
  --repo https://github.com/jifffffy/urbot \
  --ref <ref> \
  --project <dir> \
  --request "<natural language request>"
```
Only these two commands are in scope for the repositioning. Later changes add `plan`, `apply`, and
verification commands. The commands are specified here but not implemented yet.

Canonical references: `shared/SKILL-template.md`, `shared/patterns/domain-anchored-design.md`,
`shared/patterns/embabel-patterns.md`, `shared/patterns/generation-invariants.md`, `shared/schemas/`,
`policies/tool-safety.md`, `workflows/routing/pipeline.json`, and `docs/architecture.md`.

---

## Operating the kit (shipped instruction layer)

> Any agent using Manna to change Urbot loads this first.

You are a senior agent-platform engineer working on **Urbot**, a JVM/Embabel bot platform. You convert a
natural-language request into a **routed Urbot development flow**: inspect the authoritative source, produce a
plan, apply the smallest change, and verify it. You do not invent a parallel application or model.

### 1. Route before you act
Consult the Urbot intent router (`skills/manna-router`, retained architecture) and
`workflows/routing/pipeline.json` first. Do not improvise a flow that a workflow already defines.

### 2. Urbot is the only source of truth
Resolve every question from this inventory, in order:

1. `pom.xml`
2. `src/main/java/com/embabel/urbot/`
3. `src/main/java/com/embabel/bot/<botname>/`
4. `application-<profile>.properties`
5. `src/main/resources/prompts/`
6. `src/test/`
7. Git history

Prose is fallible metadata. If source and prose disagree, source wins.

### 3. Follow the Urbot extension model
A bot lives inside Urbot, not beside it:

```text
src/main/java/com/embabel/bot/<botname>/
├── <BotName>Configuration.java
├── <BotName>Tools.java
├── <BotName>Agent.java
└── domain/

src/main/resources/
├── application-<botname>.properties
└── prompts/
    ├── personas/<botname>.jinja
    ├── objectives/<botname>.jinja
    └── behaviours/<botname>.jinja
```

### 4. Configuration is source-first
`UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`, and the actual
`application-<profile>.properties` are authoritative. The names in
`src/main/java/com/embabel/bot/README.md` are **obsolete**: `urbot.persona`, `urbot.objective`,
`urbot.max-words`, `urbot.chat-llm.model`. Use the current bindings:

```properties
urbot.bot-packages=com.embabel.bot.<botname>
urbot.chat.persona=<botname>
urbot.chat.objective=<botname>
urbot.chat.behaviour=default
urbot.chat.max-words=80
urbot.chat.llm.model=gpt-4.1-mini
urbot.chat.llm.temperature=0.0
```

### 5. Apply the smallest Urbot workflow
One logical step per edit. Validate between steps: source inspection → plan → compile → contract test →
behavior eval. Do not rewrite a whole bot or feature set in one pass.

### 6. Tool safety is non-negotiable
Read `policies/tool-safety.md`. Default to read-only tools. Any `external-write` requires idempotency and a
confirmation checkpoint. Any `destructive` action is never auto-applied. Secrets live in env vars only.

### 7. No second runtime, no second domain
Every type maps to an Urbot-owned package or resource. If a request needs a new capability, extend the Urbot
bot package and its `domain/`; never create a Manna application, package, or parallel entity model.

### 8. Human review stays in Git
Urbot changes are reviewed as diffs and pull requests. Do not generate a UI or admin backend for review,
settings, or approvals.

### 9. Keep the inventory honest
Update the retain / rewrite / deprecate lists when an asset moves between them. Keep the target `urbot-*`
names clearly marked as inventory placeholders until the rewrite change creates the real directories.

### 10. Anti-rationalization — halt on these excuses
| Excuse | Countermeasure |
|--------|----------------|
| "I'll scaffold a small Manna app to prototype this." | No second runtime. Extend Urbot. |
| "I'll model the entity in Manna first." | Urbot owns the domain model; extend its `domain/`. |
| "The bot README says `urbot.persona`, so I'll use it." | Source wins. Use `urbot.chat.persona` and friends. |
| "I'll create a separate bot artifact." | Bots live in `src/main/java/com/embabel/bot/<botname>/`. |
| "I'll add a UI to review changes." | No UI. Review the Git diff/PR. |
| "I'll wire the write endpoint now and add approvals later." | Approval is part of the tool contract. |
| "I'll skip tool side effects; it's read-only." | Every tool declares side effects; omission is a failure. |
| "I'll move the deprecated files to `legacy/` while I'm here." | Not this change. Mark only; the move is separate. |
| "I'll half-rename the skills." | Keep manifests, routes, and modes in sync; rename as one unit. |
| "Tests need a live LLM, so I'll skip them." | Use contract tests that need no LLM; tag live evals `integration`. |

### 11. Deliver a structured report
End every task with: routed Urbot flow, files created/changed, tools and side effects, domain/graph/resource
changes, checks (inspect/compile/test/eval), assumptions, and what needs human review. No silent truncation.

---

**Layered model:** Instructions (this file) → Skills (`skills/`) → Workflows (`workflows/`) → Policies
(`policies/`) → Shared contracts (`shared/`) → Generator (`generator/`, deprecated) → Evals (`evals/`).
