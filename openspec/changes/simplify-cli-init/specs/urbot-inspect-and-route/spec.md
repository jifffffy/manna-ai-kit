# Spec Delta

## ADDED Requirements

### Requirement: One-step init command

Manna SHALL provide `init "<request>"` as the primary first-run command through the existing `manna` binary.
The command SHALL use `https://github.com/jifffffy/urbot` by default, SHALL resolve
an omitted ref to the latest semver tag or `main`, and SHALL default the checkout directory to `./urbot`. It
SHALL reuse a valid existing Urbot checkout and clone only when the checkout is missing. After the checkout is
available, it SHALL run the read-only discovery and router and print the source record and selected workflow.

#### Scenario: No flags uses the fixed defaults

- **WHEN** a user runs `manna init "design the travel domain"`
- **THEN** the command targets `https://github.com/jifffffy/urbot`
- **AND** resolves the ref and checkout directory from their defaults
- **AND** prints the source record and the selected workflow

#### Scenario: Existing checkout is reused

- **WHEN** `./urbot` already contains a valid Urbot checkout and the user runs `init "<request>"`
- **THEN** the command reuses that checkout
- **AND** does not clone again
- **AND** still runs discovery and routing for the request

#### Scenario: Missing checkout is initialized

- **WHEN** the default checkout directory is missing
- **THEN** the command clones the fixed repository at the resolved ref
- **AND** records and prints the resolved commit

#### Scenario: Advanced overrides remain optional

- **WHEN** the user supplies `--repo`, `--ref`, `--dir`, or `--write-state`
- **THEN** the command honors the override
- **AND** the overrides are not required for the common command

### Requirement: One-step init is read-only after checkout

The one-step `init` SHALL NOT modify the Urbot source, its configuration, or its Git history. It SHALL NOT
automatically execute the routed workflow; it only inspects and routes.

#### Scenario: Init does not change Urbot source

- **WHEN** `init "<request>"` completes against an existing checkout
- **THEN** the Urbot source and Git state are unchanged
- **AND** no workflow has written files

#### Scenario: Init does not auto-apply

- **WHEN** the request routes to a write workflow
- **THEN** the command reports the route and target files
- **AND** stops without applying the workflow

### Requirement: One-step init reports an unambiguous route

The one-step `init` SHALL reuse the existing router behavior: one known intent selects one workflow, and an
ambiguous or multi-intent request returns exactly one precise question instead of a guessed route. A request
phrased as "design/model the domain" SHALL select `urbot-domain-design`.

#### Scenario: Known request routes to one workflow

- **WHEN** the request clearly matches one known intent
- **THEN** the output names one workflow, its skills, target files, and verification commands

#### Scenario: Domain-design phrasing is recognized

- **WHEN** the user runs `manna init "design the travel domain"`
- **THEN** the output selects `urbot-domain-design`
- **AND** does not fall through to the memory route

#### Scenario: Ambiguous request asks one question

- **WHEN** the request does not clearly match one intent
- **THEN** the output contains one precise question
- **AND** it does not select a workflow by guessing
