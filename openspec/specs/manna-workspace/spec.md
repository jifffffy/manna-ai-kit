# manna-workspace Specification

## Purpose
Defines a self-contained Manna workspace that contains a local copy of the orchestration layer, skills, and
OpenCode commands alongside the Urbot checkout, so opening the workspace in OpenCode is enough to use Manna.

## Requirements

### Requirement: Workspace layout

`manna init <project>` SHALL create or reuse the project directory as the workspace, and that directory SHALL be
the Urbot checkout itself. There SHALL be no nested `urbot/` directory inside the project. The workspace SHALL
contain the Urbot checkout (`pom.xml`, `src/main/java/com/embabel/urbot/`) plus:

- a single Manna-owned `AGENTS.md`;
- `.opencode/skills/` with the Manna skills;
- `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`;
- `skills.json`, `.well-known/`, `.claude-plugin/`;
- local ignore entries for `.manna-run/` recorded outside tracked files.

The workspace SHALL NOT copy kit-maintenance assets: `scripts/dev/`, `evals/`, `package.json`, `skills.lock`,
or `openspec/`. It SHALL NOT contain an OpenSpec root, `.opencode/commands/`, or OpenSpec skills.

#### Scenario: New workspace contains the kit and Urbot

- **WHEN** a user runs `manna init demo`
- **THEN** `./demo` is the Urbot checkout and contains the local kit directories
- **AND** there is no nested `./demo/urbot`
- **AND** it does not contain the kit's maintenance tests or change history

#### Scenario: Existing workspace is reused

- **WHEN** the project directory is already a workspace
- **THEN** `manna init demo` reuses it
- **AND** replaces existing kit-owned files
- **AND** leaves files outside the copy set untouched

### Requirement: OpenCode discovery

The workspace SHALL provide the Manna skills to OpenCode's skill loader under
`.opencode/skills/<skill-id>/SKILL.md`, in addition to the canonical `skills/` copy. It SHALL NOT copy the
OpenSpec commands or OpenSpec skills from the kit.

#### Scenario: OpenCode sees the local tools

- **WHEN** the workspace is opened in OpenCode
- **THEN** the Manna skills are discoverable under `.opencode/skills/`
- **AND** the canonical skill documentation remains under `skills/`
- **AND** no `.opencode/commands/` or OpenSpec skill directory is present

#### Scenario: No OpenSpec root is copied

- **WHEN** `manna init demo` completes
- **THEN** `openspec/` does not exist in the workspace
- **AND** the workspace guidance points at the Manna workflows instead

### Requirement: Workspace is tooling, not a second application

The workspace SHALL remain a Manna tooling layer on top of the Urbot checkout. The project directory SHALL be
the only runtime and domain authority. The workspace SHALL NOT create a second Spring Boot application, a second
domain model, or a second persistence layer.

#### Scenario: No second runtime

- **WHEN** the workspace is created
- **THEN** the only Spring Boot application is the Urbot checkout at the project root
- **AND** the local kit is documentation, commands, and scripts only

#### Scenario: Urbot source is untouched by init

- **WHEN** `manna init demo` completes
- **THEN** the Urbot source and configuration are unchanged
- **AND** the only writes are the untracked kit copy, `AGENTS.md`, local ignore entries, and optional run state

### Requirement: Package ships the copy inputs

The kit package SHALL include `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`, the
manifests, and the workspace `AGENTS.md` template so an installed `manna` command can create the workspace
without the kit source checkout.

#### Scenario: Installed CLI can copy

- **WHEN** `manna` runs from an installed package rather than the kit repository
- **THEN** the workspace copy finds the skills, workflows, policies, generator, and AGENTS template

#### Scenario: Verification checks the workspace

- **WHEN** the workspace test runs
- **THEN** it asserts the copy set, the generated AGENTS paths, the `.opencode/skills` copies, and the
  absence of kit-maintenance assets and OpenSpec files

### Requirement: Kit copy overwrites managed files

`manna init <project>` SHALL copy the installed kit into the project root and SHALL overwrite an existing file
when its path is part of the kit copy set, including `AGENTS.md`. Files outside the copy set SHALL be preserved.
Re-running the command SHALL always produce the same kit snapshot and SHALL NOT duplicate or append to copied
files.

#### Scenario: Existing kit files are replaced

- **WHEN** a kit file already exists in the project directory
- **THEN** `manna init` overwrites it with the installed kit version
- **AND** the resulting content matches the kit source

#### Scenario: User files outside the copy set are kept

- **WHEN** the project directory contains files that are not part of the kit copy set
- **THEN** those files are left unchanged
- **AND** they are not deleted

#### Scenario: Re-running is idempotent

