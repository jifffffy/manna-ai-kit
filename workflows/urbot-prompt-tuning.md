# Workflow: Urbot Prompt Tuning

**Goal:** change a bot's persona, objective, or behaviour.

## Phase 1 scope

Skeleton only. Inspect and report a prompt plan; do not write.

## Ordered steps

1. Run `urbot-discovery` to read the target profile and current prompts.
2. Inspect `prompts/personas|objectives|behaviours/<botname>.jinja`.
3. State the exact prompt changes and acceptance criteria.
4. Output the target files and verification commands.
5. Stop at `CHECKPOINT: PROMPT PLAN`.

## Output

A prompt plan naming the Jinja resources and source-backed config.

## Do not

- Use obsolete `urbot.persona`/`urbot.objective` names.
- Write files in Phase 1.
