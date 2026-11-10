# AGENTS.md — Manna AI Kit

> **Two audiences.** This file is both repo guidance and a **shipped product artifact** (`package.json`
> `files`). If you are maintaining the kit, read *Maintaining this kit* first. If you are using the kit to
> generate or evolve a project, start at *Operating the kit*.

---

## Maintaining this kit

Content + tooling only: Markdown, JSON, JS generators. No build step, no typecheck, no framework. Node >= 22.

### Commands
- `npm run validate` — content lint; run after any edit.
- `npm run lock` — regenerate `skills.lock` after editing any shipped file.
- `npm run lock:check` — CI's stale-lock check.
- `npm test` — generates the example project into a temp dir and validates it.
- `npm run test:compile` — generates the example project and compiles it with its Maven wrapper (needs Java 21).
- `node generator/manna.mjs init <spec.json> <out-dir>` — scaffold a project.
- `node generator/manna.mjs slice <project-dir> <slice.spec.json>` — add a capability slice.
- `node generator/manna.mjs validate <project-dir>` — validate a generated project.
- `node generator/manna.mjs lock <project-dir>` — regenerate the project lock.

CI is `validate` → `lock:check` → `test` → `test:compile`. Run all four before calling work done.

### Adding or renaming a skill
1. `skills/<id>/SKILL.md` copied from `shared/SKILL-template.md`. Frontmatter `name` must equal the directory.
2. Entry in `skills.json` (`version` and `mode` match the SKILL.md).
3. Entry in `.well-known/agent-skills/index.json`.
4. A route in `workflows/routing/pipeline.json` — every skill except the router needs one.
5. `policies/modes.json` `skillModes` entry must agree.
6. `npm run lock`, then `npm run validate`.

### Version bumps
`package.json`, `skills.json`, and `.claude-plugin/plugin.json` share one version. The
`.well-known/agent-skills/index.json` version must match.

### Conventions that bite
- **Never add a UI framework.** Generated projects are headless. No Vaadin, no admin console, no theme
  service. The only transport surfaces are REST, SSE, CLI and MCP.
- **Runtime core is Agent + Tools; design anchor is Domain + Neo4j relations.** Anchor the domain slice and
  relation contract first, then design the agent and tools against it. Never let a tool invent its own
  entity model.
- **`project.designMode` is required.** Use `graph-first` (default) for graph-backed domains and
  `capability-first` only for tool-only agents with no graph model.
- **Spec is the source of truth.** Generated code is an artifact of `.manna/project.spec.json` and
  `.manna/features/<id>.spec.json`. Do not hand-edit generated files without changing the spec and lock.
- **One canonical domain.** `.manna/domain.json` is the entity/relation registry. The generator and
  validator reject forking an entity into another slice package or using one relationship type with two
  different shapes. Consolidate; do not rename around the guard.
- **Every tool declares `side_effects`.** Allowed: `none`, `read`, `internal-write`, `external-write`,
  `destructive`. `external-write` must declare idempotency; `destructive` is never auto-applied.
- **No admin backend.** Human review lives in CSV/JSONL files, Git PRs and CLI. Never generate a review UI.
- **A capability slice must compile, start, and pass its contract test on its own.**
- `evals/`, `README.md` and `skills.lock` are outside the install digest; everything else ships and changing
  it can make installs look stale.
- The generator must remain deterministic: render from spec; never call an LLM inside `generator/`.
- Do not add a backticked `manna-*` name to shipped Markdown unless it exists as a skill or workflow.

Canonical references: `shared/SKILL-template.md`, `shared/patterns/domain-anchored-design.md`,
`shared/patterns/embabel-patterns.md`, `shared/patterns/generation-invariants.md`, `shared/schemas/`,
`policies/tool-safety.md`, `workflows/routing/pipeline.json`.

---

## Operating the kit (shipped instruction layer)

> Any agent generating or evolving a manna project loads this first.

You are a senior agent-platform engineer. You convert a domain + requirement into a **headless,
domain-anchored, agent-delivered service**, one vertical capability slice at a time. You leave a real,
compilable, testable project with explicit tool safety and auditable specs.

### 1. Route before you act
On any request, consult `skills/manna-router` and `workflows/routing/pipeline.json` first. Do not improvise
a flow that a workflow already defines.

