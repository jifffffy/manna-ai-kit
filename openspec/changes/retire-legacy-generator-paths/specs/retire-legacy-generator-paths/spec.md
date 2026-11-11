# Spec Delta

## Purpose

Defines the retirement of the legacy Manna generator: its assets move under `legacy/`, the main path stops
referencing them, validation and the kit lock cover only the main path, the retained orchestration spine stays
intact, and documentation makes the boundary explicit.

## ADDED Requirements

### Requirement: Legacy assets move under legacy/

The legacy generator assets SHALL be moved, not deleted, under `legacy/`:

- `legacy/templates/agent-core/`
- `legacy/generator/` containing the `init`/`slice`/`validate`/`lock` commands, `lib/`, and the old
  entrypoint
- `legacy/shared/schemas/project-spec.schema.json`, `capability-spec.schema.json`,
  `graph-schema.schema.json`, `memory-schema.schema.json`, and `pipeline-schema.schema.json`
- `legacy/examples/` and the legacy generator tests
- the `.manna` project artifacts, `project.designMode`, and `F-001` identifiers that live inside those assets

#### Scenario: Legacy directories are present under legacy/

- **WHEN** the change is applied
- **THEN** `templates/agent-core/`, `examples/`, and `generator/lib/` are absent from the main path
- **AND** their equivalents exist under `legacy/`

#### Scenario: Legacy assets are not deleted

- **WHEN** the change is applied
- **THEN** the old generator, templates, examples, schemas, and tests remain available under `legacy/`
- **AND** a later release may delete them

### Requirement: Main path does not reference legacy

No main-path source file, script, package script, manifest, or skill `requires` SHALL import or reference
`legacy/`, the moved schemas, the moved templates, or the moved examples. The urbot-only CLI SHALL NOT contain
the legacy `init`/`slice`/`validate`/`lock` command cases or import `generator/lib/`.

#### Scenario: Code scan finds no legacy references

- **WHEN** the main-path check runs
- **THEN** it reports no `legacy/` references in main `.mjs`/`.json` files, package scripts, or skill
  `requires`
- **AND** the CLI exposes only the `urbot` namespace

#### Scenario: Legacy skills stop requiring moved schemas

- **WHEN** a legacy `manna-*` skill previously required a moved schema
- **THEN** that requirement is removed or replaced by a main-path document
- **AND** `validate-kit` passes

### Requirement: validate-kit validates only the main path

`scripts/dev/validate-kit.mjs` SHALL validate main-path manifests, skills, workflows, and evals and SHALL skip
`legacy/`, `.opencode/`, `openspec/`, and `.github/`.

#### Scenario: Legacy JSON is ignored

- **WHEN** `npm run validate` runs
- **THEN** it validates the main manifests and JSON
- **AND** it does not parse or validate `legacy/` content

### Requirement: The kit lock covers only the main path

`scripts/dev/update-lock.mjs` SHALL exclude `legacy/`, and `skills.lock` SHALL contain no entries beginning
with `legacy/`. The lock check SHALL remain deterministic and pass.

#### Scenario: Lock has no legacy entries

- **WHEN** `npm run lock` regenerates `skills.lock`
- **THEN** no `legacy/` file is listed
- **AND** `npm run lock:check` passes

### Requirement: Documentation states the legacy boundary

`AGENTS.md`, `README.md`, and `docs/architecture.md` SHALL state that `legacy/` is historical reference only,
is not shipped, is not imported by the main path, and is scheduled for removal after one release. They SHALL
state that the main product path is Urbot orchestration.

#### Scenario: Entry documents describe the boundary

- **WHEN** a contributor reads `AGENTS.md` or `README.md`
- **THEN** the document names `legacy/` as historical and not part of the product
- **AND** the main path is described as Urbot orchestration

#### Scenario: Package metadata drops legacy assets

- **WHEN** the package is published
- **THEN** the `files` list does not include `templates/` or `examples/`
- **AND** `legacy/` is not shipped

### Requirement: The retained orchestration spine stays intact

The change SHALL retain the router architecture, the routing pipeline structure, `scripts/dev/validate-kit.mjs`,
`skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, `policies/modes.json`,
`policies/tool-safety.md`, the kit `skills.lock`, the golden routing eval mechanism, and the skills/workflow
document format.

#### Scenario: Retained assets still exist

- **WHEN** the retirement check runs
- **THEN** every retained path exists
- **AND** the routing evals and skill/workflow manifests remain valid

### Requirement: Main tests no longer depend on the generator

The main `npm test` SHALL run the positioning check, the legacy check, the routing evals, the profile check,
and the tool check. It SHALL NOT run the legacy generator test. CI SHALL NOT run the legacy generated-project
compile. A `check-legacy` guard SHALL enforce the boundary.

#### Scenario: Main test omits legacy generator

- **WHEN** `npm test` runs
- **THEN** it does not import the legacy generator or its templates/examples
- **AND** it passes

#### Scenario: Retirement guard fails on a legacy reference

- **WHEN** a main-path file, package script, or skill `requires` references `legacy/` or a moved schema
- **THEN** `npm run check:legacy` exits non-zero and names the offender

### Requirement: The change is verified

The change SHALL pass `npm test` and `openspec validate retire-legacy-generator-paths --strict`.

#### Scenario: Acceptance gate passes

- **WHEN** the change is complete
- **THEN** `npm test` passes
- **AND** `openspec validate retire-legacy-generator-paths --strict` passes