- **WHEN** `manna init demo` runs twice
- **THEN** the second run does not fail
- **AND** every kit file matches the installed kit source
- **AND** no file is duplicated

### Requirement: Project directory is the workspace

`manna init` SHALL require a project argument and SHALL resolve it to the target directory. When the target is
missing or empty, the command SHALL clone the fixed Urbot repository into it and record the resolved commit.
When the target is an existing Urbot checkout, it SHALL reuse it. When the target exists, is non-empty, and is
not a Urbot checkout, it SHALL fail before writing.

If the resolved target is the Manna kit root, the command SHALL fail without copying the kit into itself.

#### Scenario: Project name creates the directory

- **WHEN** a user runs `manna init demo` in an empty parent directory
- **THEN** `./demo` is created
- **AND** it contains a Urbot checkout and the local kit

#### Scenario: Missing project name is rejected

- **WHEN** a user runs `manna init` with no project
- **THEN** the command fails with a usage message
- **AND** nothing is created

#### Scenario: Non-Urbot directory is rejected

- **WHEN** `./demo` exists, is non-empty, and is not a Urbot checkout
- **THEN** the command fails before copying or cloning
- **AND** `./demo` is left unchanged

#### Scenario: Kit root is rejected

- **WHEN** the resolved project directory is the Manna kit root
- **THEN** the command fails before copying
- **AND** it does not overwrite the kit's `AGENTS.md`

### Requirement: AGENTS.md is replaced and owned by Manna

`manna init` SHALL delete the cloned Urbot `AGENTS.md` and write the Manna workspace `AGENTS.md` in its place.
The written file SHALL contain the operational content the project needs to build, run, test, and extend
Urbot, including:

- the build, run, and test commands and their prerequisites;
- the local startup requirements (Neo4j, model credentials, profile activation);
- the extension model for bots, tools, and domain types;
- the RAG and memory scoping rules;
- the repository gotchas that prevent regressions.

The command SHALL NOT keep a second instruction file such as `MANNA.md`, and SHALL NOT rely on an
`opencode.json` `instructions` entry. `entry` in the output SHALL be `AGENTS.md`.

#### Scenario: Existing Urbot AGENTS.md is replaced

- **WHEN** the cloned Urbot checkout contains `AGENTS.md`
- **THEN** that file is replaced by the Manna-owned file
- **AND** exactly one `AGENTS.md` remains
- **AND** no `MANNA.md` is created

#### Scenario: Essential Urbot operations are present

- **WHEN** the Manna-owned `AGENTS.md` is read
- **THEN** it contains the compile, test, and run commands
- **AND** it contains the Neo4j and credential prerequisites
- **AND** it contains the extension model and the RAG/memory scoping rules
- **AND** it contains the repository gotchas that init must not lose

#### Scenario: Missing AGENTS.md is created

- **WHEN** the project directory has no `AGENTS.md`
- **THEN** the command creates the Manna-owned `AGENTS.md`
- **AND** the output reports `AGENTS.md` as `entry`

### Requirement: Run state stays out of tracked files

`manna init` SHALL NOT modify tracked files other than `AGENTS.md`. When the project is a Git repository, it
SHALL record `.manna-run/` in `.git/info/exclude` so run state does not appear in `git status`. When the project
is not a Git repository, it SHALL create a `.gitignore` containing the local entries.

#### Scenario: Existing .gitignore is untouched

- **WHEN** `manna init demo` runs against a cloned checkout with a `.gitignore`
- **THEN** the file content is unchanged
- **AND** `.manna-run/` is listed in `.git/info/exclude`
- **AND** `git status` shows no modification to `.gitignore`

#### Scenario: Non-git target gets a .gitignore

- **WHEN** the project directory is not a Git repository
- **THEN** the command creates a `.gitignore` with the local entries
- **AND** the kit copy still completes

### Requirement: Init ends with an OpenCode handoff

`manna init <project>` SHALL finish after cloning or reusing the checkout and copying the kit. Its output SHALL
include `workspace`, `kit`, `source`, `entry`, and `next`. The `next` value SHALL tell the user to open the
project in OpenCode to start work. The output SHALL NOT include an inspection result, a selected workflow, or a
route.

#### Scenario: Output stops before routing

- **WHEN** `manna init demo` completes successfully
- **THEN** the output describes the workspace, copied kit, source record, entry point, and next step
- **AND** it contains no inspected request, selected workflow, or applied change

#### Scenario: Work starts in OpenCode

- **WHEN** the user opens `./demo` in OpenCode
- **THEN** the Manna-owned `AGENTS.md` is loaded
- **AND** the local skills, workflows, and Urbot sources are available
- **AND** the first real task is handled by the OpenCode session, not by `manna init`
