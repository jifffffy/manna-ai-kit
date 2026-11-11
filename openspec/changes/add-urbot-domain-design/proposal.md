# Proposal

## Why

Urbot bots need a repeatable way to discover a domain before writing code. The existing
`urbot-domain-memory` skill is a skeleton for memory behavior; it does not define how to find entities, roles,
moments, descriptions, relationships, or invariants. Java Modeling in Color (Coad) gives a compact discovery
vocabulary, and DDD gives the implementation structure. This change adds a dedicated domain-design skill that
discovers the domain with color modeling and implements it inside the Urbot bot package.

## What Changes

- **Add the `urbot-domain-design` skill** with:
  - `references/color-modeling.md` — the four color archetypes (pink moment-interval, yellow role, green
    party/place/thing, blue description), milled attributes, discovery questions, and relationship notation.
  - `references/ddd-mapping.md` — mapping the colors to DDD building blocks and to Urbot's Java conventions.
  - `scripts/apply.mjs` — a deterministic, approval-gated generator for the approved model.
- **Discover the domain with Java Modeling in Color**:
  - classify candidates as moment-interval, role, party/place/thing, or description;
  - capture attributes, relationships, cardinalities, invariants, and ubiquitous language;
  - produce a color table and a DDD model before writing code.
- **Implement with DDD inside Urbot**:
  - aggregate roots and entities as `NamedEntity` interfaces in
    `src/main/java/com/embabel/bot/<bot>/domain/`;
  - value objects and domain events as Java records;
  - domain services when cross-aggregate behavior is needed;
  - use Urbot's `NamedEntityDataRepository`; do not add a second repository or persistence layer;
  - add `urbot.memory.entity-packages=com.embabel.bot.<bot>` so the domain types enter the data dictionary;
  - generate tests for value objects/invariants and the domain vocabulary.
- **Add the `urbot-domain-design` workflow**:
  `urbot-discovery → urbot-domain-design → urbot-verification`, with `CHECKPOINT: DOMAIN` before writes.
  If memory behavior is also requested, hand off to `urbot-domain-memory` as a separate workflow; do not run
  both unbounded flows in one pass.
- **Route and inventory the new skill**: add a domain-design row to the router, a pipeline entrypoint and
  skill route, a golden routing eval, and the new skill to `skills.json`, `.well-known`,
  `.claude-plugin/plugin.json`, `policies/modes.json`, the Urbot-only guard, `AGENTS.md`, `README.md`, and
  `skills.lock`.
- **Keep memory separate**: `urbot-domain-memory` stays the memory workflow. If the domain model is missing,
  it routes to `urbot-domain-design` first.
- **Non-goals**: no second domain model outside the Urbot bot package, no second persistence layer, no memory
  proposition implementation inside the domain-design skill, and no Urbot framework changes.

## Capabilities

### New Capabilities

- `urbot-domain-design`: defines color-modeling discovery, the DDD model, the generated Urbot domain
  artifacts, the domain-design workflow/checkpoint, the router/manifest integration, and the verification
  contract.

### Modified Capabilities

- `urbot-inspect-and-route`: the routing table gains a domain-design row. The existing domain/memory route
  remains for memory behavior.

## Impact

- **New assets**: `skills/urbot-domain-design/` (SKILL.md, references, scripts) and
  `workflows/urbot-domain-design.md`.
- **Updated**: `skills/urbot-router/SKILL.md`, `generator/urbot/route.mjs`, `workflows/routing/pipeline.json`,
  `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`,
  `policies/modes.json`, `policies/approval-checkpoints.md`, `scripts/dev/check-urbot-only.mjs`,
  `AGENTS.md`, `README.md`, `skills.lock`, and a new golden eval/fixture.
- **Counts**: eight Urbot skills, seven Urbot workflows, seven entrypoints/routes.
- **Tests**: domain fixture checks (color model, DDD model, generated Java, entity package, compile/test),
  routing eval, Urbot-only guard, `npm test`, and `openspec validate add-urbot-domain-design --strict`.
- **Out of scope**: memory propositions, tool changes, framework edits, and any second model or application.
