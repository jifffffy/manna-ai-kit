# Spec Delta

## MODIFIED Requirements

### Requirement: One-step init command

Manna SHALL provide `init "<request>"` as the primary first-run command through the existing `manna` binary.
The command SHALL create or reuse a self-contained workspace (default `./manna-workspace`) containing a local
copy of the Manna orchestration layer and skills. The Urbot checkout SHALL default to `<workspace>/urbot`,
using `https://github.com/jifffffy/urbot` and the latest semver tag or `main` when the ref is omitted. The
command SHALL reuse a valid existing checkout and clone only when it is missing, then run the read-only
discovery and router. It SHALL print the workspace, copied kit, source record, and selected workflow.

#### Scenario: No flags uses the fixed defaults

- **WHEN** a user runs `manna init "design the travel domain"`
- **THEN** the workspace is `./manna-workspace`
- **AND** it contains the local kit and `./manna-workspace/urbot`
- **AND** the output includes `workspace`, `kit`, `source`, and `inspection`

#### Scenario: Existing checkout is reused

- **WHEN** the workspace and its `urbot/` checkout already exist
- **THEN** the command reuses both
- **AND** does not clone again
- **AND** still runs discovery and routing for the request

#### Scenario: Missing checkout is initialized

- **WHEN** the workspace exists but its Urbot checkout is missing
- **THEN** the command clones the fixed repository at the resolved ref into `<workspace>/urbot`
- **AND** records and prints the resolved commit

#### Scenario: Advanced overrides remain optional

- **WHEN** the user supplies `--workspace`, `--dir`, `--repo`, `--ref`, `--write-state`, or `--force`
- **THEN** the command honors the override
- **AND** none of these are required for the common command
