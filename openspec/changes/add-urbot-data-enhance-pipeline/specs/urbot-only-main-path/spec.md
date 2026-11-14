# Spec Delta

## MODIFIED Requirements

### Requirement: The skill inventory is Urbot-only

The skills directory SHALL contain only the nine Urbot skills: `urbot-router`, `urbot-discovery`,
`urbot-profile`, `urbot-tool`, `urbot-domain-design`, `urbot-domain-memory`, `urbot-prompt`,
`urbot-verification`, and `urbot-data-enhance-pipeline`. No `manna-*` skill directory SHALL remain.

#### Scenario: Router is renamed and rewritten

- **WHEN** the change is applied
- **THEN** `skills/urbot-router/SKILL.md` exists with the 8-step router and Urbot routing table
- **AND** `skills/manna-router/` is absent

#### Scenario: Legacy skills are removed

- **WHEN** the skills directory is listed
- **THEN** no `manna-discovery`, `manna-agent`, `manna-tools`, `manna-domain`, `manna-graph`,
  `manna-memory`, `manna-pipeline`, `manna-transport`, `manna-evals`, or `manna-release` directory exists

### Requirement: The workflow inventory is Urbot-only

The workflows directory SHALL contain only the eight Urbot workflow documents and the routing directory. The
eight legacy workflow documents SHALL be removed.

#### Scenario: Legacy workflows are absent

- **WHEN** the workflows directory is listed
- **THEN** `requirement-to-slice.md`, `feature-add.md`, `feature-modify.md`, `tool-integration.md`,
  `memory-tuning.md`, `data-pipeline.md`, `quality-gate.md`, and `release.md` do not exist
- **AND** the eight `urbot-*` workflow documents remain

#### Scenario: Routing is Urbot-only

- **WHEN** `workflows/routing/pipeline.json` is read
- **THEN** its entrypoints and `skillRoutes` reference only the Urbot skills and workflows
- **AND** no legacy workflow id remains

### Requirement: Manifests and modes are Urbot-only

`skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, and
`policies/modes.json` SHALL list only the nine Urbot skills. The validator's router exception SHALL be
`urbot-router`.

#### Scenario: Manifests contain no legacy names

- **WHEN** the manifests are parsed
- **THEN** no `manna-*` skill entry exists
- **AND** all nine Urbot skills are present

#### Scenario: Validator accepts the Urbot router

- **WHEN** `npm run validate` runs
- **THEN** the router exception is `urbot-router`
- **AND** every other Urbot skill has a route

### Requirement: Documentation states the Urbot-only boundary

`AGENTS.md`, `README.md`, and `docs/architecture.md` SHALL state that the main path is Urbot-only, the legacy
files are deleted, and the retained orchestration spine is the current product. The package `files` list SHALL
not ship any legacy path.

#### Scenario: Entry docs describe the Urbot-only path

- **WHEN** a contributor reads `AGENTS.md` or `README.md`
- **THEN** the document says the legacy files are deleted and the main path is Urbot-only
- **AND** it lists the nine Urbot skills and eight Urbot workflows
