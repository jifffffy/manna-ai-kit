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
roots, entities, value objects, domain events, domain services, and repositories. Relationships SHALL respect
aggregate boundaries, using identifiers for cross-aggregate references.

#### Scenario: Colors map to DDD building blocks

- **WHEN** the color model is complete
- **THEN** it is mapped to aggregates, entities, value objects, events, services, and repositories
- **AND** each aggregate has one root and one consistency boundary

#### Scenario: Invariants live at the boundary

- **WHEN** an invariant spans one aggregate
- **THEN** it is enforced by the aggregate or a value object
- **AND** cross-aggregate behavior is assigned to a domain service

### Requirement: Implementation stays inside the Urbot bot package

The implementation SHALL write only inside `src/main/java/com/embabel/bot/<bot>/domain/` and the bot test
package:

- aggregate roots and entities as `NamedEntity` interfaces;
- value objects and domain events as Java records;
- domain services as classes when needed;
- repositories using Urbot's `NamedEntityDataRepository`, never a second persistence layer;
- `urbot.memory.entity-packages=com.embabel.bot.<bot>` in `application-<bot>.properties`;
- generated domain tests.

#### Scenario: Entities follow the Urbot convention

- **WHEN** an entity or aggregate root is generated
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
- **THEN** the eight Urbot skills and seven Urbot workflows are consistent
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
