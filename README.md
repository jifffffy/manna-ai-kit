# Manna AI Kit

**Domain-anchored, agent-delivered, spec-driven generation and evolution of headless Embabel services.**

Manna turns a domain + requirement into a **vertical capability slice**: agent, tools, domain, Neo4j,
DICE-style memory, data pipeline, transport and evals. It is built for projects that keep growing —
not for one-shot code dumps.

> No UI. No admin backend. **Domain + Neo4j relations are the design anchor; Agent + Tools are the runtime
> core.** Each capability is delivered as a vertical slice.

---

## What it is

- A **kit** of skills, workflows, policies, schemas and eval contracts.
- A **deterministic generator** that scaffolds a compiling headless service and its slices.
- An **evolution method** for adding or modifying capabilities without letting the architecture drift.

It is inspired by the engineering practices of `penpot-ai-kit` and the agent patterns of `impromptu`,
but it deliberately drops Vaadin and every admin surface.

---

## The design in one picture

```text
Requirement
  → Capability spec (goal, acceptance, non-goals, design mode)
  → Domain slice (only the subgraph this capability needs)
  → Neo4j relation contract (labels, directions, cardinality, queries)
  → Agent + Actions (operate on the anchored domain)
  → Tools (atomic / composite / subagent; side effects, approvals, idempotency)
  → DICE memory (projected onto the same relation vocabulary)
  → Pipeline (file-based ingest + review)
  → Transport (REST + SSE; CLI/MCP on demand)
  → Evals (contract + integration + behavior)
```

Each capability is generated as a complete **vertical slice**. The domain slice is anchored and
registered in `.manna/domain.json`; tools are designed against it, never the other way around.

---

## Quick start

Requirements: Node >= 22, Java 21, Docker (for Neo4j). Generated projects include the Maven Wrapper.

```bash
npm run validate
npm test

# Generate a project from a spec
node generator/manna.mjs init examples/example.spec.json /tmp/session-scout
cd /tmp/session-scout
docker compose up -d
./mvnw test
./mvnw spring-boot:run
```

Add a capability:

```bash
node generator/manna.mjs slice /tmp/session-scout examples/save-to-agenda.slice.json
node generator/manna.mjs validate /tmp/session-scout
```

Validate the kit:

```bash
npm run validate
npm run lock:check
npm test
npm run test:compile   # needs Java 21; compiles the generated example
```

---

## Repository layout

```text
manna-ai-kit/
├── AGENTS.md                  # repo + shipped instruction layer
├── skills/                    # 11 task skills
├── workflows/                 # 8 end-to-end workflows + routing
├── policies/                  # modes, tool safety, approval checkpoints
├── shared/
│   ├── schemas/               # capability, tool, domain, graph, memory, pipeline, transport
│   └── patterns/              # domain-anchored design, Embabel, Neo4j, DICE, pipeline, transport, Java
├── templates/agent-core/      # headless Spring Boot + Embabel core
├── generator/                 # deterministic CLI + validators
├── examples/                  # example project + slices
├── evals/golden/              # agent behavior evals
└── scripts/dev/               # validate, lock, generator test
```

---

## Core invariants

1. **Headless.** No Vaadin, no admin UI, no theme service.
2. **Domain-anchored.** The domain slice and Neo4j relation contract are designed before the agent and
   tools. Tools map to canonical entities; they never invent their own types.
3. **Every tool declares `side_effects`.** External writes are idempotent or dry-run; destructive tools
   require explicit approval.
4. **Spec is the source of truth.** `.manna/project.spec.json` and feature specs drive the code.
5. **Deterministic generator.** `generator/` never calls an LLM.
6. **Vertical slices.** A slice has agent, tools, domain, graph, memory, pipeline, transport and evals —
   with explicit `enabled: false` + reason where a vertical does not apply.
7. **One canonical domain.** `.manna/domain.json` is the entity/relation registry. The validator rejects
   forking an entity into another slice package or using one relationship type with two shapes.
8. **Review without admin.** CSV/JSONL + Git + CLI.
9. **Secrets in env only.**

See `shared/patterns/generation-invariants.md` and `policies/tool-safety.md`.

---

## What the generator produces

For the example project:

```text
session-scout/
├── pom.xml
├── docker-compose.yml
├── .env.example
├── src/main/java/dev/manna/session/
│   ├── MannaApplication.java
│   ├── conversation/        # REST + SSE, in-memory sessions
│   ├── config/              # Chatbot + API-key filter
│   └── findsessions/
│       ├── domain/          # Session, Speaker + repositories (anchored first)
│       ├── FindSessionsAgent.java
│       └── FindSessionsTools.java
├── src/main/resources/cypher/F-001.cypher
├── src/main/resources/prompts/find-sessions_system.jinja
├── .manna/
│   ├── project.spec.json
│   ├── features/F-001.spec.json
│   ├── evals/F-001.eval.json
│   ├── domain.json          # canonical entity/relation registry
│   ├── state.json
│   └── lock.json
└── docs/capabilities/F-001.md
```

The core compiles with Spring Boot + Embabel. Generated tool bodies are safe stubs (`not implemented
yet`) so a slice cannot silently perform an external write before the workflow implements it.

---

## Workflows

| Workflow | Purpose |
|----------|---------|
| `requirement-to-slice` | New project or first capability |
| `feature-add` | Add a capability without regressions |
| `feature-modify` | Change behaviour with impact analysis |
| `tool-integration` | Add an API/MCP/write tool safely |
| `memory-tuning` | Tune DICE propositions and recall |
| `data-pipeline` | Add CSV/JSONL ingest, review and apply |
| `quality-gate` | Spec → compile → tests → evals → safety |
| `release` | Version, lock, changelog, publish |

Each workflow names its checkpoints. Approval is per checkpoint, never for a vague "looks good".

---

## Why this design

- **Removing Vaadin** removes the largest, least deterministic generation surface and makes CI
  deterministic.
- **Removing admin** moves human review to files + Git, which is auditable and diff-friendly.
- **Domain-anchored** prevents tool-driven entity fragmentation while keeping the modeled subgraph small.
- **Vertical slices** make every capability independently compilable and testable.
- **Spec + lock** make repeated AI edits reviewable and prevent silent drift.

---

## Honest limitations

- The generated project is a **walking skeleton**, not a finished product. Tool adapters, DICE wiring and
  real graph writes are completed by the workflows with human review.
- Behavior evals need a live LLM and are therefore marked `integration`; they are not deterministic.
- Cross-slice relations are declared but not generated until the target slice exists (they appear as a
  code comment).
- The generator supports one stack by design: Java 21 + Spring Boot + Embabel + Neo4j.
- No UI generation by design. If a client needs a UI, build it separately against the REST/SSE surface.

---

## License

Apache-2.0. The design borrows patterns from Embabel Impromptu (Apache-2.0); retain notices for derived
files.
