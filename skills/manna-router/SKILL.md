---
name: manna-router
description: Route any manna request to the correct workflow and skills before touching a project.
version: 0.1.0
mode-default: suggest
requires:
  - workflows/routing/pipeline.json
  - shared/patterns/domain-anchored-design.md
  - policies/approval-checkpoints.md
---

# Manna Router

## When to use

At the start of every request that will create, modify, verify or release a manna project.

## Inputs

- The user's request.
- `.manna/project.spec.json`, `.manna/domain.json` and `.manna/state.json` if a project already exists.
- `workflows/routing/pipeline.json`.

## Process

1. **Read reality first.** If a project exists, read its spec, state and lock. Never route from memory.
2. **Match the intent** against the routing table.
3. **State the route** in one line: workflow id + skill sequence + first checkpoint. The default design
   order is **domain → graph → agent → tools**, regardless of how the user phrased the request.
4. **Stop** if the request spans multiple routes; ask which one to do first.
5. **Hand off** to the workflow, not directly to a skill.

## Routing table

| Intent | Workflow | First skill |
|--------|----------|-------------|
| New domain or project | `requirement-to-slice` | `manna-discovery` |
| Add a capability | `feature-add` | `manna-discovery` |
| Change an existing capability | `feature-modify` | `manna-domain` (then graph/agent/tools) |
| Integrate an API/MCP/write tool | `tool-integration` | `manna-domain` (then tools) |
| Tune memory | `memory-tuning` | `manna-memory` |
| Add/change data ingestion | `data-pipeline` | `manna-pipeline` |
| Verify or regress | `quality-gate` | `manna-evals` |
| Version/publish | `release` | `manna-release` |
| Ambiguous | none | ask one clarifying question |

## Disambiguation

- "Build me X" where X is one capability → `requirement-to-slice`.
- "Add X to the existing app" → `feature-add`.
- "Make X do Y instead" → `feature-modify`.
- "Connect to Stripe/Slack/..." → `tool-integration` (domain/relation check first).
- "Remember that the user likes..." → `memory-tuning`.
- "Import/enrich/review a dataset" → `data-pipeline`.
- "Is it ready?" → `quality-gate`.

## Design order

```text
Capability brief → Domain slice → Neo4j relations → Agent → Tools → Memory → Pipeline → Transport → Evals
```

If the user asks for a tool first, route through `manna-domain` and `manna-graph` before `manna-tools`.
A subagent is a tool, but it still operates on the anchored domain.

## Hard rules

- No code edits in `suggest` mode.
- No route that jumps straight to tools or entities. Anchor the domain slice first.
- If the request implies a UI or admin page, refuse and offer CSV/CLI/API.
- If the project has no `.manna/` directory, treat it as a new project.

## Output

```text
Route: <workflow-id>
Skills: manna-discovery → manna-domain → manna-graph → manna-agent → manna-tools → ...
First checkpoint: SPEC
Reality read: <spec/state/lock present or absent>
```
