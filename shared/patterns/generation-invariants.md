# Generation Invariants

The generator and every workflow must preserve these. Validation enforces the first five.

1. **Headless**: no Vaadin, no admin UI, no theme service, no browser-only state.
2. **Domain-anchored**: every capability anchors a domain slice and Neo4j relation contract before the
   agent and tools are designed. `designMode` is explicit (`graph-first` by default).
3. **Tool safety**: every tool declares `side_effects`; external writes declare idempotency or dry-run;
   destructive tools require explicit approval.
4. **Spec is truth**: `.manna/project.spec.json` and `.manna/features/<id>.spec.json` describe the code.
5. **Deterministic generator**: `generator/` may not call an LLM or the network.
6. **Vertical slice**: a slice includes agent, tools, domain, graph, memory, pipeline, transport and evals,
   with explicit `enabled: false` where a vertical does not apply.
7. **Compile boundary**: a generated slice must compile and start independently.
8. **No hidden state**: session state is in-memory or explicitly persisted; no reliance on a UI session.
9. **Review without admin**: CSV/JSONL + Git + CLI only.
10. **Secrets**: environment variables only; `.env.example` is generated, `.env` is ignored.
11. **Bounded loops**: all retries, tool calls and batch operations have limits.
12. **License hygiene**: derived code keeps Apache-2.0 notices and a NOTICE file when required.

## Forbidden shortcuts

- Adding a UI "just for review".
- Adding an admin endpoint that bypasses tool approvals.
- Creating entities before the agent/tool contract exists.
- Generating a write tool without an audit record.
- Writing secrets into `application.yml`.
- Skipping `enabled` flags because the vertical is "obvious".
