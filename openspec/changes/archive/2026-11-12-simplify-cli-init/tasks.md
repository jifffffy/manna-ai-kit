# Tasks

## 1. CLI surface

- [x] 1.1 Verify `package.json` `bin` remains `manna -> generator/manna.mjs` and no extra CLI alias is added.
- [x] 1.2 Add a top-level `init` case to `generator/manna.mjs` that passes the raw args to a simple-init entry point; verify `node generator/manna.mjs --help` still prints usage and an empty request fails with a clear message.
- [x] 1.3 Define the simple-init argument shape: first non-flag argument is the request; optional `--repo`, `--ref`, `--dir`, and `--write-state` follow; verify a quoted request with spaces is accepted as one argument.
- [x] 1.4 Keep `manna urbot init|inspect` working unchanged; verify their help and basic argument errors still behave as before.

## 2. Defaults and checkout

- [x] 2.1 Add/export the fixed default repository `https://github.com/jifffffy/urbot`; verify the simple init reports it when `--repo` is omitted.
- [x] 2.2 Resolve an omitted ref to the highest semver tag from `git ls-remote --tags`, falling back to `main`; verify with a local repo containing `v0.1.0` and `v0.2.0`.
- [x] 2.3 Default the checkout directory to `./urbot` relative to the current working directory; verify the resolved absolute path in the output.
- [x] 2.4 Validate an existing checkout by `.git`, `pom.xml`, and `src/main/java/com/embabel/urbot/`; verify a valid checkout is reused and an unrelated non-empty directory fails without being overwritten.
- [x] 2.5 Clone the fixed repo at the resolved ref only when the checkout is missing; verify the resolved commit is printed and recorded in the source section.
- [x] 2.6 Do not fetch, pull, or merge an existing checkout; verify the command works offline when the checkout already exists.
- [x] 2.7 Honor optional `--repo`, `--ref`, and `--dir` overrides; verify a local repo override works for tests and forks.

## 3. Compose inspection and read-only behavior

- [x] 3.1 Compose the source record (`repository`, `requestedRef`, `resolvedCommit`, `directory`) with the existing `inspectCommand` result under `inspection`; verify the output contains both sections.
- [x] 3.2 Run the existing discovery and router for the request; verify a known request selects one workflow, skills, target files, and verification commands.
- [x] 3.3 Preserve the one-question behavior for ambiguous or multi-intent requests; verify the output has a question and no guessed route.
- [x] 3.4 Do not execute the routed workflow or write Urbot source; verify `git status --porcelain` in the checkout is unchanged after init.
- [x] 3.5 Keep state writing opt-in via `--write-state`; verify the default run creates no `.manna-run` file and the opt-in path writes only the existing allowed records.
- [x] 3.6 Recognize "design/model ... domain" phrasing as domain design; verify `manna init "design the travel domain"` routes to `urbot-domain-design` rather than memory.

## 4. Urbot-only guard

- [x] 4.1 Update `scripts/dev/check-urbot-only.mjs` to allow `case "init"` while still rejecting `case "slice"`, `case "validate"`, `case "lock"`, and `./lib` in the main CLI.
- [x] 4.2 Assert the main CLI has no retired generator imports (`initProject`, `addSlice`, `validateProject`, `writeProjectLock`); verify `npm run check:urbot-only` passes.
- [x] 4.3 Verify a reintroduced legacy command or import fails the guard with a clear message.

## 5. Tests

- [x] 5.1 Add `scripts/dev/test-simple-init.mjs` with a temporary local Git repo shaped like Urbot and tags `v0.1.0` and `v0.2.0`.
- [x] 5.2 Test the no-flag defaults by asserting the fixed repository constant, the highest tag, the default `./urbot` path, and the routed inspection.
- [x] 5.3 Test existing-checkout reuse by renaming the source repo after the first run and verifying the second run still works without a clone.
- [x] 5.4 Test read-only behavior by comparing `git status --porcelain` before and after and asserting no routed files exist.
- [x] 5.5 Test ambiguous/multi-intent requests return one question and no route.
- [x] 5.6 Assert `package.json` exposes the `manna` bin and no extra CLI alias.
- [x] 5.7 Add `test:init` to `package.json` and include it in `npm test`; verify `npm test` passes without network.

## 6. Documentation and lock

- [x] 6.1 Update `README.md` quick start to put `manna init "<request>"` first and keep `urbot init|inspect` below as advanced usage.
- [x] 6.2 Update `AGENTS.md` with the one-step command, fixed defaults, read-only route-only behavior, and the optional overrides.
- [x] 6.3 Update `docs/architecture.md` to describe the one-step init as fetch + discovery + route; keep the low-level commands documented.
- [x] 6.4 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.

## 7. Final verification

- [x] 7.1 Run `npm run validate`, `npm run check:positioning`, `npm run check:urbot-only`, `npm test`, and `openspec validate simplify-cli-init --strict`; confirm all pass.
- [x] 7.2 Verify `node generator/manna.mjs init --help` documents the one-step form and the advanced commands remain available.
- [x] 7.3 Verify the main path has no auto-apply behavior and no Urbot source mutation from the simple init.
