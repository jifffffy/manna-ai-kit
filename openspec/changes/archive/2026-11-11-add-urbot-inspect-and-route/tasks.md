# Tasks

## 1. Remote fetch and resolved commit

- [x] 1.1 Add a `urbot` namespace to `generator/manna.mjs` that dispatches `urbot init` and `urbot inspect` without changing the deprecated `init`/`slice`/`validate`/`lock` commands; verify `node generator/manna.mjs urbot init --help` and `node generator/manna.mjs urbot inspect --help` print usage.
- [x] 1.2 Implement `urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir>` using `git clone --depth=1 --single-branch --branch <ref> https://github.com/jifffffy/urbot <dir>` and `git -C <dir> rev-parse HEAD`; verify against a temp clone that the printed `resolvedCommit` equals `git -C <dir> rev-parse HEAD`.
- [x] 1.3 Add optional `.manna-run/source.json` writing behind an explicit opt-in flag (`--write-state`), with `repository`, `requestedRef`, `resolvedCommit`, `fetchedAt`; verify the file is absent by default and correct when opted in.

## 2. Tag-first resolution and Git-native updates

- [x] 2.1 Resolve the requested ref with `git ls-remote --tags` first; when `refs/tags/<ref>` matches, record the tag and cloned commit; otherwise treat the ref as a branch and record branch + resolved commit; verify with a tag ref and a branch ref.
- [x] 2.2 Verify the update path uses Git only: search the new `generator/urbot/` code for GitHub Template API calls and merge-engine logic and confirm neither exists.

## 3. Router

- [x] 3.1 Implement the 8-step router in `generator/urbot/route.mjs`: confirm directory → missing directory selects `urbot-bootstrap` → existing directory reads Git/project state → identify target profile → classify one intent → select one workflow → output target files and verification commands → hand off.
- [x] 3.2 Implement the routing table exactly as designed: bootstrap, profile-change, prompt-tuning, tool-development, domain-memory, verification; ambiguous requests return exactly one precise question.
- [x] 3.3 Verify route selection with unit cases for all six intents and the ambiguous case; confirm multi-intent requests ask which to do first instead of silently splitting.

## 4. Skills skeletons

- [x] 4.1 Create `skills/urbot-discovery/`, `skills/urbot-profile/`, `skills/urbot-tool/`, `skills/urbot-domain-memory/`, `skills/urbot-prompt/`, and `skills/urbot-verification/`, each with `SKILL.md`, `references/`, and `scripts/` (use a tracked placeholder such as `.gitkeep` or `README.md` inside empty dirs); verify every path exists and each `SKILL.md` frontmatter `name` equals its directory.
- [x] 4.2 Implement `urbot-discovery` read-only in `skills/urbot-discovery/scripts/inspect.mjs` and wire it through `generator/urbot/inspect.mjs`; verify it reads Project, Source, Commit, Profiles, Target profile, Bot package, Persona, Objective, Domain types, and Tools without writing to the project.
- [x] 4.3 Leave `urbot-profile`, `urbot-tool`, `urbot-domain-memory`, and `urbot-prompt` as documentation skeletons that state inputs, checkpoints, output, and that Phase 1 does not write; verify each `SKILL.md` contains those sections and no write implementation.

## 5. Workflows skeletons

- [x] 5.1 Create `workflows/urbot-bootstrap.md`, `urbot-profile-change.md`, `urbot-tool-development.md`, `urbot-domain-memory.md`, `urbot-prompt-tuning.md`, and `urbot-verification.md`; verify each document states goal, ordered steps, checkpoints, output, and Phase 1 scope.
- [x] 5.2 Implement the read-only `urbot-bootstrap` path: inspect an existing or missing directory, report the bootstrap plan, and stop without modifying files; verify with an existing and a missing temp directory.
- [x] 5.3 Implement the read-only `urbot-verification` path: report project state and verification commands without editing source; verify it never writes tracked files.

## 6. Discovery output contract

- [x] 6.1 Ensure the discovery report always emits Project, Source, Commit, Profiles, Target profile, Bot package, Persona, Objective, Domain types, and Tools; verify missing values are reported as absent and not invented.
- [x] 6.2 Verify the report does not copy the Urbot domain model, hash Urbot source, or replace Git by comparing its fields to the allowed list.

## 7. Minimal, optional state

- [x] 7.1 Add `.manna-run/` to `.gitignore`; verify `git check-ignore .manna-run/source.json` succeeds.
- [x] 7.2 Implement optional `.manna-run/<run-id>.json` with only `runId`, `repository`, `resolvedCommit`, `targetProfile`, `request`, `route`, `skills`, `changedFiles`, `commands`, and `status`; verify the default inspect run creates no file and the opted-in run creates only these keys.

## 8. Golden routing evals

- [x] 8.1 Add five evals: `evals/golden/urbot-bootstrap.eval.json`, `urbot-profile-prompt.eval.json`, `urbot-tool.eval.json`, `urbot-domain-memory.eval.json`, and `urbot-verification.eval.json`; verify each passes `scripts/dev/validate-kit.mjs` (required keys, `expected.must_do`, `expected.must_not`).
- [x] 8.2 Add fixtures under `evals/fixtures/urbot/` for each eval, including a `cases` array in the profile/prompt eval covering `urbot-profile-change` and `urbot-prompt-tuning`.
- [x] 8.3 Add `scripts/dev/test-routing.mjs` that runs every eval/fixture through the router, compares to the expected workflow, asserts routing-table coverage for all six intents, and exits non-zero on mismatch; wire it into `npm test`.
- [x] 8.4 Verify all five evals pass and that a deliberately wrong expected workflow makes the runner fail.

## 9. Manifests, inventory, and lock

- [x] 9.1 Add the six `urbot-*` skills to `skills.json` (version `0.1.0`, discovery/verification `suggest`, the rest `review`), `.well-known/agent-skills/index.json`, and `policies/modes.json`; verify `npm run validate` passes.
- [x] 9.2 Add the six workflow entrypoints and `skillRoutes` to `workflows/routing/pipeline.json`; verify every non-router skill has a route and `npm run validate` passes.
- [x] 9.3 Classify the new skills and workflows in the `AGENTS.md` and `README.md` inventories and update `scripts/dev/check-positioning.mjs` if needed; verify `npm run check:positioning` passes.
- [x] 9.4 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.

## 10. Verification

- [x] 10.1 Confirm `urbot init` uses `https://github.com/jifffffy/urbot` and prints the resolved commit in a temp clone.
- [x] 10.2 Confirm `urbot inspect` leaves the target project and Git state unchanged by comparing `git status --porcelain` before and after.
- [x] 10.3 Confirm the 8-step router and routing table are documented in `design.md` and implemented in `generator/urbot/route.mjs`.
- [x] 10.4 Confirm all six skills and six workflows exist with their required files/directories.
- [x] 10.5 Confirm the discovery report contains all ten required fields.
- [x] 10.6 Confirm run state is optional and `.manna-run/` is gitignored.
- [x] 10.7 Confirm all five golden routing evals pass via `npm test`.
- [x] 10.8 Run `npm run validate`, `npm run lock:check`, `npm test`, and `openspec validate add-urbot-inspect-and-route --strict`; confirm all pass.
