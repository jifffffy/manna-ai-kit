# Spec Delta

## ADDED Requirements

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
