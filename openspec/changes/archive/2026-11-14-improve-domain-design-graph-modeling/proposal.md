# Proposal

## Why

Impromptu's domain is graph-native: entities declare `@Relationship(name = "INFLUENCED")` getters, self-relations,
multiple relationship types between the same pair, catalog nodes such as `Genre` and `Nationality`, creation
policy through `@CreationPermitted`, and extraction hints through `@JsonClassDescription` /
`@JsonPropertyDescription`. Our `urbot-domain-design` generator emits plain getters with no relationship names,
turns blue descriptions into value records, and has no schema for any of this. The generated model therefore
cannot express the relationships or extraction semantics that DICE and the LLM tooling rely on.

## What Changes

- **Introduce domain-model schema v2** (breaking):
  - `schemaVersion: 2`;
  - `catalog-entity` as a DDD variant for blue description/reference catalogs;
  - relationship fields split into `method` (Java name), `type` (Neo4j relationship name), `cardinality`,
    `optional`, and `direction`;
  - attribute `optional` and `description`;
  - class `creationPermitted` and `description`.
- **Generate graph annotations**: `@Relationship(name = ..., direction = ...)` on relationship getters, including
  self-relations and multiple relationship types to the same target.
- **Generate extraction metadata**: `@CreationPermitted(...)`, `@JsonClassDescription(...)` on entity/catalog
  interfaces, `@JsonPropertyDescription(...)` on attributed getters, and `@Nullable` for optional values.
- **Make catalog entities first-class**: `Genre`, `Epoch`, `Nationality`, `Technique`, `Instrument`, `Ensemble`,
  and `Family` are `NamedEntity` interfaces, not records.
- **Validate v2 and reject v1** with a migration message; migrate the travel fixture and add a music fixture that
  exercises self-relations, multi-type relations, catalogs, and creation policy.
- Update the skill, references, workflow, tests, and the domain-design spec.
- **BREAKING**: existing domain-model JSON files must add `schemaVersion: 2` and the new relationship fields.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `urbot-domain-design`: the generated model now carries explicit graph relationships, catalog entities,
  creation policy, and extraction metadata; the model schema is versioned at v2.

## Impact

- `skills/urbot-domain-design/scripts/apply.mjs` (schema validation, annotations, catalog entities)
- `skills/urbot-domain-design/SKILL.md`, `references/color-modeling.md`, `references/ddd-mapping.md`
- `workflows/urbot-domain-design.md`
- `evals/fixtures/urbot/domain-travel.json`, new `evals/fixtures/urbot/domain-music.json`
- `scripts/dev/test-domain-design.mjs`
- `openspec/specs/urbot-domain-design/spec.md` (through the change delta)
- `skills.lock`
- **Out of scope**: subpackages, derived methods/factories, non-persistent `Asset` models, changing the color
  archetypes, and adding a second persistence layer.
