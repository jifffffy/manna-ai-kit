# Workflow: Urbot Bootstrap

**Goal:** start a new Urbot project or bot from an inspected, pinned source state.

## Phase 1 scope

Read-only. Inspect the target directory and source, report the bootstrap plan, and stop. Do not clone or write
during inspect.

## Ordered steps

1. Confirm the target directory. A missing directory routes here.
2. Read `Source` and, if present, `Commit`; a missing checkout has no commit yet.
3. Identify the bot name and target profile from the request.
4. Report the bot package layout:
   `src/main/java/com/embabel/bot/<botname>/` with Configuration, Tools, Agent, and `domain/`.
5. Report the resources: `application-<botname>.properties` and
   `prompts/{personas,objectives,behaviours}/<botname>.jinja`.
6. Output the verification commands.
7. Stop at `CHECKPOINT: BOOTSTRAP PLAN`.

## Output

A bootstrap plan naming the target profile, files, and verification commands.

## Do not

- Create a second Spring Boot application or a second domain model.
- Write files in Phase 1.
- Use the GitHub Template API.
