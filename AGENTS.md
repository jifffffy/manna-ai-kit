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
- `npm run check:positioning` — asserts the Urbot positioning and asset inventory stay consistent.
- `npm run check:urbot-only` — asserts the main path is Urbot-only and no legacy assets or references remain.
- `npm run test:init` — checks the project init contract, tag selection, clone/reuse, overwrite copy, and the
  single `AGENTS.md`.
- `npm run test:data` — checks the review CSV validator, the apply gate, and the status counts.
- `npm test` — runs `check:positioning`, `check:urbot-only`, the routing evals, the profile check, the tool
  check, the domain-design check, the data-enhancement check, and the one-step init check.

CI is `validate` → `lock:check` → `test`. Run all three before calling work done.

### Urbot-only main path
The retired generator, templates, schemas, examples, tests, and all `manna-*` skills/workflows have been
deleted. The main path is Urbot-only: `generator/manna.mjs`, `generator/urbot/`, the nine `urbot-*` skills,
the eight `urbot-*` workflows, and the retained orchestration spine. Do not reintroduce a legacy path.

### Adding or renaming a skill
1. `skills/<id>/SKILL.md` copied from `shared/SKILL-template.md`. Frontmatter `name` must equal the directory.
2. Entry in `skills.json` (`version` and `mode` match the SKILL.md).
3. Entry in `.well-known/agent-skills/index.json`.
4. A route in `workflows/routing/pipeline.json` — every skill except the router needs one.
5. `policies/modes.json` `skillModes` entry must agree.
6. `npm run lock`, then `npm run validate`.

The skill set is Urbot-only. Add `urbot-*` skills and keep `skills.json`, `.well-known`,
`workflows/routing/pipeline.json`, `policies/modes.json`, and `skills.lock` in sync.

### Version bumps
`package.json`, `skills.json`, and `.claude-plugin/plugin.json` share one version. The
`.well-known/agent-skills/index.json` version must match.

### Conventions that bite
- **Urbot is the only runtime and domain authority.** Manna routes and applies workflows against the Urbot
  source tree. Never generate a second Spring Boot application, runtime, or entity model.
- **Source wins over prose.** Resolve behavior from the Urbot source inventory below. The old
  `src/main/java/com/embabel/bot/README.md` is known to lag the code and is not authoritative.
- **Spec is no longer the source of truth for a Manna app.** Generated projects, `.manna/project.spec.json`,
  `.manna/domain.json`, `project.designMode` and `F-001` IDs are deleted. Change Urbot source and specs; do
  not add Manna-generated artifacts.
- **Urbot-only main path.** The retired generator, `manna-*` skills, and legacy workflows have been deleted.
  Do not reintroduce them under any name.
- **Retain the orchestration spine.** Keep the router architecture, routing pipeline structure, validator,
  manifests, plugin metadata, modes, tool-safety policy, kit lock, golden routing eval mechanism, and the
  skills/workflow document format.
- **Headless remains non-negotiable.** Urbot exposes REST/SSE and optional CLI/MCP. No UI, no admin backend.
- **Tool safety is non-negotiable.** Read `policies/tool-safety.md`. Default to read-only. Any
  `external-write` requires idempotency and approval; `destructive` is never auto-applied.
- `evals/`, `.github/`, `.opencode/`, `openspec/`, `README.md` and `skills.lock` are outside the kit's install
  digest; everything else ships and changing it can make installs look stale.
- Do not add a backticked `manna-*` name; the skill set is Urbot-only.

### Urbot verification notes
- Contract tests need no LLM/Neo4j: `./mvnw test`, or one test with
  `./mvnw -Dtest=<ClassName>Test test`. Surefire excludes `@Tag("integration")` and `**/*IT.java`.
- `./mvnw spring-boot:run` needs Neo4j (`docker compose up -d`) and the model credentials.

### Asset disposition

