# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: One-step init reports an unambiguous route

**Reason**: `init` now takes a project directory and does not accept or route a request.

**Migration**: Use `manna urbot inspect --project <dir> --request "<nl>"` for a read-only route, or open the
project in OpenCode and let the routed skill/workflow handle the request.
