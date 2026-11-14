# urbot-inspect-and-route Specification

## Purpose
Defines the read-only Phase 1 entry point that fetches a pinned Urbot checkout, records the resolved commit,
inspects the project, and routes a natural-language request to the correct Urbot development workflow.

## Requirements

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

### Requirement: One-step init command

Manna SHALL provide `init <project>` as the primary first-run command through the existing `manna` binary. The
project argument SHALL be required and SHALL name the directory that becomes the workspace. The command SHALL
clone `https://github.com/jifffffy/urbot` into that directory using the latest semver tag or `main` when the ref
is omitted, unless the directory already contains a valid Urbot checkout, in which case it SHALL reuse it. It
SHALL then copy the local Manna kit into the project root, overwriting existing kit-owned files, so the
workspace root is the Urbot checkout, and SHALL replace the project `AGENTS.md` with the Manna-owned file. It
SHALL print the workspace, copied kit, source record, entry-point file, and a next step to open the workspace
in OpenCode. It SHALL NOT run discovery, select a workflow, or print an inspection result.

#### Scenario: No flags uses the fixed defaults

- **WHEN** a user runs `manna init demo`
- **THEN** `./demo` is created as the Urbot checkout
- **AND** `./demo` contains the local kit files
- **AND** the output includes `workspace`, `kit`, `source`, `entry`, and `next`
- **AND** `entry` is `AGENTS.md`
- **AND** the output does not include `inspection`

#### Scenario: Missing project name is rejected

- **WHEN** a user runs `manna init` without a project name
- **THEN** the command fails with a usage message
- **AND** no directory, kit copy, or checkout is created

#### Scenario: Existing checkout is reused

- **WHEN** the project directory is already a valid Urbot checkout
- **THEN** the command reuses it
- **AND** does not clone again
- **AND** replaces existing kit files with the installed kit version

#### Scenario: Non-Urbot directory is rejected

- **WHEN** the project directory exists, is non-empty, and is not a Urbot checkout
- **THEN** the command fails before writing
- **AND** the existing directory is left unchanged

#### Scenario: Missing checkout is initialized

- **WHEN** the project directory exists and is empty
- **THEN** the command clones the fixed repository into it
- **AND** records and prints the resolved commit

#### Scenario: Advanced overrides remain optional

- **WHEN** the user supplies `--repo`, `--ref`, or `--write-state`
- **THEN** the command honors the override
- **AND** none of these are required for the common command

### Requirement: One-step init is read-only after checkout

The one-step `init` SHALL NOT modify the Urbot source, application configuration, or Git history. The only
tracked file it may change is the project `AGENTS.md`, which it replaces with the Manna-owned file. It SHALL NOT
execute or apply any workflow; it only clones or reuses the checkout, adds untracked kit files, replaces
`AGENTS.md`, and records local ignore entries.

#### Scenario: Init does not change Urbot source

- **WHEN** `manna init demo` completes against an existing checkout
- **THEN** the Urbot source, configuration, and Git history are unchanged
- **AND** no file other than `AGENTS.md` is modified
- **AND** no workflow has written files

#### Scenario: Init does not auto-apply

- **WHEN** `manna init demo` completes
- **THEN** the command reports the workspace, copied kit, source record, entry point, and next step
- **AND** no workflow is selected, started, or applied

### Requirement: Inspect reports an unambiguous route

The explicit `manna urbot inspect` command SHALL reuse the existing router behavior: one known intent selects
one workflow, and an ambiguous or multi-intent request returns exactly one precise question instead of a guessed
route. A request phrased as "design/model the domain" SHALL select `urbot-domain-design`.

#### Scenario: Known request routes to one workflow

- **WHEN** the request clearly matches one known intent
- **THEN** the output names one workflow, its skills, target files, and verification commands

#### Scenario: Domain-design phrasing is recognized

- **WHEN** the user runs `manna urbot inspect --project <dir> --request "design the travel domain"`
- **THEN** the output selects `urbot-domain-design`
- **AND** does not fall through to the memory route

#### Scenario: Ambiguous request asks one question

- **WHEN** the request does not clearly match one intent
- **THEN** the output contains one precise question
- **AND** it does not select a workflow by guessing

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
