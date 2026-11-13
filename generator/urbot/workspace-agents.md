# AGENTS.md — Manna Workspace

This directory is a self-contained Manna AI Kit workspace. The local kit and the Urbot checkout live together
so an OpenCode session can use the local skills and workflows directly.

## Layout

- Local kit: `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`
- OpenCode discovery: `.opencode/commands/` and `.opencode/skills/`
- Urbot checkout: {{URBOT_PROJECT}}
- OpenSpec root: `openspec/` (`config.yaml` and `specs/`)

## Start here

1. Read `skills/urbot-router/SKILL.md`.
2. Use the local workflow documents in `workflows/` for the selected flow.
3. Use the local skill references and scripts under `skills/`.
4. Run the global `manna` command, or `node generator/manna.mjs` in this workspace.
5. Use the `opsx` commands from `.opencode/commands/` for OpenSpec changes.

## Source of truth

All Urbot source paths in the local kit instructions are relative to `{{URBOT_PROJECT}}`. Resolve behavior from
`{{URBOT_PROJECT}}/pom.xml`, `{{URBOT_PROJECT}}/src/main/java/com/embabel/urbot/`,
`{{URBOT_PROJECT}}/src/main/java/com/embabel/bot/<botname>/`, the application properties, prompts, tests, and
Git history. Source wins over prose.

## Do not

- Create a second Spring Boot application, runtime, or domain model.
- Edit the copied kit for product changes; change the Urbot checkout instead.
- Commit the nested `urbot/` checkout into the workspace repository.
- Add a UI or admin surface; review changes in Git.
