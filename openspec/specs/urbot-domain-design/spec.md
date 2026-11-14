# urbot-domain-design Specification

## Purpose
Defines a domain-design skill that discovers a Urbot bot domain with Java Modeling in Color and implements it
with DDD inside the bot package.

## Requirements

### Requirement: Color-modeling discovery

`urbot-domain-design` SHALL discover the domain with Java Modeling in Color. Every candidate domain class
SHALL be classified as exactly one color archetype:

- pink — moment-interval;
- yellow — role;
- green — party, place, or thing;
- blue — description;
- milled — attribute/value.

The discovery SHALL capture the class responsibility, attributes, relationships, cardinalities, invariants,
and ubiquitous-language terms.

#### Scenario: Candidate classes are colored

- **WHEN** a request describes a domain
- **THEN** each candidate class is assigned exactly one color archetype
- **AND** the color model records its responsibility, attributes, relationships, and invariants

#### Scenario: Ubiquitous language is explicit

- **WHEN** the color model is produced
- **THEN** it names the ubiquitous-language terms used by the domain
- **AND** resolves synonyms before implementation

### Requirement: DDD model

The skill SHALL map the color model to a DDD model with a bounded context, aggregate boundaries, aggregate
roots, entities, catalog entities, value objects, domain events, domain services, and repositories.
Relationships SHALL respect aggregate boundaries, using identifiers for cross-aggregate references, and SHALL
record the graph relationship type separately from the Java method name.

#### Scenario: Colors map to DDD building blocks

- **WHEN** the color model is complete
- **THEN** it is mapped to aggregates, entities, catalog entities, value objects, events, services, and
  repositories
- **AND** each aggregate has one root and one consistency boundary

#### Scenario: Invariants live at the boundary

- **WHEN** an invariant spans one aggregate
- **THEN** it is enforced by the aggregate or a value object
- **AND** cross-aggregate behavior is assigned to a domain service

### Requirement: Implementation stays inside the Urbot bot package

The implementation SHALL write only inside `src/main/java/com/embabel/bot/<bot>/domain/` and the bot test
package:

- aggregate roots, entities, and catalog entities as `NamedEntity` interfaces;
- value objects and domain events as Java records;
- domain services as classes when needed;
- repositories using Urbot's `NamedEntityDataRepository`, never a second persistence layer;
- `urbot.memory.entity-packages=com.embabel.bot.<bot>` in `application-<bot>.properties`;
- generated domain tests.

#### Scenario: Entities follow the Urbot convention

- **WHEN** an entity, aggregate root, or catalog entity is generated
- **THEN** it is a `NamedEntity` interface in the bot domain package
- **AND** value objects and events are records in the same package or its `events/` subpackage

#### Scenario: No second model or repository

- **WHEN** the domain is implemented
- **THEN** no domain model exists outside the bot package
- **AND** no new repository or persistence layer is created

### Requirement: Existing types are reused

The skill SHALL inspect existing domain types and reuse them before adding a new type. It SHALL NOT fork an
entity into a second package or duplicate an existing value object.

#### Scenario: Existing domain is respected

- **WHEN** a domain type already exists
- **THEN** the plan reuses or extends it
- **AND** reports the reuse decision

### Requirement: The domain-design workflow runs with approval

`urbot-domain-design` SHALL run `urbot-discovery → urbot-domain-design → urbot-verification`, stopping at
`CHECKPOINT: DOMAIN` before any write. If memory behavior is requested, it SHALL hand off to
`urbot-domain-memory` as a separate workflow.

#### Scenario: Write follows discovery and approval

- **WHEN** a domain-design request is routed
- **THEN** discovery reads the project before any write
- **AND** the color and DDD models are shown at `CHECKPOINT: DOMAIN`
- **AND** files are written only after approval

#### Scenario: Memory is a separate handoff

- **WHEN** the request also needs memory propositions
- **THEN** the domain-design workflow stops after the domain implementation
- **AND** reports `urbot-domain-memory` as the next separate workflow

### Requirement: The skill is routed and inventoried

`urbot-domain-design` SHALL appear in `skills.json`, `.well-known/agent-skills/index.json`,
`.claude-plugin/plugin.json`, `policies/modes.json`, the router table, and
`workflows/routing/pipeline.json` with a domain-design entrypoint and skill route. The Urbot-only guard and
the `AGENTS.md`/`README.md` inventories SHALL include it.

#### Scenario: Router selects domain design

- **WHEN** a request asks for domain discovery or DDD modeling
- **THEN** the router selects `urbot-domain-design`
- **AND** reports `urbot-discovery → urbot-domain-design → urbot-verification`

#### Scenario: Inventory stays consistent

