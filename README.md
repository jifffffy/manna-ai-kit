# Manna AI Kit

**A natural-language development orchestrator for Urbot.**

Urbot decides **how to develop**. Manna decides **which development flow a request takes**. Manna routes a
request to a Urbot development workflow, inspects the authoritative Urbot source, and applies the smallest
reviewable change. It is **not** an application generator and does **not** own a runtime or a domain model.

Authoritative Urbot repository: <https://github.com/jifffffy/urbot>

> No UI. No admin backend. Urbot owns the runtime, configuration, and domain. Review happens in Git.

---

## What it is

- A **routing layer**: intent → Urbot development flow → skills and checkpoints.
- A **workflow kit** for inspecting Urbot, planning a change, applying it, and verifying it.
- A **policy and eval spine** (tool safety, modes, golden routing evals) re-scoped to Urbot.

It is **not**:

- a second Spring Boot application,
- a second domain model,
- a project generator; the retired generator and all `manna-*` skills/workflows have been deleted (see
  [Asset disposition](#asset-disposition)).

```text
User request
  → Intent router
  → Urbot development flow (bootstrap / profile / prompt / tool / domain design / domain memory / verification)
  → Inspect authoritative Urbot source
  → Plan the smallest change
  → Apply inside the Urbot source tree
  → Verify with contract tests and evals
  → Review as a Git diff / PR
```

---

## Quick start

Requirements: Node >= 22. The kit itself has no npm dependencies; do not run `npm install`.

```bash
npm run validate
npm test
npm run check:positioning
npm run check:urbot-only
```

> **Urbot-only:** the retired generator, templates, schemas, examples, and all `manna-*` skills/workflows have
> been deleted. The main path contains only the Urbot orchestration and its retained spine.

`manna init` creates one project directory and fills it with the Urbot checkout plus the Manna kit:

```bash
manna init demo
```

- project: `./demo` (open it in OpenCode)
- Urbot checkout: the project root itself, cloned when missing and reused when present
- local kit: `skills/`, `workflows/`, `policies/`, `.opencode/`, `generator/`, `openspec/`
- `AGENTS.md`: replaced with the Manna-owned file, so exactly one instruction file remains
- kit copy: existing kit-owned files are overwritten, so re-running refreshes the Manna layer
- repository: `https://github.com/jifffffy/urbot`
- ref: the latest semver tag, falling back to `main`
- read-only for Urbot: it does not modify Urbot source, configuration, or Git history
- output: `workspace`, `kit`, `source`, `entry` (always `AGENTS.md`), and `next`

Optional overrides: `--repo`, `--ref`, and `--write-state`. A missing project name is an error; `--workspace`,
`--dir`, and `--force` are not part of `init`.

The explicit read-only commands remain available:

```bash
manna urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir> [--write-state]
manna urbot inspect --repo https://github.com/jifffffy/urbot --ref <ref> --project <dir> --request "<nl>" [--write-state]
```

`urbot init` pins a shallow checkout and prints the resolved commit. `urbot inspect` reads the project and
routes the request without modifying it. The profile, tool, and domain-design workflows are the write paths;
they run separately after their checkpoints.

---

## Project workspace

`manna init demo` clones the fixed Urbot repository into `./demo` and copies the local kit into the same
directory:

```text
demo/
├── AGENTS.md           # Manna-owned entry point (replaces the Urbot file)
├── .opencode/          # commands + OpenCode skills
├── skills/             # local Manna skills
├── workflows/          # local workflows
├── policies/ shared/ docs/ generator/
├── openspec/           # config + specs
├── pom.xml, mvnw, src/ # Urbot checkout
└── .git/               # Urbot history
```

Open `./demo` in OpenCode. The single `AGENTS.md` carries the Manna flow plus the Urbot build, run, test, and
gotcha guidance. Kit-owned files are overwritten on every run, so `manna init demo` is also the refresh
command. Files outside the copy set are left alone, an existing `.gitignore` is not rewritten (`.manna-run/`
goes to `.git/info/exclude`), and the Manna kit root is rejected as a project.

---

## Urbot is the only source of truth

Resolve every question from the Urbot repository, in this order:

1. `pom.xml`
2. `src/main/java/com/embabel/urbot/`
3. `src/main/java/com/embabel/bot/<botname>/`
4. `application-<profile>.properties`
5. `src/main/resources/prompts/`
6. `src/test/`
7. Git history

Prose is fallible metadata. If source and prose disagree, **source wins**. In particular, the old
`src/main/java/com/embabel/bot/README.md` lags the code.

---

## Urbot extension model

Add a bot inside Urbot, not beside it:

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

See `docs/architecture.md` for the full extension-model and CLI contract.

---

## Profile write workflow (Phase 2)

The first write workflow creates or updates a bot profile. For a bot named `travel` it writes:

- `src/main/java/com/embabel/bot/travel/TravelConfiguration.java` — `@Configuration @Profile("travel")`.
- `src/main/resources/application-travel.properties` — `urbot.bot-packages=com.embabel.bot.travel` plus the
  current `urbot.chat.*` bindings.
- `src/main/resources/prompts/personas/travel.jinja`
- `src/main/resources/prompts/objectives/travel.jinja`

`urbot.bot-packages` is set in the profile-specific properties so the package is scanned only when the profile
is active; `@Profile` is defense-in-depth. Activation stays external (`--spring.profiles.active=travel`), never
hardcoded. The workflow runs `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`, stops at
`CHECKPOINT: PROFILE` before writing, and verifies with `./mvnw -DskipTests compile` and `./mvnw test`.

---

## Tool write workflow (Phase 3)

The tool workflow supports `@LlmTool`, `LlmReference`, `ToolishRag`, `Subagent`, and MCP. It writes a
profile-gated tool configuration in the bot package; `ChatActions` collects `Tool` and `LlmReference` beans
automatically through `List<...>` injection.

Every tool declares one side effect in the Manna plan — `read`, `internal-write`, `external-write`, or
`destructive` — plus any secret environment variable. External writes require idempotency or dry-run plus
approval and are generated as dry-run stubs; destructive tools are never auto-applied. The workflow stops at
`CHECKPOINT: TOOLS`, applies with `skills/urbot-tool/scripts/apply.mjs --approve`, generates tests, and verifies
with `./mvnw -DskipTests compile` and `./mvnw test`. Domain changes route to `urbot-domain-design`; memory
changes route to `urbot-domain-memory` as separate workflows.

Examples: "增加天气查询工具", "接入 Stripe", "增加 MCP 工具", "添加一个 Subagent".

---

## Configuration is source-first

`UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`, and the actual
`application-<profile>.properties` are authoritative. The names in
`src/main/java/com/embabel/bot/README.md` are **obsolete**: `urbot.persona`, `urbot.objective`,
`urbot.max-words`, `urbot.chat-llm.model`.

Use the current bindings:

```properties
urbot.bot-packages=com.embabel.bot.<botname>
urbot.chat.persona=<botname>
urbot.chat.objective=<botname>
urbot.chat.behaviour=default
urbot.chat.max-words=80
urbot.chat.llm.model=gpt-4.1-mini
urbot.chat.llm.temperature=0.0
```

---

## Asset disposition

### Retain

- `skills/urbot-router` routing architecture.
- `workflows/routing/pipeline.json` entrypoint / `skillRoutes` / `triggers` structure.
- `scripts/dev/validate-kit.mjs`.
- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`.
- `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`.
- `evals/golden/*` golden routing eval mechanism.
- `shared/SKILL-template.md` (skills/workflow document format).

### Urbot-only assets

- `skills/urbot-router`, `skills/urbot-discovery`, `skills/urbot-profile`, `skills/urbot-tool`,
  `skills/urbot-domain-design`, `skills/urbot-domain-memory`, `skills/urbot-prompt`,
  `skills/urbot-verification`.
- `workflows/urbot-bootstrap.md`, `workflows/urbot-profile-change.md`,
  `workflows/urbot-prompt-tuning.md`, `workflows/urbot-tool-development.md`,
  `workflows/urbot-domain-design.md`, `workflows/urbot-domain-memory.md`,
  `workflows/urbot-verification.md`.

### Deleted

- `legacy/` (the retired generator, templates, examples, schemas, tests, and old golden evals).
- `manna-router`, `manna-discovery`, `manna-agent`, `manna-tools`, `manna-domain`, `manna-graph`,
  `manna-memory`, `manna-pipeline`, `manna-transport`, `manna-evals`, `manna-release`.
- `workflows/requirement-to-slice.md`, `feature-add.md`, `feature-modify.md`, `tool-integration.md`,
  `memory-tuning.md`, `data-pipeline.md`, `quality-gate.md`, `release.md`.
- `shared/patterns/`, `shared/schemas/`, `.manna/project.spec.json`, `.manna/domain.json`,
  generated `.manna/lock.json`, `project.designMode`, and `F-001` IDs.

The main path is Urbot-only; do not reintroduce a deleted asset.

---

## Core invariants

1. **Urbot is the only runtime and domain authority.** No second Spring Boot application, no second model.
2. **Source wins over prose.** The source inventory above is authoritative.
3. **Headless.** REST/SSE plus optional CLI/MCP. No UI, no admin backend.
4. **Every tool declares side effects.** External writes are idempotent and approved; destructive actions are
   never auto-applied.
5. **Review in Git.** Changes are diffs and pull requests, not admin screens.
6. **Smallest change, verified.** Inspect → plan → apply → compile/test/eval, one logical step at a time.
7. **Urbot-only main path.** The legacy generator and `manna-*` assets are deleted and not reintroduced.
8. **Secrets in env only.**

See `policies/tool-safety.md`, `workflows/routing/pipeline.json`, and `docs/architecture.md`.

---

## Repository layout

```text
manna-ai-kit/
├── AGENTS.md                  # repo + shipped instruction layer
├── skills/                    # 8 Urbot skills (router + 7 workflow skills)
├── workflows/                 # 7 Urbot workflows + routing
├── policies/                  # modes, tool safety, approval checkpoints
├── shared/                    # SKILL-template.md (document format)
├── generator/                 # Urbot CLI (manna.mjs + urbot/)
├── evals/golden/              # golden routing evals (retained)
├── scripts/dev/               # validate, lock, positioning/Urbot-only checks, workflow tests
└── openspec/                  # change proposals and specs
```

---

## Honest limitations

- `manna init` creates the project workspace (clone or reuse plus kit copy) and replaces `AGENTS.md`, but does
  not modify Urbot source or configuration. `manna urbot init` and `manna urbot inspect` are read-only. The
  profile, tool, and domain-design workflows are the Urbot mutation paths and write only after their
  checkpoints; memory remains a skeleton.
- The retired generator, templates, schemas, examples, tests, and all `manna-*` skills/workflows have been
  deleted; the main path is Urbot-only.
- Behavior evals need a live LLM and are tagged `integration`; they are not deterministic.

---

## License

Apache-2.0. The design borrows patterns from Embabel Impromptu (Apache-2.0); retain notices for derived
files.