#### Retain
- `skills/urbot-router` routing architecture.
- `workflows/routing/pipeline.json` entrypoint / `skillRoutes` / `triggers` structure.
- `scripts/dev/validate-kit.mjs`.
- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`.
- `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`.
- `evals/golden/*` golden routing eval mechanism.
- `shared/SKILL-template.md` (skills/workflow document format).

#### Urbot-only assets
- `skills/urbot-router`, `skills/urbot-discovery`, `skills/urbot-profile`, `skills/urbot-tool`,
  `skills/urbot-domain-design`, `skills/urbot-domain-memory`, `skills/urbot-prompt`,
  `skills/urbot-verification`, `skills/urbot-data-enhance-pipeline`.
- `workflows/urbot-bootstrap.md`, `workflows/urbot-profile-change.md`,
  `workflows/urbot-prompt-tuning.md`, `workflows/urbot-tool-development.md`,
  `workflows/urbot-domain-design.md`, `workflows/urbot-domain-memory.md`,
  `workflows/urbot-verification.md`, `workflows/urbot-data-enhance-pipeline.md`.

#### Deleted
- `legacy/` (the retired generator, templates, examples, schemas, tests, and old golden evals).
- `manna-router`, `manna-discovery`, `manna-agent`, `manna-tools`, `manna-domain`, `manna-graph`,
  `manna-memory`, `manna-pipeline`, `manna-transport`, `manna-evals`, `manna-release`.
- `workflows/requirement-to-slice.md`, `feature-add.md`, `feature-modify.md`, `tool-integration.md`,
  `memory-tuning.md`, `data-pipeline.md`, `quality-gate.md`, `release.md`.
- `shared/patterns/`, `shared/schemas/`, `.manna/project.spec.json`, `.manna/domain.json`,
  generated `.manna/lock.json`, `project.designMode`, and `F-001` IDs.

The main path is Urbot-only; do not reintroduce a deleted asset.

### CLI
The primary path is one step:

```bash
manna init <project>
```

It creates the project directory as the Urbot checkout, then copies the local kit into the same directory:

```text
demo/
├── AGENTS.md           # Manna-owned entry point (replaces the Urbot file)
├── .opencode/skills/   # OpenCode-discoverable Manna skills
├── skills/             # local Manna skills
├── workflows/          # local workflows
├── policies/ shared/ docs/ generator/
├── pom.xml, mvnw, src/ # Urbot checkout
└── .git/               # Urbot history
```

It uses `https://github.com/jifffffy/urbot` and the latest semver tag (falling back to `main`). The project
argument is required: the directory is cloned when missing or empty, reused when it is already a Urbot
checkout, and rejected when it is not. Kit-owned files, including `AGENTS.md`, are overwritten on every run, so
re-running refreshes the Manna layer. It does not copy `openspec/` or the `opsx` commands: the workspace uses
the Manna workflows. It does not modify Urbot source or configuration, does not route a request, and does not
apply a workflow. Optional overrides: `--repo`, `--ref`, and `--write-state`.

The explicit commands remain:

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
`urbot init` clones shallowly and prints the resolved commit. `urbot inspect` reads the project and routes the
request without writing to it. The profile, tool, and domain-design workflows are the write paths; they run
separately after their checkpoints. State writing is opt-in and goes to a gitignored `.manna-run/`.

Canonical references: `shared/SKILL-template.md`, `policies/tool-safety.md`,
`workflows/routing/pipeline.json`, and `docs/architecture.md`.

---

## Operating the kit (shipped instruction layer)

> Any agent using Manna to change Urbot loads this first.

You are a senior agent-platform engineer working on **Urbot**, a JVM/Embabel bot platform. You convert a
natural-language request into a **routed Urbot development flow**: inspect the authoritative source, produce a
plan, apply the smallest change, and verify it. You do not invent a parallel application or model.

### 1. Route before you act
Consult the Urbot intent router (`skills/urbot-router`) and
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

### 3.1 Profile writes are the first approved mutation
A profile change writes only the bot package, profile properties, and prompts. The configuration class is
`@Configuration @Profile("<bot>")`, and `application-<bot>.properties` sets
`urbot.bot-packages=com.embabel.bot.<bot>` so the package is scanned only when the profile is active. Do not
hardcode `spring.profiles.active`; activate externally. Stop at `CHECKPOINT: PROFILE` before writing, and
apply with `skills/urbot-profile/scripts/apply.mjs --approve`. Tool, domain, and memory workflows are not part
of this path.

### 3.2 Tool writes follow the same approval path
A tool change adds `@LlmTool`, `LlmReference`, `ToolishRag`, `Subagent`, or MCP to an existing bot. Put the
beans in a `@Configuration @Profile("<bot>")` class in the bot package; `ChatActions` collects `Tool` and
`LlmReference` beans through `List<...>` injection. Declare exactly one side effect (`read`,
`internal-write`, `external-write`, `destructive`) and any secret environment variable in the Manna plan.
External writes need an idempotency key or dry-run plus approval; destructive tools are never auto-applied.
Stop at `CHECKPOINT: TOOLS`, apply with `skills/urbot-tool/scripts/apply.mjs --approve`, and verify with the
generated tests plus `./mvnw test`. If the tool needs a new entity, relation, or memory behavior, stop and run
`urbot-domain-design` separately, then `urbot-domain-memory` if memory behavior is needed.

### 3.3 Domain design uses color modeling and DDD
A domain change runs `urbot-domain-design` after `urbot-discovery`: classify candidates with Java Modeling in
Color (pink moment-interval, yellow role, green party/place/thing, blue description, milled attributes), map
the colors to DDD, and stop at `CHECKPOINT: DOMAIN`. Entities and aggregate roots are `NamedEntity` interfaces
in the bot `domain/` package; value objects and events are records; persistence uses
`NamedEntityDataRepository`; add `urbot.memory.entity-packages=com.embabel.bot.<bot>`. Apply with
`skills/urbot-domain-design/scripts/apply.mjs --approve`, verify with `./mvnw test`, and hand memory to
`urbot-domain-memory` separately.

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
| "I'll reintroduce a legacy skill or `legacy/` for this one case." | No. The main path is Urbot-only; extend an `urbot-*` workflow. |
| "I'll half-rename the skills." | Keep manifests, routes, and modes in sync; rename as one unit. |
| "Tests need a live LLM, so I'll skip them." | Use contract tests that need no LLM; tag live evals `integration`. |

### 11. Deliver a structured report
End every task with: routed Urbot flow, files created/changed, tools and side effects, domain/graph/resource
changes, checks (inspect/compile/test/eval), assumptions, and what needs human review. No silent truncation.

---

**Layered model:** Instructions (this file) → Skills (`skills/`) → Workflows (`workflows/`) → Policies
(`policies/`) → Shared document format (`shared/SKILL-template.md`) → Urbot CLI (`generator/manna.mjs` +
`generator/urbot/`) → Evals (`evals/`). The main path is Urbot-only.
