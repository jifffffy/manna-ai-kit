# Design

## Context

See `proposal.md` — Why. Impromptu's `domain/reference` shows the target shape: `NamedEntity` interfaces with
`@Relationship(name = ...)` getters, self-relations (`Composer.influenced`), multiple relationship types between
the same pair (`SCORED_FOR`/`FEATURES`), catalog nodes (`Genre`, `Epoch`, `Nationality`, `Technique`,
`Instrument`, `Ensemble`, `Family`), `@CreationPermitted`, and Jackson descriptions.

The current generator (`skills/urbot-domain-design/scripts/apply.mjs`) supports five colors, three DDD variants,
flat getters, and a v1 model. The change is scoped to graph modeling: relationships, catalog entities, creation
policy, extraction metadata, and nullability. It keeps the flat `domain/` package.

## Goals / Non-Goals

**Goals:**

- A v2 model that can express impromptu's relationship and catalog patterns.
- Generated code that DICE/Neo4j and the LLM tooling can interpret.
- Reject v1 models with a clear migration message.
- Keep the color model and DDD mapping as the discovery method.

**Non-Goals:**

- Subpackages (`domain/reference`, `domain/performance`) and cross-package imports.
- Derived methods, factories, or non-persistent `Asset` models.
- Changing the five color archetypes.
- A second persistence layer or repository.

## Model schema v2

```json
{
  "schemaVersion": 2,
  "boundedContext": "Music Reference",
  "ubiquitousLanguage": ["Composer", "Work", "Genre"],
  "classes": [
    {
      "name": "Composer",
      "color": "party-place-thing",
      "dddVariant": "entity",
      "creationPermitted": false,
      "description": "A composer in the graph.",
      "attributes": [
        { "name": "completeName", "type": "String", "description": "Full name" },
        { "name": "birthYear", "type": "Long", "optional": true }
      ],
      "relationships": [
        { "method": "nationalities", "type": "HAS_NATIONALITY", "target": "Nationality", "cardinality": "many" },
        { "method": "influenced", "type": "INFLUENCED", "target": "Composer", "cardinality": "many" },
        { "method": "epoch", "type": "OF_EPOCH", "target": "Epoch", "cardinality": "one", "optional": true },
        {
          "method": "influencedBy",
          "type": "INFLUENCED",
          "target": "Composer",
          "cardinality": "many",
          "direction": "INCOMING"
        }
      ],
      "invariants": []
    }
  ]
}
```

### Variants and colors

| Color | Allowed variants |
|---|---|
| moment-interval | `aggregate-root`, `entity` |
| role | `entity`, `value-object` |
| party-place-thing | `entity`, `aggregate-root` |
| description | `value-object`, `catalog-entity` |
| milled | `value-object` |

A `catalog-entity` is a `NamedEntity` interface. A value object is a record. A value object with relationships
is rejected: relationships belong to graph entities.

### Field rules

- `schemaVersion` must be `2`.
- `classes[].name` is PascalCase and unique.
- `classes[].creationPermitted` is optional; default `true` for `entity`/`aggregate-root`, `false` for
  `catalog-entity`; rejected on value objects.
- `classes[].description` is optional and becomes `@JsonClassDescription`.
- `attributes[].optional` defaults to `false`; optional components carry `@Nullable` and skip the null check.
- `relationships[].method` is lowerCamelCase and unique within the class.
- `relationships[].type` is `UPPER_SNAKE_CASE` and becomes the annotation name.
- `relationships[].cardinality` is `one` or `many`; `optional` is rejected for `many`.
- `relationships[].direction` is `OUTGOING` (default), `INCOMING`, or `BOTH`.
- Multiple methods may use the same `type` (for example `SCORED_FOR` on ensembles and instruments) and the same
  target with different types (`SCORED_FOR` vs `FEATURES`).

## Generation rules

An entity, aggregate root, or catalog entity becomes:

```java
@CreationPermitted(false)
@JsonClassDescription("A composer in the graph.")
public interface Composer extends NamedEntity {

    @JsonPropertyDescription("Full name")
    String completeName();

    @Nullable
    Long birthYear();

    @Relationship(name = "HAS_NATIONALITY")
    List<Nationality> nationalities();

    @Nullable
    @Relationship(name = "OF_EPOCH")
    Epoch epoch();

    @Relationship(name = "INFLUENCED", direction = RelationshipDirection.BOTH)
    List<Composer> influenced();
}
```

- `@Relationship` and `RelationshipDirection` come from `com.embabel.agent.rag.model`.
- `@CreationPermitted` comes from `com.embabel.agent.core`.
- `@JsonClassDescription` and `@JsonPropertyDescription` come from `com.fasterxml.jackson.annotation`.
- `@Nullable` comes from `org.jspecify.annotations.Nullable`.
- `List` is imported only when the class has a `many` relationship.
- `RelationshipDirection` is imported only when a non-default direction is used.
- Descriptions are escaped for Java string literals (quotes, backslashes, newlines).

A value object becomes a record. Required reference components keep the null check; optional components carry
`@Nullable` and no check. Records do not get relationship getters.

## Validation and migration

- `schemaVersion !== 2` fails with: `Domain model schema version must be 2; migrate the model first.`
- Unknown colors, variants, relationship fields, or targets fail before any write.
- A value-object with relationships fails.
- The travel fixture is migrated to v2; a music fixture is added with `Composer`, `Work`, `Nationality`,
  `Genre`, `Epoch`, `Technique`, `Instrument`, `Ensemble`, and `Performer`.

## Tests

`scripts/dev/test-domain-design.mjs` adds:

- v2 travel still generates the expected entities, records, events, and services;
- v1 is rejected with the migration message;
- `Composer` carries `@CreationPermitted(false)`, `@JsonClassDescription`, `@Relationship` on
  `nationalities`/`influenced`/`epoch`, and `@Nullable` on the optional relation/attribute;
- `Work` emits both `SCORED_FOR` getters and the `FEATURES` getter;
- `Genre`/`Nationality` are interfaces, not records;
- `Performer` carries `@CreationPermitted(true)`;
- duplicate relationship methods, an invalid direction, and a value object with a relationship fail.

## Risks / Trade-offs

- **Jackson annotations on records** → Descriptions are generated on entity getters only; records keep
  nullability but no property descriptions. This avoids annotation-target surprises.
- **Catalog semantics** → `catalog-entity` is limited to the description color; a catalog that is actually a
  party/place/thing stays an entity.
- **`@CreationPermitted` default** → The default is explicit in the plan, so an unintended creatable catalog is
  visible before approval.
- **v2 is breaking** → The error names the version and the fixture migration is part of the change.
- **Flat package** → Self-relations and same-package targets need no imports; subpackages remain out of scope.

## Migration Plan

1. Add v2 validation and the new fields to `apply.mjs`.
2. Generate `@Relationship`, `@CreationPermitted`, Jackson descriptions, and `@Nullable`.
3. Add `catalog-entity` support and its default creation policy.
4. Migrate `domain-travel.json`; add `domain-music.json`.
5. Update tests, SKILL.md, references, and the workflow.
6. Run `npm test`, `npm run lock`, and `openspec validate improve-domain-design-graph-modeling --strict`.
7. Roll back by restoring the v1 schema and removing the annotations.

## Open Questions

None. Subpackages, derived methods, and non-persistent assets are explicitly out of scope.
