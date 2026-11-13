# Tasks

## 1. Workspace copy model

- [x] 1.1 Add `generator/urbot/workspace-agents.md` with a `{{URBOT_PROJECT}}` placeholder and consumer-focused instructions; verify it names the local `skills/`, `workflows/`, `generator/`, `openspec`, and `{{URBOT_PROJECT}}`.
- [x] 1.2 Add a copy manifest/helper for the workspace set: `.opencode/`, `skills/`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`, `skills.json`, `.well-known/`, `.claude-plugin/`, `openspec/config.yaml`, and `openspec/specs/`; verify the manifest does not include `scripts/dev/`, `evals/`, `package.json`, `skills.lock`, or `openspec/changes/`.
- [x] 1.3 Resolve `KIT_ROOT` from the CLI module (`generator/urbot` two levels up) and copy from it, not from `process.cwd()`; verify a temp installed-package-shaped root works.
- [x] 1.4 Implement copy semantics: create missing files, skip existing files by default, and refresh only with `--force`; verify a modified copied file survives a normal rerun and is restored by `--force`.
- [x] 1.5 Copy each `skills/urbot-*` directory to `.opencode/skills/<id>` in addition to `skills/`; verify `.opencode/skills/urbot-router/SKILL.md` and `.opencode/skills/openspec-propose/SKILL.md` exist.
- [x] 1.6 Copy `openspec/config.yaml` and `openspec/specs/` but not `openspec/changes/`; verify an `opsx` root exists without the kit's change history.
- [x] 1.7 Generate a workspace `.gitignore` that ignores `.manna-run/` and the nested `urbot/` checkout; verify both entries.

## 2. CLI behavior

- [x] 2.1 Add `--workspace <dir>` with default `./manna-workspace`; keep `--dir` as the Urbot checkout override and default it to `<workspace>/urbot`; add `--force`.
- [x] 2.2 Create/reuse the workspace and copy the kit before/independently of the checkout; verify the workspace exists even when the checkout is missing, and the checkout is created at `<workspace>/urbot` by default.
- [x] 2.3 Generate the workspace `AGENTS.md` from the template with `./urbot` for the default checkout and an absolute path when `--dir` is outside the workspace; verify no kit-maintenance instructions are present.
- [x] 2.4 Return `workspace`, `kit` (`copied`/`skipped`), `source`, and `inspection` in the JSON result; verify the output paths.
- [x] 2.5 Preserve the existing fixed repo/ref/tag selection, checkout reuse, and routing behavior; verify the existing `test:init` route assertions still pass.
- [x] 2.6 Keep `init` read-only for Urbot: verify `git status --porcelain` in the checkout is unchanged and no routed workflow files are written.
- [x] 2.7 Ensure an existing workspace with unrelated files is not deleted; verify only manifest files are added and non-manifest files remain.

## 3. Packaging

- [x] 3.1 Add `.opencode/`, `openspec/config.yaml`, and `openspec/specs/` to `package.json` `files`; verify the package file list includes them.
- [x] 3.2 Verify the installed CLI can find `.opencode/`, the OpenSpec config/specs, and the workspace AGENTS template from `KIT_ROOT`.
- [x] 3.3 Verify the copied `generator/` can run `node generator/manna.mjs --help` from the workspace; verify no `package.json` or `scripts/dev` is required for the local CLI snapshot.
- [x] 3.4 Verify the workspace does not contain a second Spring Boot application or a second domain model.

## 4. Tests

- [x] 4.1 Update `scripts/dev/test-simple-init.mjs` for the new default workspace (`./manna-workspace` with `./manna-workspace/urbot`).
- [x] 4.2 Assert the workspace contains `AGENTS.md`, `.opencode/commands/opsx-propose.md`, `.opencode/skills/urbot-router/SKILL.md`, `skills/urbot-router/SKILL.md`, `workflows/`, `policies/`, `shared/`, `docs/`, `generator/`, `skills.json`, `.well-known/`, `.claude-plugin/`, `openspec/config.yaml`, `openspec/specs/`, and `urbot/`.
- [x] 4.3 Assert the workspace excludes `scripts/dev/`, `evals/`, `package.json`, `skills.lock`, and `openspec/changes/`.
- [x] 4.4 Assert `AGENTS.md` contains `./urbot`, `skills/urbot-router`, and `openspec`; assert it does not contain kit-maintenance instructions.
- [x] 4.5 Assert the copy is idempotent: a modified copied file survives a normal rerun and is restored by `--force`; non-manifest files survive both.
- [x] 4.6 Assert the Urbot checkout is reused, the route resolves, and `git status --porcelain` is unchanged.
- [x] 4.7 Keep `test:init` in `npm test`; verify `npm test` and `npm run test:init` pass.

## 5. Documentation, lock, and final verification

- [x] 5.1 Update `README.md` quick start: `manna init` creates `./manna-workspace`, open that directory in OpenCode, and use `--workspace`/`--dir`/`--force` as needed.
- [x] 5.2 Update `AGENTS.md` and `docs/architecture.md` with the workspace layout, local kit copy, `./urbot` path, and OpenCode discovery.
- [x] 5.3 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.
- [x] 5.4 Run `npm run validate`, `npm run check:positioning`, `npm run check:urbot-only`, `npm test`, and `openspec validate self-contained-manna-workspace --strict`; confirm all pass.
- [x] 5.5 Verify the workspace opens as a single directory in OpenCode: `AGENTS.md` is at the root, `.opencode` commands/skills are present, and the Urbot checkout is `./urbot`.
