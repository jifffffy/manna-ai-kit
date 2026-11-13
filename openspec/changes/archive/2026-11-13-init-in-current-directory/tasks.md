# Tasks

## 1. In-place default

- [x] 1.1 Change `DEFAULT_WORKSPACE` to `.` and resolve the workspace to the current working directory; verify `manna init` copies into the test working directory and creates `./urbot`.
- [x] 1.2 Keep `--workspace` and `--dir` as optional overrides; verify a custom workspace and an external checkout still resolve correctly.
- [x] 1.3 Verify no `./manna-workspace` directory is created by default.

## 2. .gitignore and safety

- [x] 2.1 Replace generated `.gitignore` writing with append-if-missing for `.manna-run/` and the checkout ignore entry; verify existing lines are preserved.
- [x] 2.2 Keep the kit-root guard; verify `workspace === KIT_ROOT` fails before copying and does not overwrite `AGENTS.md`.
- [x] 2.3 Preserve the existing copy set, `--force` refresh, OpenCode skill copies, and OpenSpec root.

## 3. Tests

- [x] 3.1 Update `scripts/dev/test-simple-init.mjs` so the default workspace is the test working directory and the checkout is `work/urbot`.
- [x] 3.2 Assert the generated workspace contains `AGENTS.md`, `.opencode`, skills, workflows, policies, docs, generator, OpenSpec config/specs, and `urbot/`.
- [x] 3.3 Assert the workspace excludes `scripts/dev`, `evals`, `package.json`, `skills.lock`, and `openspec/changes`.
- [x] 3.4 Assert an existing `.gitignore` is extended rather than replaced.
- [x] 3.5 Assert the kit-root guard fails cleanly.
- [x] 3.6 Verify `npm run test:init` and `npm test` pass.

## 4. Documentation and specs

- [x] 4.1 Update `README.md` to show the current directory, `./urbot`, and OpenCode usage.
- [x] 4.2 Update `AGENTS.md` and `docs/architecture.md` with the in-place workspace layout.
- [x] 4.3 Update `openspec/specs/manna-workspace/spec.md` and `openspec/specs/urbot-inspect-and-route/spec.md`.
- [x] 4.4 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.

## 5. Verification

- [x] 5.1 Run `npm run validate`, `npm run check:positioning`, `npm run check:urbot-only`, `npm test`, and `openspec validate init-in-current-directory --strict`; confirm all pass.
- [x] 5.2 Verify the workspace opens in OpenCode at the current directory with `AGENTS.md`, `.opencode`, and `./urbot`.