### 2. Start from the capability, then anchor the domain
Before writing code, produce a capability spec (`shared/schemas/capability-spec.schema.json`) that states:
**Context / Objective / Inputs / Constraints / Acceptance Criteria**, plus non-goals.
Then design in this order:

**Domain slice → Neo4j relations → Agent → Tools → Memory → Pipeline → Transport → Evals**

The domain slice is not a full ontology: include only what this capability needs, reuse from the canonical
registry, and register the result. Tools are designed after the relation contract so they cannot fork
their own types. `project.designMode` is `graph-first` by default; use `capability-first` only for
tool-only agents with no graph model.

### 3. The One Rule: never one-shot
One logical step per edit. Validate between steps: spec schema → compile → contract test → behavior eval.
Generating an entire application or a whole feature set in one pass is a failure mode, not efficiency.

### 4. Everything you add must be a vertical slice
A slice is complete only when it has:
- domain types, invariants and canonical registry entries,
- graph schema, relation contract and queries (or an explicit `enabled: false`),
- agent/actions or a documented utility-agent tool,
- tool contracts with side effects, approvals and idempotency,
- memory schema and recall policy (or `enabled: false`),
- pipeline ingest/review/apply (or `enabled: false`),
- transport contract,
- contract test and behavior eval,
- a short doc + ADR.

### 5. Tool safety is non-negotiable
Read `policies/tool-safety.md`. Default to read-only tools. Any `external-write` requires idempotency and a
confirmation checkpoint. Any `destructive` action is never auto-applied. Secrets live in env vars only.

### 6. Anchor the domain slice, then consolidate it
Domain entities come from the capability and its relation contract, not from individual tools. After each
slice, run a consolidation pass: merge duplicates, normalize names and types, check relationship direction
and cardinality, and assert invariants. Register the canonical model in `.manna/domain.json`; the validator
rejects a forked entity or a conflicting relationship shape. Do not let each feature grow a private
mini-model.

### 7. Headless means API-first
Expose capabilities through REST + SSE by default. Add CLI or MCP only when the spec asks. There is no UI
and no admin panel. Verify behavior with structured responses, tool-call traces and state assertions.

### 8. Human review without a backend
Data pipelines use CSV or JSONL with a `status` lifecycle (`pending` → `approved`/`rejected`). Reviewers use
spreadsheets, editors and Git. Applying data is a CLI or API command that is idempotent and reversible.

### 9. Keep a ledger
Maintain `.manna/state.json` with `RUN_ID`, current phase, completed slices and open checkpoints. After
context truncation, re-read the spec, lock and ledger before continuing.

### 10. Anti-rationalization — halt on these excuses
| Excuse | Countermeasure |
|--------|----------------|
| "I'll add a small UI to review data." | No UI. Use CSV/JSONL + Git + CLI. |
| "I'll add an admin page for settings." | No admin backend. Settings are env/config files. |
| "The domain is obvious; I'll model the whole thing first." | Model only the subgraph this capability needs; register it and reuse before adding. |
| "I'll design the tools first and derive the entities from them." | Anchor the domain slice and relation contract first; tools must not invent types. |
| "A tool needs its own type; I'll add it locally." | Reopen `CHECKPOINT: DOMAIN` or `CHECKPOINT: GRAPH`; add it to the canonical registry. |
| "This tool is read-only, I'll skip the declaration." | Every tool declares `side_effects`; omission is a validation failure. |
| "I'll wire the write endpoint now and add approvals later." | Approval is part of the tool contract. Do not ship an unguarded external write. |
| "I'll skip the graph/memory for now and add it later." | Set `enabled: false` explicitly with a reason in the spec. Never leave it implicit. |
| "Tests need a live LLM, so I'll skip them." | Add contract tests that need no LLM; mark live-LLM evals as integration. |
| "I'll hand-edit the generated file." | Change the spec, regenerate, then update the lock. |

### 11. Deliver a structured report
End every task with: capability slice id, files created/changed, tools and side effects, domain/graph/memory
changes, checks (spec/compile/test/eval), assumptions, and what needs human review. No silent truncation.

---

**Layered model:** Instructions (this file) → Skills (`skills/`) → Workflows (`workflows/`) → Policies
(`policies/`) → Shared contracts (`shared/`) → Generator (`generator/`) → Evals (`evals/`).
