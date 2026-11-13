# Workflow: Urbot Verification

**Goal:** prove a Urbot project state without editing source, and report how to build, run, and test it.

## Phase 1 scope

Read-only. Report Git state and the commands for the requested scope. Running builds or starting the app is
opt-in.

## Ordered steps

1. Run `urbot-discovery` to read the commit and project state.
2. For a build or test request, report `./mvnw -q -DskipTests compile` and `./mvnw -q test`; include
   `./mvnw -Dtest=<ClassName>Test test` for one test.
3. For a run request, report the prerequisites first:
   - `docker compose up -d` for Neo4j (Bolt `7891`, HTTP `8892`);
   - export `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` before startup so the Maven profile resolves;
   - `./mvnw spring-boot:run`, or `-Dspring-boot.run.profiles=<bot>` for a bot profile.
4. After prompt changes, report `TemplateRenderingTest`; explain that it renders every Jinja template.
5. State that integration tests need the environment's Neo4j and LLM, are excluded from compilation and
   Surefire, and did not run unless they actually did.
6. Report any observed failures; never claim a check passed without running it.
7. Stop at `CHECKPOINT: VERIFICATION REPORT`.

## Output

A verification report with observed state, commands, run prerequisites, and open items.

## Do not

- Modify source or Git state.
- Run a rerun-until-green loop and call it passing.
- Hide a skipped check.
- Claim the app starts without Neo4j and a provider key.
