# Design

## Context

See `proposal.md` — Why. Urbot's domain model is a set of `NamedEntity` types in the bot package:

- `src/main/java/com/embabel/bot/<bot>/domain/` holds the domain vocabulary.
- `urbot.memory.entity-packages=com.embabel.bot.<bot>` adds the package to the data dictionary for
  proposition extraction and memory.
- `NamedEntityDataRepository` is the persistence boundary; there is no second repository or JPA layer.
- `urbot-domain-memory` is the memory workflow and is still a skeleton. It is not a domain discovery method.

The new skill fills the discovery/implementation gap. It does not replace the memory workflow.

## Goals / Non-Goals

**Goals:**

- Discover the domain with Java Modeling in Color (Coad's four archetypes plus attributes).
- Produce a DDD model: bounded context, aggregates, entities, value objects, events, services, repositories.
- Generate domain code inside the Urbot bot package, with tests and the entity-package property.
- Add the skill/workflow to the router, manifests, guard, docs, and tests.
- Keep memory as a separate handoff.

**Non-Goals:**

- A second domain model or persistence layer.
- Memory propositions/projections implementation in this skill.
- Tool, prompt, or framework changes.
- A second Spring Boot application.

## Decisions

### D1. Color-modeling discovery

The discovery vocabulary is:

| Color | Archetype | Typical DDD result |
|-------|-----------|--------------------|
| Pink | Moment-interval | Aggregate root or entity for something that happens over time |
| Yellow | Role | Role value object, or an entity when it has identity |
| Green | Party/place/thing | Entity or aggregate root for a durable actor/place/thing |
| Blue | Description | Value object or catalog entity |
| Milled | Attribute | Value object/record |

The skill asks: what moments/intervals? who or what participates? in what roles? what descriptions/catalogs?
what attributes? what relationships and cardinalities? what invariants? It records the ubiquitous language and
resolves synonyms before implementation. The output is a color table plus relationship/invariant notes.

### D2. DDD mapping and Urbot conventions

- Bounded context = the bot profile.
- Aggregate: one root and one consistency boundary; cross-aggregate references use IDs, not object graphs.
- Entities and aggregate roots are `NamedEntity` interfaces in
  `src/main/java/com/embabel/bot/<bot>/domain/`.
- Value objects and domain events are Java records.
- Domain services are classes in the bot package for cross-aggregate behavior.
- Repositories use Urbot's `NamedEntityDataRepository`; no new repository interface or persistence layer.
- Invariants live in value-object constructors, aggregate factories, or domain methods.
- `application-<bot>.properties` gets `urbot.memory.entity-packages=com.embabel.bot.<bot>`.
- The domain design does not write memory propositions; that is the memory workflow.

*Alternative considered:* implement a JPA-style entity model with repositories. Rejected — Urbot owns the
data dictionary and repository; a second model would violate the product boundary.

### D3. Script and generated artifacts

`skills/urbot-domain-design/scripts/apply.mjs` takes an approved model:

```bash
node skills/urbot-domain-design/scripts/apply.mjs \
  --project <urbot-checkout> \
  --bot travel \
  --model <domain-model.json> \
  --approve
```

The model contains `boundedContext`, `ubiquitousLanguage`, `classes` (name, color, dddVariant, description,
attributes, relationships, invariants), `events`, and `services`.

Generated artifacts:

```text
src/main/java/com/embabel/bot/<bot>/domain/<Entity>.java        # NamedEntity interface
src/main/java/com/embabel/bot/<bot>/domain/<ValueObject>.java   # record
src/main/java/com/embabel/bot/<bot>/domain/events/<Event>.java  # record
src/main/java/com/embabel/bot/<bot>/domain/<Service>.java       # optional domain service
src/test/java/com/embabel/bot/<bot>/domain/<Name>Test.java      # value-object/invariant test
src/main/resources/application-<bot>.properties                 # entity-packages update
```

The script validates that the bot profile exists, refuses to overwrite without `--force`, refuses to write
without `--approve`, and never creates a repository or memory proposition.

### D4. Workflow and checkpoints

`workflows/urbot-domain-design.md` runs:

1. `urbot-discovery` — read the project, existing domain, and target profile.
2. `urbot-domain-design` — color model → DDD model → plan.
3. `CHECKPOINT: DOMAIN` — approve the color/DDD model, target files, invariants, and entity package.
4. Apply via `scripts/apply.mjs --approve`.
5. `urbot-verification` — compile, tests, domain vocabulary/entity-package check.
6. If memory is requested, stop and report `urbot-domain-memory` as the next separate workflow.

`urbot-domain-memory` remains the memory workflow. If a memory request arrives without a domain model, it
routes to `urbot-domain-design` first; it never runs both in one pass.

### D5. Router, inventory, and guard

- Add `urbot-domain-design` to `skills.json`, `.well-known`, `.claude-plugin/plugin.json`, and
  `policies/modes.json` (mode `review`).
- Add a `urbot-domain-design` entrypoint and skill route to `workflows/routing/pipeline.json`.
- Add the domain-design row to `skills/urbot-router/SKILL.md` and `generator/urbot/route.mjs`.
- Update the Urbot-only guard to expect eight skills, seven workflows, seven entrypoints/routes, and to
  include the new skill in its scans.
- Update `AGENTS.md`/`README.md` Urbot-only inventories and counts.
- Add a domain-design golden eval/fixture.

### D6. Verification

- Generated value-object/invariant tests run in `./mvnw test`.
- `./mvnw -DskipTests compile` compiles the entity interfaces, records, events, and services.
- A test/check confirms `urbot.memory.entity-packages` includes the bot package and the domain vocabulary is
  discoverable.
- `npm test` runs the positioning check, Urbot-only guard, routing evals, profile/tool checks, and the new
  domain-design fixture check.
- `openspec validate add-urbot-domain-design --strict` passes.

## Risks / Trade-offs

- **Color modeling can become a naming exercise** → Require responsibilities, relationships, invariants, and
  a DDD mapping, not just colored boxes.
- **DDD can sprawl into a second model** → Constrain output to the bot `domain/` package and the existing
  `NamedEntity`/repository conventions.
- **Domain design and memory can blur** → Separate workflows; the design skill stops at the domain and hands
  off memory.
- **Generated code can be too generic** → The script generates a compiling scaffold; the approved model must
  carry the real attributes, relationships, and invariants.
- **Inventory drift** → Update manifests, routes, guard, docs, and lock in the same change.

## Migration Plan

1. Add the skill docs/references and the apply script.
2. Add the domain-design workflow and checkpoint.
3. Add the router row, pipeline entrypoint/route, manifests, modes, and golden eval.
4. Update the Urbot-only guard and docs.
5. Add the deterministic domain fixture test and real-checkout compile/test mode.
6. Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and
   `openspec validate add-urbot-domain-design --strict`.
7. Roll back by deleting the new skill/workflow/eval and reverting the router/manifests/guard/docs; no Urbot
   domain code is generated outside a target checkout or temp copy.

## Open Questions

None blocking. Whether the domain-design workflow should also generate memory propositions is deliberately
out of scope; that remains the memory workflow.
