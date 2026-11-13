# Tasks

## 1. Project argument and checkout

- [x] 1.1 Require exactly one positional project argument in `generator/urbot/simple-init.mjs`; verify `manna init` with no name fails with usage and `manna init demo` resolves to `./demo`.
- [x] 1.2 Remove `--workspace`, `--dir`, and `--force` from `init`; keep `--repo`, `--ref`, and `--write-state`; verify each remaining option still parses and help text matches.
- [x] 1.3 Clone into a missing or empty project directory at the latest tag (fallback `main`); verify `demo/pom.xml` and the resolved commit are printed.
- [x] 1.4 Reuse an existing Urbot checkout and reject a non-empty non-Urbot directory before writing; verify the rejected directory is unchanged.
- [x] 1.5 Keep the kit-root guard; verify `manna init <kit-root>` fails without overwriting anything.

## 2. Merged workspace and Manna-owned AGENTS.md

- [x] 2.1 Copy the kit into the project root, overwriting existing kit-owned files, instead of a workspace containing `urbot/`; verify `demo/skills`, `demo/.opencode`, `demo/openspec/config.yaml`, and `demo/pom.xml` coexist.
- [x] 2.2 Update `generator/urbot/workspace-agents.md` so the Urbot project path is `.` and the file is written as the project root entry point.
- [x] 2.3 Port the Urbot operations into the template: build/run prerequisites, test strategy and exclusions, extension model, RAG/memory scoping, and the repository gotchas; verify each fact has a home in the file.
- [x] 2.4 Replace `AGENTS.md` wholesale during the copy (delete the cloned file, write the template); verify no Urbot text remains, no `MANNA.md` is created, and no `opencode.json` instruction entry is needed.
- [x] 2.5 Stop modifying `.gitignore`; add `.manna-run/` to `.git/info/exclude` when the target is a Git repo, and create a `.gitignore` only for non-Git targets; verify `git status` shows no `.gitignore` change.
- [x] 2.6 Remove the `inspectCommand` call and return `{ workspace, kit, source, entry, next }` with `entry` always `AGENTS.md`; verify the output has no `inspection`.

## 3. Build, run, and test in Manna

- [x] 3.1 Extend `skills/urbot-verification/SKILL.md` with compile, unit-test, single-test, integration-boundary, prompt-rendering, Neo4j, credential-activation, profile-run, and `aot.sh` steps; verify every command is copy-pasteable.
- [x] 3.2 Extend `workflows/urbot-verification.md` to cover build and run in addition to regression checks; verify the ordered steps match the skill.
- [x] 3.3 Add build/run/start triggers (`build`, `run`, `start`, `构建`, `运行`, `启动`) to the `urbot-verification` route in `workflows/routing/pipeline.json`; verify routing evals still pass and the new intents select the route.
- [x] 3.4 Keep the `AGENTS.md` build/run/test summary aligned with the skill and point at `skills/urbot-verification`; verify the commands are identical in both places.

## 4. Tests

- [x] 4.1 Update `scripts/dev/test-simple-init.mjs` for `init demo`: assert `demo/` is the checkout, the kit is at the root, and no `demo/urbot` exists.
- [x] 4.2 Add failure checks for a missing project name and a non-empty non-Urbot directory; verify both exit non-zero with no writes.
- [x] 4.3 Assert reuse does not re-clone, a modified kit file is restored on the next run, and a user file outside the copy set is untouched.
- [x] 4.4 Assert the fixture `AGENTS.md` is replaced with no leftover fixture text, and a second run produces the same file.
- [x] 4.5 Assert the generated `AGENTS.md` contains the ported operations: `docker compose`, `7891`, `./mvnw`, `TemplateRenderingTest`, `urbot.bot-packages`, `context`, `NullRequestCache`, and `DummyUrbotUserService`.
- [x] 4.6 Assert `.gitignore` is untouched and `.git/info/exclude` contains `.manna-run/`.
- [x] 4.7 Add a routing eval for build/run/test requests and verify `npm run test:routing` passes.
- [x] 4.8 Run `npm run test:init` and `npm test`; confirm both pass.

## 5. Documentation and specs

- [x] 5.1 Update `README.md` with `manna init demo`, the single-directory layout tree, the Manna-owned `AGENTS.md`, and `manna urbot inspect` for routing.
- [x] 5.2 Update the kit `AGENTS.md` and `docs/architecture.md` with the required project argument, merged layout, and verification commands.
- [x] 5.3 Confirm the three delta specs match the implemented behavior; run `openspec validate init-project-workspace --strict`.
- [x] 5.4 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh after the shipped-file edits.

## 6. Verification

- [x] 6.1 Run `npm run validate`, `npm run check:positioning`, `npm run check:urbot-only`, `npm test`, and `openspec validate init-project-workspace --strict`; confirm all pass.
- [x] 6.2 Verify end to end in a scratch directory: `manna init demo` prints `workspace`, `kit`, `source`, `entry`, and `next`, creates `./demo` with the Manna-owned `AGENTS.md`, and leaves the rest of the Urbot checkout unchanged.
