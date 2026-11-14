# Spec Delta

## MODIFIED Requirements

### Requirement: Routing table is complete

The router SHALL map intents to workflows as follows: new project or bot to `urbot-bootstrap`;
new/modified profile to `urbot-profile-change`; persona/objective/behaviour change to
`urbot-prompt-tuning`; Tool/MCP/Subagent/Reference addition to `urbot-tool-development`; domain
discovery/modeling (color modeling + DDD) to `urbot-domain-design`; NamedEntity/Relations/Memory addition to
`urbot-domain-memory`; test/compile/regression to `urbot-verification`; data enhancement, CSV review, or
approved-data apply to `urbot-data-enhance-pipeline`. An ambiguous request SHALL be resolved by reading the
project and asking exactly one precise question.

#### Scenario: Each known intent selects its workflow

- **WHEN** the request matches one of the eight known intents
- **THEN** the router selects the corresponding workflow from the routing table
- **AND** reports only that workflow and its skills

#### Scenario: Ambiguous intent asks one question

- **WHEN** the request does not clearly match a known intent
- **THEN** the router reads the project state
- **AND** asks exactly one precise disambiguating question before selecting a workflow

## ADDED Requirements

### Requirement: Nine skills and eight workflows exist

Manna SHALL provide nine skills (`urbot-router`, `urbot-discovery`, `urbot-profile`, `urbot-tool`,
`urbot-domain-design`, `urbot-domain-memory`, `urbot-prompt`, `urbot-verification`, and
`urbot-data-enhance-pipeline`) each with `SKILL.md`, `references/`, and `scripts/`, and eight workflows
(`urbot-bootstrap`, `urbot-profile-change`, `urbot-tool-development`, `urbot-domain-design`,
`urbot-domain-memory`, `urbot-prompt-tuning`, `urbot-verification`, and `urbot-data-enhance-pipeline`)
declared in `workflows/routing/pipeline.json`. The data-enhancement skill SHALL ship a working reviewer script;
the remaining skills and workflows remain documentation skeletons.

#### Scenario: Skill skeletons are present and routed

- **WHEN** the kit is validated
- **THEN** each of the nine skill directories exists with its required files
- **AND** each non-router skill has a route in `workflows/routing/pipeline.json`

#### Scenario: Phase 1 does not implement modification workflows

- **WHEN** a request would modify Urbot during Phase 1
- **THEN** the workflow stops at a read-only inspection or a documented checkpoint
- **AND** does not write to the Urbot project

### Requirement: Golden routing evals cover every route

The kit SHALL include one golden routing eval per route, covering new project, profile/prompt, tool,
domain design, domain/memory, verification, and data enhancement. A routing eval runner SHALL assert that each
fixture request selects its expected workflow.

#### Scenario: Every eval routes correctly

- **WHEN** the routing eval runner executes the fixtures
- **THEN** every fixture selects the workflow declared by its eval
- **AND** the runner exits successfully

#### Scenario: A wrong route fails the runner

- **WHEN** a fixture routes to a workflow other than its expected workflow
- **THEN** the runner reports the mismatch and exits non-zero

## REMOVED Requirements

### Requirement: Six skills and six workflows exist as skeletons

**Reason**: The inventory grew; the requirement named a stale count and omitted the data-enhancement skill.

**Migration**: Use `Nine skills and eight workflows exist`; the validator enforces the actual directory,
manifest, and route inventory.

### Requirement: Golden routing evals pass

**Reason**: The requirement named five evals and did not require coverage of the new data-enhancement route.

**Migration**: Use `Golden routing evals cover every route`; the runner increments with each route.
