---
name: urbot-router
description: Route a natural-language request to the correct Urbot development workflow.
version: 0.1.0
mode-default: suggest
requires:
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
  - docs/architecture.md
---

# Urbot Router

## When to use

At the start of every Urbot request, before any workflow runs. The router selects one development flow; it does
not perform the change itself.

## Eight-step router

1. Confirm the target directory.
2. If the directory does not exist, select `urbot-bootstrap`.
3. If it exists, read Git and Urbot project state.
4. Identify the target profile.
5. Classify exactly one intent.
6. Select exactly one workflow.
7. Output the target files and verification commands.
8. Hand control to the selected workflow.

## Routing table

| Intent | Workflow |
|--------|----------|
| New project or bot | `urbot-bootstrap` |
| New/modified profile | `urbot-profile-change` |
| Persona/objective/behaviour change | `urbot-prompt-tuning` |
| Add Tool/MCP/Subagent/Reference | `urbot-tool-development` |
| Discover/model a domain (color modeling + DDD) | `urbot-domain-design` |
| Add NamedEntity/Relations/Memory | `urbot-domain-memory` |
| Test/compile/regression | `urbot-verification` |

For an ambiguous request, read the project and ask exactly one precise question. Do not split a request into
multiple workflows or run them concurrently.

## Output

```text
Route: <urbot-workflow>
Skills: <ordered skill sequence>
Profile: <target profile or absent>
Target files: <paths>
Verification: <commands>
Question: <only when ambiguous>
```

## Do not

- Run more than one workflow for one request.
- Execute a modification workflow before its checkpoint.
- Treat an ambiguous request as permission to guess.
- Reference the retired generator or any legacy path.
