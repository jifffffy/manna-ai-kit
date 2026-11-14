# urbot-only-main-path Specification

## Purpose
Defines the final removal of the retired generator and all `manna-*` assets, leaving a single Urbot-only main
path with the router architecture, six Urbot workflows, and the retained orchestration spine.

## Requirements

### Requirement: The legacy directory and files are deleted

The change SHALL delete `legacy/` and its generator, templates, examples, schemas, tests, and old golden
evals. No legacy copy SHALL remain in the repository.

#### Scenario: Legacy directory is absent

- **WHEN** the change is applied
- **THEN** `legacy/` does not exist
- **AND** no replacement copy of the retired generator is present

#### Scenario: No generator support files remain

- **WHEN** the main path is inspected
- **THEN** `templates/agent-core`, `examples/`, and `generator/lib` are absent
- **AND** the five retired project schemas are absent

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

### Requirement: Shared assets are Urbot-only

`shared/patterns/` and `shared/schemas/` SHALL be deleted. `shared/SKILL-template.md` SHALL remain as the
skills/workflow document format, with an Urbot example name.

#### Scenario: Only the skill template remains

- **WHEN** the shared directory is listed
- **THEN** it contains `SKILL-template.md` and no generator-era patterns or schemas
- **AND** the template example uses an Urbot name

### Requirement: The retained spine stays intact

The change SHALL retain the `urbot-router` architecture, the routing pipeline structure,
`scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`,
`.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, the kit `skills.lock`, the
golden routing eval mechanism, and the skills/workflow document format.

#### Scenario: Retained files still exist

- **WHEN** the retention check runs
- **THEN** every retained path exists
- **AND** the Urbot routing evals and skill manifests remain valid

### Requirement: The Urbot-only guard replaces the legacy guard

`check:legacy` SHALL be replaced by `check:urbot-only`. The guard SHALL fail if `legacy/`, a `manna-*` skill
or workflow, a legacy shared asset, a legacy manifest entry, or a legacy reference remains in the main path.

#### Scenario: Guard passes on the Urbot-only tree

- **WHEN** `npm run check:urbot-only` runs
- **THEN** it reports that the main path is Urbot-only

#### Scenario: Guard fails on a reintroduced legacy asset

- **WHEN** a `manna-*` skill, legacy workflow, `legacy/` directory, or legacy manifest entry is added back
- **THEN** the guard exits non-zero and names the offender

### Requirement: Documentation states the Urbot-only boundary

`AGENTS.md`, `README.md`, and `docs/architecture.md` SHALL state that the main path is Urbot-only, the legacy
files are deleted, and the retained orchestration spine is the current product. The package `files` list SHALL
not ship any legacy path.

#### Scenario: Entry docs describe the Urbot-only path

- **WHEN** a contributor reads `AGENTS.md` or `README.md`
- **THEN** the document says the legacy files are deleted and the main path is Urbot-only
- **AND** it lists the nine Urbot skills and eight Urbot workflows

### Requirement: The change is verified

The change SHALL pass `npm test` and `openspec validate urbot-only-main-path --strict`.

#### Scenario: Acceptance gate passes

- **WHEN** the change is complete
- **THEN** `npm test` passes
- **AND** `openspec validate urbot-only-main-path --strict` passes
