# Spec Delta

## Purpose

Defines the read-only Phase 1 entry point that fetches a pinned Urbot checkout, records the resolved commit,
inspects the project, and routes a natural-language request to the correct Urbot development workflow.

## ADDED Requirements

### Requirement: Remote fetch records a resolved commit

`manna urbot init` SHALL fetch the Urbot repository with
`git clone --depth=1 --single-branch --branch <ref> https://github.com/jifffffy/urbot <dir>` and SHALL record
the exact commit with `git -C <dir> rev-parse HEAD`. The resolved commit SHALL be printed on success.

#### Scenario: Clone prints the resolved commit

- **WHEN** a user runs `manna urbot init --repo https://github.com/jifffffy/urbot --ref main --dir <dir>`
- **THEN** the command clones the requested ref
- **AND** prints the resolved commit returned by `git rev-parse HEAD`

#### Scenario: Optional source record

- **WHEN** the user opts in to state writing
- **THEN** Manna may write `.manna-run/source.json` containing `repository`, `requestedRef`,
  `resolvedCommit`, and `fetchedAt`
- **AND** the file is not treated as a project spec, does not lock Urbot source, and is not required for later
  commands

### Requirement: Tag-first ref resolution

`manna urbot init` SHALL prefer an exact tag match (`refs/tags/<ref>`, including `vX.Y.Z`). When no tag
matches, it SHALL treat the ref as a branch and record both the branch and the resolved commit.

#### Scenario: Tag takes precedence

- **WHEN** the requested ref matches a tag in the Urbot repository
- **THEN** `requestedRef` records the tag reference
- **AND** `resolvedCommit` records the commit the tag points at

#### Scenario: Branch fallback

- **WHEN** the requested ref does not match a tag
- **THEN** Manna treats it as a branch
- **AND** records the branch name plus the resolved commit

### Requirement: No Template API and no merge engine

Manna SHALL update a checkout using Git clone/fetch only. It SHALL NOT use the GitHub Template API as an
update mechanism and SHALL NOT implement a Manna-owned merge engine.

#### Scenario: Update path is Git-native

- **WHEN** Manna refreshes a Urbot checkout
- **THEN** it uses Git operations against `https://github.com/jifffffy/urbot`
- **AND** it does not invoke a GitHub Template API or a custom merge algorithm

### Requirement: Router follows eight ordered steps

`manna urbot inspect` SHALL execute these steps in order:

1. Confirm the target directory.
2. If the directory does not exist, select `urbot-bootstrap`.
3. If it exists, read Git state and Urbot project state.
4. Identify the target profile.
5. Classify exactly one intent.
6. Select exactly one workflow.
7. Output the target files and verification commands.
8. Hand control to the selected workflow.

#### Scenario: Missing target directory routes to bootstrap

- **WHEN** the target directory does not exist
- **THEN** the router selects `urbot-bootstrap`
- **AND** does not attempt to inspect a missing project

#### Scenario: Existing target is inspected before routing

- **WHEN** the target directory exists
- **THEN** the router reads Git and project state before classifying the intent
- **AND** the route reflects the observed project state

### Requirement: Routing table is complete

The router SHALL map intents to workflows as follows: new project or bot to `urbot-bootstrap`;
new/modified profile to `urbot-profile-change`; persona/objective/behaviour change to
`urbot-prompt-tuning`; Tool/MCP/Subagent/Reference addition to `urbot-tool-development`;
NamedEntity/Relations/Memory addition to `urbot-domain-memory`; test/compile/regression to
`urbot-verification`. An ambiguous request SHALL be resolved by reading the project and asking exactly one
precise question.

#### Scenario: Each known intent selects its workflow

- **WHEN** the request matches one of the six known intents
- **THEN** the router selects the corresponding workflow from the routing table
- **AND** reports only that workflow and its skills

#### Scenario: Ambiguous intent asks one question

- **WHEN** the request does not clearly match a known intent
- **THEN** the router reads the project state
- **AND** asks exactly one precise disambiguating question before selecting a workflow

### Requirement: Inspect is read-only

`manna urbot inspect` SHALL NOT modify the target project, its Git state, its configuration, or its source
files. The default path SHALL write no files.

#### Scenario: Default inspect leaves the project unchanged

- **WHEN** a user runs `manna urbot inspect` without an explicit state-writing option
- **THEN** the project files and Git state are unchanged
- **AND** no run-state file is created

### Requirement: Discovery output contract

The read-only `urbot-discovery` skill SHALL report: Project, Source, Commit, Profiles, Target profile,
Bot package, Persona, Objective, Domain types, and Tools.

#### Scenario: Discovery report includes all fields

- **WHEN** discovery inspects a Urbot checkout
- **THEN** its report contains every field listed in this requirement
- **AND** fields that are absent in the project are reported as absent rather than invented

### Requirement: Six skills and six workflows exist as skeletons

Manna SHALL provide six skills (`urbot-discovery`, `urbot-profile`, `urbot-tool`,
`urbot-domain-memory`, `urbot-prompt`, `urbot-verification`) each with `SKILL.md`, `references/`, and
`scripts/`, and six workflows (`urbot-bootstrap`, `urbot-profile-change`, `urbot-tool-development`,
`urbot-domain-memory`, `urbot-prompt-tuning`, `urbot-verification`) declared in
`workflows/routing/pipeline.json`. Phase 1 SHALL implement only `urbot-discovery` read-only behavior and the
read-only paths of `urbot-bootstrap` and `urbot-verification`; the remaining skills and workflows are
documentation skeletons.

#### Scenario: Skill skeletons are present and routed

- **WHEN** the kit is validated
- **THEN** each of the six skill directories exists with its required files
- **AND** each non-router skill has a route in `workflows/routing/pipeline.json`

#### Scenario: Phase 1 does not implement modification workflows

- **WHEN** a request would modify Urbot during Phase 1
- **THEN** the workflow stops at a read-only inspection or a documented checkpoint
- **AND** does not write to the Urbot project

### Requirement: Run state is minimal and optional

Manna SHALL not create long-lived state by default. If the user opts in, it MAY write
`.manna-run/<run-id>.json` containing only `runId`, `repository`, `resolvedCommit`, `targetProfile`,
`request`, `route`, `skills`, `changedFiles`, `commands`, and `status`. The run state SHALL NOT copy domain
data, hash Urbot source, or replace Git. `.manna-run/` SHALL be gitignored by default.

#### Scenario: State writing is opt-in and minimal

- **WHEN** the user opts in to run state
- **THEN** Manna writes only the allowed fields to `.manna-run/<run-id>.json`
- **AND** does not store a domain copy or a source hash

#### Scenario: Run state is gitignored

- **WHEN** a `.manna-run/` directory is created
- **THEN** it is excluded by `.gitignore`

### Requirement: Golden routing evals pass

The kit SHALL include five golden routing evals covering new project, profile/prompt, tool, domain/memory,
and verification requests. A routing eval runner SHALL assert that each fixture request selects its expected
workflow.

#### Scenario: All five evals route correctly

- **WHEN** the routing eval runner executes the five fixtures
- **THEN** every fixture selects the workflow declared by its eval
- **AND** the runner exits successfully

#### Scenario: A wrong route fails the runner

- **WHEN** a fixture routes to a workflow other than its expected workflow
- **THEN** the runner reports the mismatch and exits non-zero
