# Workflow: Urbot Verification

**Goal:** prove a Urbot project state without editing source.

## Phase 1 scope

Read-only. Report Git state and the verification commands. Running builds is opt-in.

## Ordered steps

1. Run `urbot-discovery` to read the commit and project state.
2. Report `./mvnw -q -DskipTests compile` and `./mvnw -q test`.
3. State that integration tests need the environment's Neo4j/LLM and are excluded by default.
4. Report any observed failures; never claim a check passed without running it.
5. Stop at `CHECKPOINT: VERIFICATION REPORT`.

## Output

A verification report with observed state, commands, and open items.

## Do not

- Modify source or Git state.
- Run a rerun-until-green loop and call it passing.
- Hide a skipped check.
