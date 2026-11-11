# Design

## Context

See `proposal.md` — Why. The current kit is generated around a Manna-owned Spring Boot application:
`templates/agent-core/`, the `generator/` commands, `shared/schemas/`, `.manna/project.spec.json`,
`.manna/domain.json`, `project.designMode`, and `F-001` capability IDs all assume Manna owns the runtime and
the domain model. The target Urbot repository is `https://github.com/jifffffy/urbot`. This change is
documentation and contract only; it must not implement remote retrieval, the router, or modification
workflows.

## Goals / Non-Goals

**Goals:**

- Make Urbot the single authoritative source for runtime, configuration, domain, and extension conventions.
- Define a stable orchestrator contract: intent → Urbot development flow, with no second application.
- Freeze the retain / rewrite / deprecate inventories so later changes cannot drift.
- Record the minimum CLI surface for the repositioning.

**Non-Goals:**

- No remote fetch implementation (later change).
- No router, skill, or workflow implementation (later change).
- No real modification workflow (later changes).
- No moving deprecated assets into `legacy/` (later change).
- No second Spring Boot application and no second domain model.

## Decisions

### D1. Urbot repository is the authority boundary

Manna references the fixed repository `https://github.com/jifffffy/urbot` and never vendors a competing copy
of its runtime or model. Authority is resolved from these sources, in priority order:

1. `pom.xml`
2. `src/main/java/com/embabel/urbot/`
3. `src/main/java/com/embabel/bot/<botname>/`
4. `application-<profile>.properties`
5. `src/main/resources/prompts/`
6. `src/test/`
7. Git history

Prose is treated as fallible metadata. This ordering is deliberate: the existing
`src/main/java/com/embabel/bot/README.md` already documents obsolete property names, so source always wins.

*Alternative considered:* keep a Manna-maintained mirror of the Urbot model. Rejected — it recreates the
dual-maintenance problem this change exists to remove.

### D2. Extension model: add a bot inside Urbot, not beside it

A new bot is an extension of Urbot. The design contract is:

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

The bot stays inside the Urbot application context (`urbot.bot-packages=com.embabel.bot.<botname>`). There is
no Manna-side package, module, or domain layer. Prompt resources follow
`prompts/personas|objectives|behaviours/<botname>.jinja`.

*Alternative considered:* a separate artifact per bot. Rejected — it fragments the runtime and forces a second
deployment model.

### D3. Configuration is source-first

The authoritative configuration surface is `UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`,
and the actual `application-<profile>.properties`. The names documented in
`src/main/java/com/embabel/bot/README.md` are obsolete: `urbot.persona`, `urbot.objective`,
`urbot.max-words`, `urbot.chat-llm.model`.

Current binding example to use in plans and docs:

```properties
urbot.bot-packages=com.embabel.bot.<botname>
urbot.chat.persona=<botname>
urbot.chat.objective=<botname>
urbot.chat.behaviour=default
urbot.chat.max-words=80
urbot.chat.llm.model=gpt-4.1-mini
urbot.chat.llm.temperature=0.0
```

Any plan that emits a legacy name is rejected and corrected against source.

### D4. Reuse the kit's orchestration spine

The following keep their existing structural contract and are only re-scoped to Urbot:

- `skills/manna-router` → Urbot intent router (retain routing architecture: route before act).
- `workflows/routing/pipeline.json` → retain entrypoint/skillRoutes/triggers structure.
- `scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`,
  `.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, kit `skills.lock`.
- Golden routing eval mechanism and the skills/workflow document format.

Retaining the spine preserves validation, packaging, manifest consistency, and the "route before you act"
behavior while avoiding a rewrite of the control plane.

### D5. Assets move through three explicit inventories

- **Retain**: router architecture, routing pipeline structure, validator, manifests, plugin metadata, modes,
  tool-safety policy, kit lock, golden routing eval mechanism, document format.
- **Rewrite**: `manna-router` → Urbot intent router; `manna-discovery` → `urbot-discovery`;
  `manna-tools` → `urbot-tool`; `manna-domain` + `manna-graph` + `manna-memory` → `urbot-domain-memory`;
  `manna-agent` merged into `urbot-profile` or `urbot-tool`; `manna-evals` → `urbot-verification`; all
  workflows become Urbot development steps; `AGENTS.md` becomes Urbot-authoritative.
- **Deprecate (mark only)**: `templates/agent-core/`; generator `init`/`slice`/`validate`/`lock`;
  `shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`, `graph-schema.schema.json`,
  `memory-schema.schema.json`, `pipeline-schema.schema.json`; `.manna/domain.json`,
  `.manna/project.spec.json`, generated-project `.manna/lock.json`, `project.designMode`, `F-001` IDs.

Deprecation is a label, not a removal. Later changes perform the physical move to `legacy/`.

### D6. Minimal CLI contract

Only two commands are in scope for this repositioning:

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

`init` prepares a local Urbot working copy reference; `inspect` reads the project and routes the request to an
Urbot development flow. Later changes add workflow commands (`plan`, `apply`, verification) on top of this
surface. The commands are specified here but not implemented in this change.

*Alternative considered:* keep the existing `manna init/slice/validate/lock` commands as the public surface.
Rejected — they encode the generator model that is being deprecated.

### D7. Documentation is the primary deliverable

Because this change is positioning-only, the observable contract is the documentation itself and the
inventories. The validator and golden-eval mechanism are extended later to assert skill/workflow names and
routing. This change ensures the docs and inventories are complete and internally consistent.

## Risks / Trade-offs

- **Partial migration leaves two mental models** → Keep the deprecate inventory explicit and label deprecated
  assets in place; do not silently mix generator and Urbot guidance in the same section.
- **Stale Urbot prose keeps winning** → State the source-first priority order in `AGENTS.md`, `README.md`,
  and the design; require plans to cite source paths.
- **Retained router content still says "manna"** → Rewrite content while preserving structure; validation of
  names lands in a later change.
- **CLI is specified but not executable yet** → Label the two commands as the target surface for this change
  and defer implementation to the next change; do not present them as already working.
- **Deprecated files still ship** → Documented as deprecated only; removal in `legacy/` is explicitly a later
  change, so installs remain stable during the transition.

## Migration Plan

1. Rewrite `AGENTS.md` and `README.md` with the Urbot-authoritative positioning and source inventory.
2. Add the extension model, configuration source-of-truth, and obsolete-property warning to the docs.
3. Publish the retain / rewrite / deprecate inventories.
4. Document the minimal CLI surface.
5. Keep deprecated assets in place; record the later `legacy/` move as an explicit follow-up.
6. Roll back by reverting documentation and the inventory; no runtime or generated code is touched.

## Open Questions

None that block this change. Physical `legacy/` migration, remote fetch, and router implementation are
intentionally deferred to later changes.
