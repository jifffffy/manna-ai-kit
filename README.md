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
- a project generator (the old generator is deprecated; see [Asset disposition](#asset-disposition)).

```text
User request
  → Intent router
  → Urbot development flow (first bot / add / modify / tool / memory / pipeline / verify / release)
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
```

Compile the legacy generated example (deprecated path, needs JDK 21+ and network):

```bash
npm run test:compile
```

Phase 1 provides a read-only inspect-and-route CLI:

```bash
manna urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir> [--write-state]
manna urbot inspect --repo https://github.com/jifffffy/urbot --ref <ref> --project <dir> --request "<nl>" [--write-state]
```

`init` pins a shallow checkout and prints the resolved commit. `inspect` reads the project and routes the
request without modifying it. Later changes add `plan`, `apply`, and real modification workflows.

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
with `./mvnw -DskipTests compile` and `./mvnw test`. Domain or memory changes route to `urbot-domain-memory` as
a separate workflow.

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

### Retain (re-scoped to Urbot)

- `skills/manna-router` routing architecture → Urbot intent router.
- `workflows/routing/pipeline.json` entrypoint / `skillRoutes` / `triggers` structure.
- `scripts/dev/validate-kit.mjs`.
- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`.
- `policies/modes.json`, `policies/tool-safety.md`, kit-level `skills.lock`.
- `evals/golden/*` golden routing eval mechanism.
- The skills/workflow Markdown document format.

### Rewrite (current → Urbot)

| Current | Target |
|---------|--------|
| `manna-router` | Urbot intent router |
| `manna-discovery` | `urbot-discovery` |
| `manna-tools` | `urbot-tool` |
| `manna-domain` + `manna-graph` + `manna-memory` | `urbot-domain-memory` |
| `manna-agent` | merged into `urbot-profile` or `urbot-tool` |
| `manna-evals` | `urbot-verification` |
| `manna-pipeline` | `urbot-pipeline` (id finalized later) |
| `manna-transport` | `urbot-transport` (id finalized later) |
| `manna-release` | `urbot-release` (id finalized later) |
| `workflows/requirement-to-slice.md` | first Urbot bot capability |
| `workflows/feature-add.md` | add a bot capability |
| `workflows/feature-modify.md` | modify a bot capability |
| `workflows/tool-integration.md` | integrate an Urbot tool |
| `workflows/memory-tuning.md` | tune bot memory |
| `workflows/data-pipeline.md` | Urbot data pipeline |
| `workflows/quality-gate.md` | Urbot verification gate |
| `workflows/release.md` | version and release Urbot |
| `AGENTS.md` | Urbot-authoritative instructions |

Phase 1 Urbot assets (new): `skills/urbot-discovery`, `skills/urbot-profile`, `skills/urbot-tool`,
`skills/urbot-domain-memory`, `skills/urbot-prompt`, `skills/urbot-verification`,
`workflows/urbot-bootstrap.md`, `workflows/urbot-profile-change.md`, `workflows/urbot-prompt-tuning.md`,
`workflows/urbot-tool-development.md`, `workflows/urbot-domain-memory.md`,
`workflows/urbot-verification.md`.

### Deprecate (mark only — do not delete or move yet)

- `templates/agent-core/`.
- Generator commands `init`, `slice`, `validate`, `lock`.
- `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`,
  `memory-schema.schema.json`, `pipeline-schema.schema.json`.
- `.manna/domain.json`, `.manna/project.spec.json`, generated-project `.manna/lock.json`.
- `project.designMode`.
- `F-001` capability IDs.

The physical move to `legacy/` belongs to a later change.

---

## Core invariants

1. **Urbot is the only runtime and domain authority.** No second Spring Boot application, no second model.
2. **Source wins over prose.** The source inventory above is authoritative.
3. **Headless.** REST/SSE plus optional CLI/MCP. No UI, no admin backend.
4. **Every tool declares side effects.** External writes are idempotent and approved; destructive actions are
   never auto-applied.
5. **Review in Git.** Changes are diffs and pull requests, not admin screens.
6. **Smallest change, verified.** Inspect → plan → apply → compile/test/eval, one logical step at a time.
7. **Deprecations are marked, not deleted.** The `legacy/` move is a separate change.
8. **Secrets in env only.**

See `policies/tool-safety.md`, `workflows/routing/pipeline.json`, and `docs/architecture.md`.

---

## Repository layout

```text
manna-ai-kit/
├── AGENTS.md                  # repo + shipped instruction layer
├── skills/                    # 17 skills (6 Urbot Phase 1 + 11 legacy)
├── workflows/                 # 14 workflows (6 Urbot Phase 1) + routing
├── policies/                  # modes, tool safety, approval checkpoints
├── shared/                    # patterns, schemas, report schemas
├── templates/agent-core/      # DEPRECATED generated runtime
├── generator/                 # DEPRECATED generator + Phase 1 urbot CLI
├── examples/                  # DEPRECATED generated example + slices
├── evals/golden/              # golden routing evals (retained)
├── scripts/dev/               # validate, lock, positioning check, generator test
└── openspec/                  # change proposals and specs
```

---

## Honest limitations

- `manna urbot init` and `manna urbot inspect` are read-only. The Phase 2 profile and Phase 3 tool workflows
  are the mutation paths and write only after their checkpoints; domain and memory workflows remain
  skeletons.
- The older `manna-*` skills and workflows still carry generator-era content; the full rewrite lands in a
  later change.
- The generator and generated example remain in the tree but are deprecated; they are not the product.
- Behavior evals need a live LLM and are tagged `integration`; they are not deterministic.

---

## License

Apache-2.0. The design borrows patterns from Embabel Impromptu (Apache-2.0); retain notices for derived
files.
