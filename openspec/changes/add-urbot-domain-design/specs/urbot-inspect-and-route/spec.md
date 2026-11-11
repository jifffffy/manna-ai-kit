# Spec Delta

## MODIFIED Requirements

### Requirement: Routing table is complete

The router SHALL map intents to workflows as follows: new project or bot to `urbot-bootstrap`;
new/modified profile to `urbot-profile-change`; persona/objective/behaviour change to
`urbot-prompt-tuning`; Tool/MCP/Subagent/Reference addition to `urbot-tool-development`; domain
discovery/modeling (color modeling + DDD) to `urbot-domain-design`; NamedEntity/Relations/Memory addition to
`urbot-domain-memory`; test/compile/regression to `urbot-verification`. An ambiguous request SHALL be resolved
by reading the project and asking exactly one precise question.

#### Scenario: Each known intent selects its workflow

- **WHEN** the request matches one of the seven known intents
- **THEN** the router selects the corresponding workflow from the routing table
- **AND** reports only that workflow and its skills

#### Scenario: Ambiguous intent asks one question

- **WHEN** the request does not clearly match a known intent
- **THEN** the router reads the project state
- **AND** asks exactly one precise disambiguating question before selecting a workflow
