# manna-workspace Specification

## Purpose
Defines a self-contained Manna workspace that contains a local copy of the orchestration layer, skills, and
OpenCode commands alongside the Urbot checkout, so opening the workspace in OpenCode is enough to use Manna.

## Requirements

### Requirement: Workspace layout

`manna init` SHALL create or reuse a workspace whose root contains the local Manna kit and whose `urbot/`
directory contains the Urbot checkout. The workspace SHALL contain:

- a generated `AGENTS.md`;
- `.opencode/` with commands and skills;
- `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`;
- `skills.json`, `.well-known/`, `.claude-plugin/`;
- `openspec/config.yaml` and `openspec/specs/`;
- a `.gitignore` that ignores `.manna-run/` and the nested `urbot/` checkout.

The workspace SHALL NOT copy kit-maintenance assets: `scripts/dev/`, `evals/`, `package.json`, `skills.lock`,
or `openspec/changes/`.

#### Scenario: New workspace contains the kit and Urbot

- **WHEN** a user runs `manna init "create an Impromptu bot"`
- **THEN** the default workspace is the current working directory
- **AND** it contains the local kit directories and `./urbot`
- **AND** it does not contain the kit's maintenance tests or change history

#### Scenario: Existing workspace is reused

- **WHEN** the workspace already exists
- **THEN** `manna init` reuses it
- **AND** copies only missing files
- **AND** preserves user-modified files unless `--force` is supplied

### Requirement: Workspace AGENTS.md is the OpenCode entry point

The generated workspace `AGENTS.md` SHALL state that:

- the local Manna kit is at the workspace root;
- the Urbot checkout is `./urbot` and all Urbot source paths are relative to it;
- the reader starts with `skills/urbot-router/SKILL.md` and the local workflows;
- the CLI is the global `manna` command or `node generator/manna.mjs` in the workspace;
- the OpenSpec root is `./openspec`.

#### Scenario: Paths are unambiguous

- **WHEN** a user opens the workspace in OpenCode
- **THEN** `AGENTS.md` points at the local skills/workflows and `./urbot`
- **AND** it does not leave Urbot source paths ambiguous between the workspace root and the checkout

#### Scenario: No kit-maintenance confusion

- **WHEN** the workspace `AGENTS.md` is read
- **THEN** it identifies the copy as a consumer workspace
- **AND** it does not instruct the reader to run the kit's maintenance tests

### Requirement: OpenCode discovery

The workspace SHALL provide the OpenCode commands from `.opencode/commands/` and skills from
`.opencode/skills/`. The Manna skills SHALL also be available to OpenCode's skill loader under
`.opencode/skills/<skill-id>/SKILL.md`, in addition to the canonical `skills/` copy.

#### Scenario: OpenCode sees the local tools

- **WHEN** the workspace is opened in OpenCode
- **THEN** the `opsx` commands are available from `.opencode/commands/`
- **AND** the Manna skills are discoverable under `.opencode/skills/`
- **AND** the canonical skill documentation remains under `skills/`

#### Scenario: OpenSpec root is present

- **WHEN** an `opsx` command runs in the workspace
- **THEN** `openspec/config.yaml` and `openspec/specs/` exist at the workspace root
- **AND** the kit's archived changes are not copied

### Requirement: Copy and refresh are safe and idempotent

The workspace copy SHALL be sourced from the installed kit root, not from the current working directory. It
SHALL copy missing files, skip existing files by default, and refresh the copied kit and generated `AGENTS.md`
only when `--force` is supplied. It SHALL NOT delete user files that are not part of the copy set.

#### Scenario: Re-running is safe

- **WHEN** `manna init` runs twice against the same workspace
- **THEN** the second run does not fail or duplicate files

#### Scenario: Force refreshes the kit snapshot

- **WHEN** the user runs `manna init ... --force`
- **THEN** the copied kit files and workspace `AGENTS.md` are refreshed from the installed kit
- **AND** files outside the copy set are left alone

### Requirement: Workspace is tooling, not a second application

The workspace SHALL remain a Manna tooling layer. The Urbot checkout at `./urbot` SHALL remain the only
runtime and domain authority. The workspace SHALL NOT create a second Spring Boot application, a second
domain model, or a second persistence layer.

#### Scenario: No second runtime

- **WHEN** the workspace is created
- **THEN** it contains no generated Spring Boot application beside `./urbot`
- **AND** the local kit is documentation, commands, and scripts only

#### Scenario: Urbot source is untouched by init

- **WHEN** `manna init` completes
- **THEN** the Urbot checkout's source and Git state are unchanged
- **AND** the only writes are the workspace kit copy and optional run state

### Requirement: Package ships the copy inputs

The kit package SHALL include `.opencode/`, `openspec/config.yaml`, `openspec/specs/`, and the workspace
`AGENTS.md` template so an installed `manna` command can create the workspace without the kit source checkout.

#### Scenario: Installed CLI can copy

- **WHEN** `manna` runs from an installed package rather than the kit repository
- **THEN** the workspace copy finds the OpenCode commands, OpenSpec root, and AGENTS template

#### Scenario: Verification checks the workspace

- **WHEN** the workspace test runs
- **THEN** it asserts the copy set, the generated AGENTS paths, the `.opencode` skills, the OpenSpec root, and
  the absence of kit-maintenance assets

### Requirement: In-place workspace copy

`manna init` SHALL use the current working directory as the default workspace root. It SHALL NOT create a
`./manna-workspace` subdirectory by default. The Urbot checkout SHALL default to `./urbot` inside the current
directory. `--workspace <dir>` SHALL remain an optional override.

When an existing `.gitignore` is present, the command SHALL append the missing `.manna-run/` and checkout
ignore entries and SHALL preserve existing lines. If the current directory is the Manna kit root, the command
SHALL fail without copying the kit into itself.

#### Scenario: Default copies in place

- **WHEN** a user runs `manna init "design the travel domain"` from a project directory
- **THEN** the workspace is that directory
- **AND** the Urbot checkout is `./urbot`
- **AND** no `./manna-workspace` directory is created

#### Scenario: Existing .gitignore is extended

- **WHEN** the current directory already has a `.gitignore`
- **THEN** missing `.manna-run/` and `urbot/` entries are appended
- **AND** existing ignore lines are preserved

#### Scenario: Kit root is rejected

- **WHEN** `manna init` runs from the Manna kit root
- **THEN** the command fails before copying
- **AND** it does not overwrite the kit's `AGENTS.md`

#### Scenario: Workspace override remains optional

- **WHEN** the user supplies `--workspace <dir>`
- **THEN** the workspace root is that directory
- **AND** the default in-place behavior is not required
