# Workflow: Urbot Profile Change

**Goal:** add or modify a Urbot bot profile safely.

## Phase 1 scope

Skeleton only. Inspect and report a profile plan; do not write.

## Ordered steps

1. Run `urbot-discovery` to read the current profiles and target profile.
2. Inspect `application-<botname>.properties` and the bot package.
3. Identify the profile fields and prompt resources that would change.
4. Output the target files and verification commands.
5. Stop at `CHECKPOINT: PROFILE PLAN`.

## Output

A profile change plan with the source-backed `urbot.chat.*` bindings.

## Do not

- Use obsolete `urbot.persona`/`urbot.objective` names.
- Write files in Phase 1.