- **WHEN** `npm run validate` and `npm run check:urbot-only` run
- **THEN** the nine Urbot skills and eight Urbot workflows are consistent
- **AND** no legacy asset is introduced

### Requirement: Verification uses Urbot's own commands

The workflow SHALL verify with `./mvnw -DskipTests compile` and `./mvnw test`, including the generated domain
tests and the `urbot.memory.entity-packages` setting.

#### Scenario: Compile and tests pass

- **WHEN** the approved domain is applied to a Urbot checkout
- **THEN** `./mvnw -DskipTests compile` exits successfully
- **AND** `./mvnw test` exits successfully

#### Scenario: Domain vocabulary is registered

- **WHEN** the bot profile is active
- **THEN** `urbot.memory.entity-packages` includes `com.embabel.bot.<bot>`
- **AND** the generated domain types are available to the data dictionary

### Requirement: The change is verified

The change SHALL pass `npm test` and `openspec validate add-urbot-domain-design --strict`.

#### Scenario: Acceptance gate passes

- **WHEN** the change is complete
- **THEN** `npm test` passes
- **AND** `openspec validate add-urbot-domain-design --strict` passes

### Requirement: Domain model schema is versioned

The domain-design generator SHALL accept a versioned model with `schemaVersion: 2`. It SHALL reject a model
without the version or with an older version, and the error SHALL state that the model must be migrated to v2.
The v2 model SHALL support:

- `classes[].dddVariant`: `aggregate-root`, `entity`, `catalog-entity`, or `value-object`;
- `classes[].creationPermitted` and `classes[].description`;
- `classes[].relationships[].method`, `.type`, `.target`, `.cardinality`, `.optional`, and `.direction`;
- `classes[].attributes[].optional` and `.description`.

#### Scenario: A v2 model is accepted

- **WHEN** the model declares `schemaVersion: 2`
- **THEN** the generator validates and plans it
- **AND** every new field is reflected in the generated code

#### Scenario: A v1 model is rejected

- **WHEN** the model omits `schemaVersion` or declares an older version
- **THEN** the generator fails before writing
- **AND** the message tells the author to migrate the model to v2

### Requirement: Graph relationships are explicit

Every entity relationship SHALL generate a `@Relationship` annotation whose `name` is the Neo4j relationship
type. The Java method name SHALL be independent of the graph type, so `nationalities()` can map to
`HAS_NATIONALITY`. The model SHALL support self-relations, multiple relationship types between the same pair,
optional single relations, and `OUTGOING`/`INCOMING`/`BOTH` direction.

#### Scenario: Relationship name is separate from the method

- **WHEN** a class declares a relationship with `method: "nationalities"` and `type: "HAS_NATIONALITY"`
- **THEN** the generated getter is `nationalities()`
- **AND** it carries `@Relationship(name = "HAS_NATIONALITY")`

#### Scenario: Self and multi-type relations are generated

- **WHEN** the model declares `Composer -> INFLUENCED -> Composer` and both `SCORED_FOR` and `FEATURES` to
  instruments
- **THEN** the generator emits both self and multi-type getters with their own annotations
- **AND** no relationship is merged or renamed

#### Scenario: Optional and directed relations are annotated

- **WHEN** a single relation is optional
- **THEN** the getter carries `@Nullable`
- **AND** a non-default direction adds `direction = RelationshipDirection.<VALUE>`

### Requirement: Catalog entities are first-class

A blue description or reference catalog SHALL be representable as `catalog-entity`. A catalog entity SHALL be a
`NamedEntity` interface, not a record, so it keeps identity and graph persistence. The generator SHALL emit
`@CreationPermitted(false)` for catalog entities unless the model overrides it.

#### Scenario: Catalog is generated as an entity

- **WHEN** `Genre`, `Epoch`, or `Nationality` is declared as `catalog-entity`
- **THEN** the generator writes a `NamedEntity` interface
- **AND** it is not written as a record

#### Scenario: Creation policy is honored

- **WHEN** an entity declares `creationPermitted: true`
- **THEN** the generated interface carries `@CreationPermitted(true)`
- **AND** catalog entities default to `@CreationPermitted(false)`

### Requirement: Extraction metadata is generated

Entity and catalog interfaces SHALL carry `@JsonClassDescription` from the class description. Attributed getters
SHALL carry `@JsonPropertyDescription` when a description is present. Optional attributes and relations SHALL
carry `@Nullable`.

#### Scenario: Class and property descriptions reach the model

- **WHEN** a class and its attributes declare descriptions
- **THEN** the interface carries `@JsonClassDescription`
- **AND** each described getter carries `@JsonPropertyDescription`

#### Scenario: Optional values are nullable

- **WHEN** an attribute or single relation is optional
- **THEN** its getter or record component carries `@Nullable`
- **AND** nullability checks skip the optional value
