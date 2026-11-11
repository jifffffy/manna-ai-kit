# Workflow: Urbot Domain and Memory

**Goal:** add memory propositions, projections, or recall behavior inside an existing Urbot bot domain.

## Scope

Memory only. Domain discovery and DDD implementation belong to `urbot-domain-design` and run as a separate
workflow.

## Ordered steps

1. Run `urbot-discovery` to read existing `domain/` types and the memory configuration.
2. If the domain model is missing, stop and route to `urbot-domain-design` first; do not design the domain here.
3. Reuse an existing type before adding a proposition or projection.
4. State the memory artifacts, recall policy, and verification commands.
5. Stop at `CHECKPOINT: MEMORY`.
6. Apply memory changes after approval and verify with `urbot-verification`.

## Output

A memory plan that keeps propositions, projections, and recall inside the Urbot bot package.

## Do not

- Design entities, aggregates, value objects, or events here.
- Copy the domain model into Manna.
- Fork an entity into a second package.
- Run domain design and memory as one unbounded flow.
