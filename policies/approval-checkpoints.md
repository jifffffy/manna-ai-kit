# Approval Checkpoints

Manna uses named checkpoints so a user can approve exactly one phase, never a vague "looks good".

## Checkpoint names

| Checkpoint | Approves | Never approves |
|------------|----------|----------------|
| `SPEC` | capability goal, non-goals, acceptance criteria, design mode | code |
| `PROFILE` | bot package, configuration class, profile properties, prompt resources | tools, domain, memory, framework edits |
| `DOMAIN` | entities, fields, relations, invariants, canonical registry | graph or migrations |
| `GRAPH` | labels, relationship contract, constraints, query policy | data writes |
| `AGENT` | actions, goals, planner mode, confirmation points | tools or data |
| `TOOLS` | tool contracts, side effects, approvals, idempotency, secrets list, generated tests | implementation |
| `MEMORY` | proposition types, projections, recall policy | live extraction |
| `PIPELINE` | ingest, enrichment, review lifecycle, apply/rollback | production apply |
| `TRANSPORT` | endpoints, SSE behavior, CLI/MCP surface | deployment |
| `EVALS` | contract and behavior assertions | release |
| `RELEASE` | version, lock, changelog, publication | future changes |

## Rules

1. State the checkpoint name in the report, e.g. `CHECKPOINT: DOMAIN`.
2. Domain and graph checkpoints must precede agent and tools. If a tool reveals a missing entity or
   relation, reopen the earlier checkpoint instead of patching it locally.
3. Approval applies only to the artifact shown. A later change reopens the checkpoint.
4. `autofix` may skip approval only for `policies/modes.json` `safeSet`.
5. If a change crosses a checkpoint boundary, stop and ask before continuing.
6. Record approvals in the change/PR or the optional gitignored `.manna-run/` state.

## Escalation

Stop immediately, even in `autofix`, if a change:

- adds or modifies an `external-write` or `destructive` tool,
- changes authentication, authorization or secrets handling,
- changes Neo4j constraints or adds a destructive migration,
- removes a capability slice or deletes data,
- weakens a test or eval assertion.
