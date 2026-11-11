# urbot-profile-change Specification

## Purpose
Defines the first write workflow: creating or updating a Urbot bot profile with the correct configuration,
prompt resources, and profile activation contract, then verifying it with Urbot's own build and tests.

## Requirements

### Requirement: Profile creation writes the expected Urbot artifacts

`urbot-profile` SHALL create a bot profile by writing exactly these product artifacts for a bot named `<bot>`:

- `src/main/java/com/embabel/bot/<bot>/<BotName>Configuration.java`
- `src/main/resources/application-<bot>.properties`
- `src/main/resources/prompts/personas/<bot>.jinja`
- `src/main/resources/prompts/objectives/<bot>.jinja`

It MAY write `src/main/resources/prompts/behaviours/<bot>.jinja` when a custom behaviour is requested;
otherwise it SHALL reference the existing `default` behaviour.

#### Scenario: New profile creates four files

- **WHEN** a user creates a new bot profile with a persona and objective
- **THEN** the configuration class, profile properties, persona, and objective files are created
- **AND** no Agent, Tool, domain, or memory file is created

#### Scenario: Custom behaviour is optional

- **WHEN** the request does not ask for a custom behaviour
- **THEN** `urbot.chat.behaviour=default` is used
- **AND** no behaviour template is created for the bot

### Requirement: Profile changes are safe and idempotent

The profile workflow SHALL plan the target files before writing. It SHALL NOT overwrite an existing file
without explicit force, and re-applying the same profile SHALL be a no-op rather than a destructive rewrite.

#### Scenario: Existing profile requires force

- **WHEN** a target profile file already exists and force is not set
- **THEN** the workflow reports the existing file and does not overwrite it

#### Scenario: Re-applying is a no-op

- **WHEN** the same profile is applied twice without force
- **THEN** the second run makes no file changes
- **AND** reports the already-present profile

### Requirement: Profile activation follows the Urbot @Profile contract

A generated bot configuration class SHALL be annotated with `@Configuration` and `@Profile("<bot>")`. The
profile SHALL set `urbot.bot-packages=com.embabel.bot.<bot>` in `application-<bot>.properties`, so the package
is scanned only when the profile is active. `@Profile` SHALL be treated as defense-in-depth, not the only
activation mechanism.

#### Scenario: Config class is profile-gated

- **WHEN** a profile is generated
- **THEN** its configuration class carries `@Profile("<bot>")`
- **AND** the class is not loaded when the profile is inactive

#### Scenario: Package scanning is profile-scoped

- **WHEN** the profile is active
- **THEN** `urbot.bot-packages=com.embabel.bot.<bot>` is present in `application-<bot>.properties`
- **AND** the properties file is not required to activate the profile by itself

#### Scenario: Parent-package scanning is isolated

- **WHEN** `urbot.bot-packages=com.embabel.bot` scans the parent package
- **THEN** each bot configuration class remains isolated by its `@Profile("<bot>")`

### Requirement: Configuration uses source-backed property names

The generated profile SHALL use `urbot.bot-packages` and the current `urbot.chat.*` bindings:
`urbot.chat.persona`, `urbot.chat.objective`, `urbot.chat.behaviour`, `urbot.chat.max-words`,
`urbot.chat.llm.model`, and `urbot.chat.llm.temperature`. It SHALL NOT use the obsolete
`urbot.persona`, `urbot.objective`, `urbot.max-words`, or `urbot.chat-llm.model` names.

#### Scenario: Current bindings are written

- **WHEN** a profile properties file is generated
- **THEN** it uses the `urbot.chat.*` bindings and `urbot.bot-packages`

#### Scenario: Legacy names are rejected

- **WHEN** a profile plan or generated file would use a legacy property name
- **THEN** the workflow rejects it and rewrites the plan with the current binding

### Requirement: The profile-change workflow runs in order with approval

`urbot-profile-change` SHALL run `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`. It
SHALL stop at `CHECKPOINT: PROFILE` before writing any file, and it SHALL run verification after the approved
write.

#### Scenario: Write follows discovery and approval

- **WHEN** a profile change is requested
- **THEN** discovery reads the project before any write
- **AND** the profile plan is shown at `CHECKPOINT: PROFILE`
- **AND** files are written only after approval

#### Scenario: Verification follows the write

- **WHEN** the approved profile is written
- **THEN** `urbot-verification` runs the Urbot compile and test commands
- **AND** reports the result

### Requirement: Travel example is reproducible

The workflow SHALL support the input
"创建一个名为 travel 的旅行助手，人格专业友好，目标是帮助用户规划行程" and produce exactly these four product
files:

- `src/main/java/com/embabel/bot/travel/TravelConfiguration.java`
- `src/main/resources/application-travel.properties`
- `src/main/resources/prompts/personas/travel.jinja`
- `src/main/resources/prompts/objectives/travel.jinja`

#### Scenario: Travel profile is generated

- **WHEN** the travel request is routed to `urbot-profile-change`
- **THEN** the four travel files are created with a professional, friendly persona and a trip-planning
  objective
- **AND** `TravelConfiguration` is annotated with `@Profile("travel")`

#### Scenario: Travel profile activates

- **WHEN** the travel profile is activated in a Spring context
- **THEN** `TravelConfiguration` is loaded
- **AND** the configuration class is absent when the profile is inactive

### Requirement: Verification uses Urbot's own commands

The workflow SHALL verify a profile change with `./mvnw -DskipTests compile` and `./mvnw test` in the target
Urbot checkout. It SHALL also run a profile-activation check that proves the generated configuration loads
with the profile and not without it.

#### Scenario: Compile and tests pass

- **WHEN** the generated travel profile is applied to a Urbot checkout
- **THEN** `./mvnw -DskipTests compile` exits successfully
- **AND** `./mvnw test` exits successfully

#### Scenario: Activation check distinguishes profile states

- **WHEN** the activation check runs with the travel profile
- **THEN** the configuration bean is present
- **AND** when the profile is absent, the bean is not present

### Requirement: The change stays inside the profile boundary

The workflow SHALL only touch bot profile files under `src/main/java/com/embabel/bot/<bot>/` and
`src/main/resources/`. It SHALL NOT modify Urbot framework code, create a second Spring Boot application, or
copy the Urbot domain model. It SHALL NOT implement Tool, Domain, or Memory changes.

#### Scenario: Framework files are untouched

- **WHEN** a profile is applied
- **THEN** files under `src/main/java/com/embabel/urbot/` are unchanged
- **AND** no Tool, domain, or memory artifact is created

#### Scenario: Non-profile request is out of scope

- **WHEN** the request asks for a tool, domain entity, or memory change
- **THEN** the workflow does not handle it as a profile change

### Requirement: The Manna kit verifies the workflow

The Manna kit SHALL include a deterministic profile-change test in `npm test` and a real-checkout mode that
runs the Urbot compile, test, and activation checks. The change SHALL pass `npm test` and
`openspec validate implement-urbot-profile-change --strict`.

#### Scenario: Deterministic test covers the contract

- **WHEN** `npm test` runs
- **THEN** the travel profile is created in a temporary fixture
- **AND** the four files, `@Profile`, bot-packages, current bindings, and absence of legacy names are asserted

#### Scenario: Real-checkout mode runs Urbot verification

- **WHEN** the profile test is given a real Urbot checkout
- **THEN** it copies the checkout, applies the travel profile, and runs the Urbot compile, test, and
  activation checks
- **AND** it does not modify the original checkout
