# Workflow: Urbot Domain Design

**Goal:** discover a Urbot bot domain with Java Modeling in Color and implement it with DDD inside the bot
package.

## Scope

This workflow touches the bot `domain/` package, its test package, and the bot properties. It does not
implement memory propositions, tools, or framework changes. Memory behavior is a separate
`urbot-domain-memory` workflow.

## Discover with color

Classify each candidate with exactly one color:

- pink — moment-interval;
- yellow — role;
- green — party, place, or thing;
- blue — description;
- milled — attribute/value.

Capture responsibility, attributes, relationships, cardinalities, invariants, and ubiquitous language. See
`skills/urbot-domain-design/references/color-modeling.md`.

## Implement with DDD

- one bounded context per bot profile;
- one root and one consistency boundary per aggregate;
- entities, aggregate roots, and catalog entities as `NamedEntity` interfaces under
  `src/main/java/com/embabel/bot/<bot>/domain/`;
- value objects and events as records;
- domain services for cross-aggregate behavior;
- repositories through Urbot's `NamedEntityDataRepository`, never a second persistence layer;
- `urbot.memory.entity-packages=com.embabel.bot.<bot>` in `application-<bot>.properties`;
- `@Relationship(name = "...")` on relationship getters, `@CreationPermitted` on entities,
  `@JsonClassDescription`/`@JsonPropertyDescription` from the model, and `@Nullable` for optional values.

See `skills/urbot-domain-design/references/ddd-mapping.md`.

## Ordered steps

1. **Discover** — run `urbot-discovery` to read the project, bot profile, and existing domain types.
2. **Design** — run `urbot-domain-design` to produce the color model, DDD model, invariants, and target files.
3. **Approve** — stop at `CHECKPOINT: DOMAIN`. Show the color model, DDD model, aggregate boundaries,
   invariants, entity package, and generated tests. Do not write before approval.
4. **Apply** — after approval, run:

   ```bash
   node skills/urbot-domain-design/scripts/apply.mjs \
     --project <urbot-checkout> \
     --bot <bot> \
     --model <domain-model.json> \
     --approve
   ```

   Add `--force` only to replace existing generated files.

5. **Verify** — run `urbot-verification`:

   ```bash
   ./mvnw -q -DskipTests compile
   ./mvnw -q test
   ```

6. **Hand off** — if memory behavior is requested, stop and report `urbot-domain-memory` as the next separate
   workflow.

## Model schema v2

The model requires `schemaVersion: 2`. Relationships split `method` (Java name) from `type` (Neo4j name) and
support `optional` and `direction` (`OUTGOING`, `INCOMING`, `BOTH`). A blue description can be a `value-object`
or a `catalog-entity`; catalog entities default to `@CreationPermitted(false)`.

## Sample models

`evals/fixtures/urbot/domain-travel.json` models a travel domain:

- `Trip` — pink moment-interval, aggregate root;
- `Traveler` — yellow role, entity;
- `Destination` — green party/place/thing, entity;
- `Itinerary` — blue description, value object;
- `DateRange` — milled attribute, value object;
- `TripPlanned` — domain event;
- `TripPlanningService` — cross-aggregate service.

`evals/fixtures/urbot/domain-music.json` models a music reference domain:

- `Composer` — entity with self `INFLUENCED`, `HAS_NATIONALITY`, `OF_EPOCH`, `USES`;
- `Work` — entity with `SCORED_FOR` and `FEATURES`;
- `Nationality`, `Genre`, `Epoch`, `Technique`, `Instrument`, `Ensemble`, `Family` — catalog entities;
- `Performer` — creatable entity.

## Output

```text
Route: urbot-domain-design
Skills: urbot-discovery → urbot-domain-design → urbot-verification
Bounded context: ...
Aggregates: ...
Entities: ...
Value objects: ...
Events: ...
Services: ...
Entity package: com.embabel.bot.<bot>
Files: ...
Compile: pass/fail
Tests: pass/fail
CHECKPOINT: DOMAIN (before write)
Memory handoff: urbot-domain-memory (separate, only if requested)
```

## Do not

- Create a second domain model, repository, or persistence layer.
- Put domain types outside the bot package.
- Write memory propositions here.
- Write before `CHECKPOINT: DOMAIN`.
- Run domain design and memory as one unbounded flow.
