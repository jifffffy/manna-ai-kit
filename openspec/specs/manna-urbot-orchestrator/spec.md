# manna-urbot-orchestrator Specification

## Purpose
Defines Manna as a natural-language development orchestrator that routes user requests to Urbot development
workflows while treating the Urbot repository as the sole source of truth.

## Requirements

### Requirement: Urbot remains the sole source of truth

Manna SHALL treat the Urbot repository at `https://github.com/jifffffy/urbot` as the authoritative system for
application behavior, runtime, configuration, and domain modeling. Manna SHALL only route requests and apply
Urbot development workflows.

#### Scenario: Request is routed without generating an application

- **WHEN** a user asks Manna to add or change a bot capability
- **THEN** Manna selects an Urbot development workflow
- **AND** Manna does not generate a second Spring Boot application

#### Scenario: Second domain model is refused

- **WHEN** a requested change would introduce a domain entity that exists only in Manna
- **THEN** Manna treats the Urbot source tree as canonical
- **AND** Manna does not create a parallel domain model outside Urbot

### Requirement: Authoritative Urbot source inventory

Manna SHALL resolve Urbot behavior from the repository's source, specifically `pom.xml`,
`src/main/java/com/embabel/urbot/`, `src/main/java/com/embabel/bot/<botname>/`,
`application-<profile>.properties`, `src/main/resources/prompts/`, `src/test/`, and Git history.

#### Scenario: Behavior question is answered from source

- **WHEN** Manna needs to determine how Urbot behaves or is configured
- **THEN** Manna inspects the authoritative source paths listed in this requirement
- **AND** Manna does not rely on stale prose when source disagrees

### Requirement: Urbot extension model

Manna SHALL describe and follow the Urbot bot extension model. A bot is added under
`src/main/java/com/embabel/bot/<botname>/` with `<BotName>Configuration`, `<BotName>Tools`,
`<BotName>Agent`, and a `domain/` package, plus resources `application-<botname>.properties` and
`prompts/personas|objectives|behaviours/<botname>.jinja`.

#### Scenario: New bot follows the extension model

- **WHEN** a user requests a new Urbot bot
- **THEN** Manna's plan uses the bot package layout and bot resource layout defined by the extension model
- **AND** the plan does not invent an alternative package or resource convention

### Requirement: Configuration is source-first

Manna SHALL treat `UrbotProperties.java`, `ChatbotOptions.java`, `application.yml`, and the actual
`application-<profile>.properties` as authoritative for configuration property names. The legacy names
`urbot.persona`, `urbot.objective`, `urbot.max-words`, and `urbot.chat-llm.model` SHALL be documented as
obsolete and SHALL NOT be used in new plans.

#### Scenario: Current binding names are used

- **WHEN** Manna writes configuration guidance or a change plan
- **THEN** it uses the source-backed binding names such as `urbot.bot-packages`, `urbot.chat.persona`,
  `urbot.chat.objective`, `urbot.chat.behaviour`, `urbot.chat.max-words`, `urbot.chat.llm.model`, and
  `urbot.chat.llm.temperature`

#### Scenario: Legacy property names are rejected

- **WHEN** a plan or document proposes `urbot.persona`, `urbot.objective`, `urbot.max-words`, or
  `urbot.chat-llm.model`
- **THEN** Manna flags the names as obsolete
- **AND** redirects to the source-backed binding names

### Requirement: Asset disposition inventory

Manna SHALL maintain three explicit inventories: retained assets, rewritten assets, and deprecated assets.
Every current skill, workflow, routing structure, policy, schema family, template, and generator command SHALL
be classified in exactly one inventory.

#### Scenario: Inventory covers current assets

- **WHEN** the repositioning artifacts are reviewed
- **THEN** the retained inventory lists the router architecture, routing pipeline structure, kit validator,
  manifests, plugin metadata, mode policy, tool-safety policy, kit lock, golden routing eval mechanism, and
  document format
- **AND** the rewritten inventory lists the renamed or merged skills and the Urbot-oriented workflows
- **AND** the deprecated inventory lists the project generator, its project schemas, `.manna` project
  artifacts, `designMode`, and `F-001` capability identifiers

#### Scenario: Retained assets keep their contract

- **WHEN** an asset is listed as retained
- **THEN** its structural contract is preserved while its content is re-scoped to Urbot

### Requirement: Deprecations are marked, not removed

This change SHALL mark deprecated assets without moving or deleting them. Deprecated assets SHALL remain in
place and SHALL be identified for later migration into `legacy/`.

#### Scenario: Deprecated asset remains available

- **WHEN** this change is applied
- **THEN** deprecated generator commands, templates, schemas, and `.manna` artifacts still exist
- **AND** no asset is moved into `legacy/` by this change

### Requirement: Minimal CLI surface

Manna SHALL define a minimal CLI surface for the repositioning:
`manna urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir>` and
`manna urbot inspect --repo https://github.com/jifffffy/urbot --ref <ref> --project <dir> --request "<nl>"`.
Additional workflow commands SHALL be introduced only in later changes.

#### Scenario: Minimal commands are specified

- **WHEN** the CLI scope is reviewed
- **THEN** `manna urbot init` and `manna urbot inspect` are documented with their required arguments
- **AND** no later workflow command is presented as part of this change

#### Scenario: Out-of-scope CLI behavior is deferred

- **WHEN** a request asks for remote fetching or a real modification workflow during this change
- **THEN** the request is deferred to a later change rather than implemented here

### Requirement: Documentation reflects the orchestrator positioning

`AGENTS.md` and `README.md` SHALL describe Manna as an Urbot orchestrator and SHALL NOT describe a second
runtime or a second domain model.

#### Scenario: Positioning is discoverable in both entry documents

- **WHEN** a contributor reads either `AGENTS.md` or `README.md`
- **THEN** the document states that Urbot decides how to develop and Manna decides which development flow to use
- **AND** the document points to the authoritative Urbot repository and source inventory

### Requirement: Build, run, and test guidance lives in Manna

Manna SHALL document the Urbot build, run, and test steps in the `urbot-verification` skill and workflow, so a
workspace does not depend on the Urbot repository's prose for everyday development commands. The guidance SHALL
cover:

- compile and unit-test commands, including a single-test form;
- the integration-test boundary and its exclusions;
- local startup prerequisites (Neo4j and model credentials);
- profile activation through environment variables and the profile-scoped run command;
- prompt-rendering verification after prompt changes.

The router SHALL route build, run, and test requests to the verification workflow.

#### Scenario: Build and test commands are reported

- **WHEN** a user asks to compile, build, or test a Urbot project
- **THEN** the verification skill reports the compile and test commands
- **AND** it reports the single-test form
- **AND** it states that integration tests are excluded by default

#### Scenario: Local run steps are complete

- **WHEN** a user asks to run the Urbot application
- **THEN** the verification skill lists the Neo4j prerequisite
- **AND** it lists the model-credential activation
- **AND** it gives the profile-scoped startup command

#### Scenario: Build and run requests are routed

- **WHEN** a request asks to build, run, start, or test Urbot
- **THEN** the router selects `urbot-verification`
- **AND** does not return an ambiguity question for those intents
