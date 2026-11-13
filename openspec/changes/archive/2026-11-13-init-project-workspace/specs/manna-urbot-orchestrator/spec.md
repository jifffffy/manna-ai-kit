# Spec Delta

## ADDED Requirements

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
