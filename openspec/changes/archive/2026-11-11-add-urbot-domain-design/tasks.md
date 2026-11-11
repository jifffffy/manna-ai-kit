# Tasks

## 1. Add the skill documentation

- [x] 1.1 Create `skills/urbot-domain-design/SKILL.md` with the when-to-use, inputs, color-modeling process, DDD mapping, `CHECKPOINT: DOMAIN`, script usage, output, and non-goals.
- [x] 1.2 Add `skills/urbot-domain-design/references/color-modeling.md` with the four color archetypes, milled attributes, discovery questions, relationship notation, and a worked example.
- [x] 1.3 Add `skills/urbot-domain-design/references/ddd-mapping.md` with the color→DDD table, aggregate rules, entity/value-object criteria, events/services/repositories, and the Urbot Java conventions.
- [x] 1.4 Add tracked placeholder files under `references/` and `scripts/` as needed; verify the skill directory contains `SKILL.md`, `references/`, and `scripts/`.

## 2. Implement the domain-design script

- [x] 2.1 Implement `skills/urbot-domain-design/scripts/apply.mjs` with `--project`, `--bot`, `--model`, `--approve`, and `--force`; verify a run without `--approve` returns a plan and writes nothing.
- [x] 2.2 Validate the target checkout and bot profile; return `profile-required → urbot-profile-change` when the bot package or profile properties are missing.
- [x] 2.3 Validate the model: bounded context, ubiquitous language, classes with exactly one color, DDD variant, attributes, relationships, invariants, events, and services.
- [x] 2.4 Generate `NamedEntity` interfaces for entities/aggregate roots under `src/main/java/com/embabel/bot/<bot>/domain/`; verify one interface per entity and correct imports.
- [x] 2.5 Generate records for value objects and `domain/events/` records for domain events; generate optional domain services; verify no repository or persistence class is generated.
- [x] 2.6 Generate domain tests for value objects/invariants and the domain vocabulary; verify the test package is `src/test/java/com/embabel/bot/<bot>/domain/`.
- [x] 2.7 Add `urbot.memory.entity-packages=com.embabel.bot.<bot>` to `application-<bot>.properties` without removing existing entries; verify an existing value is merged.
- [x] 2.8 Refuse to overwrite existing generated files without `--force`; verify re-applying is a no-op.

## 3. Implement color-modeling discovery

- [x] 3.1 Implement the discovery process in `SKILL.md`: identify moments/intervals, parties/places/things, roles, descriptions, attributes, relationships, cardinalities, invariants, and ubiquitous language.
- [x] 3.2 Require exactly one color per candidate class and reject uncolored or multi-colored candidates.
- [x] 3.3 Produce the color model table and the DDD model before the checkpoint; verify the output includes class, color, responsibility, attributes, relationships, invariants, and DDD variant.

## 4. Implement the DDD mapping and generated code

- [x] 4.1 Map pink moment-intervals to aggregate roots/entities; yellow roles to role value objects/entities; green party/place/thing to entities/aggregate roots; blue descriptions to value objects/catalog entities; milled attributes to records.
- [x] 4.2 Enforce one aggregate root per boundary and use identifiers for cross-aggregate references; verify the model has no cross-aggregate object graphs.
- [x] 4.3 Keep invariants in value-object constructors, aggregate factories, or domain methods; verify each invariant has a test or a documented owner.
- [x] 4.4 Verify the implementation uses Urbot's `NamedEntityDataRepository` if persistence is needed and creates no second repository.

## 5. Add the workflow and memory handoff

- [x] 5.1 Create `workflows/urbot-domain-design.md` with `urbot-discovery → urbot-domain-design → urbot-verification`, `CHECKPOINT: DOMAIN` before writes, and the apply/verification steps.
- [x] 5.2 Add the color/DDD example and target files to the workflow; verify the example uses a moment-interval, role, party/place/thing, description, value object, and event.
- [x] 5.3 Add the memory handoff: if memory is requested, stop after the domain and report `urbot-domain-memory` as a separate workflow; verify the domain workflow does not write memory propositions.
- [x] 5.4 Update `skills/urbot-domain-memory/SKILL.md` and `workflows/urbot-domain-memory.md` to route to `urbot-domain-design` when the domain model is missing; verify the domain/memory workflows do not run both unbounded flows.

## 6. Wire routing, manifests, and the guard

- [x] 6.1 Add `urbot-domain-design` to `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, and `policies/modes.json` with mode `review`.
- [x] 6.2 Add a `urbot-domain-design` entrypoint and skill route to `workflows/routing/pipeline.json`; keep the memory entrypoint separate.
- [x] 6.3 Add the domain-design row to `skills/urbot-router/SKILL.md` and `generator/urbot/route.mjs`; update `ROUTE_DETAILS`/`ROUTE_IDS` and the domain-design target files.
- [x] 6.4 Add a `urbot-domain-design` golden eval/fixture; update `scripts/dev/test-routing.mjs` expected routes and eval count.
- [x] 6.5 Update `scripts/dev/check-urbot-only.mjs` to expect eight skills, seven workflows, seven entrypoints/routes, and to include `urbot-domain-design` in its scans.
- [x] 6.6 Update the `DOMAIN` checkpoint row in `policies/approval-checkpoints.md` to include the color model, aggregates, value objects, and events.

## 7. Update docs and tests

- [x] 7.1 Update `AGENTS.md` and `README.md` Urbot-only inventories to include the new skill/workflow and the eight/seven counts.
- [x] 7.2 Add `scripts/dev/test-domain-design.mjs` with a deterministic fixture model: assert the color/DDD plan, generated interfaces/records/events/tests, entity-packages property, no repository, and the memory handoff.
- [x] 7.3 Add a real-checkout mode (`--project <dir>`): copy a Urbot checkout, apply an approved travel domain model, and run `./mvnw -q -DskipTests compile` and `./mvnw -q test`.
- [x] 7.4 Add `test:domain` to `package.json` and include the deterministic mode in `npm test`.
- [x] 7.5 Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and `openspec validate add-urbot-domain-design --strict`; confirm all pass.
- [x] 7.6 Verify the main path has eight skills, seven workflows, seven routes, no second domain model/repository, and a new domain-design fixture.
