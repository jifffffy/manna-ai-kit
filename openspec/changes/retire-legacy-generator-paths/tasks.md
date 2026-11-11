# Tasks

## 1. Move legacy assets under legacy/

- [x] 1.1 Create `legacy/templates/agent-core/` from `templates/agent-core/`; verify the main `templates/agent-core/` path no longer exists and the legacy path does.
- [x] 1.2 Move `generator/lib/` to `legacy/generator/lib/`; verify `generator/lib/` no longer exists.
- [x] 1.3 Move the legacy generator entrypoint to `legacy/generator/manna.mjs` and keep its `init`/`slice`/`validate`/`lock` cases; verify the file contains all four cases.
- [x] 1.4 Move `examples/` to `legacy/examples/`; verify `examples/` no longer exists and the example spec plus slice files are under `legacy/examples/`.
- [x] 1.5 Move the five schemas (`project-spec`, `capability-spec`, `graph-schema`, `memory-schema`, `pipeline-schema`) to `legacy/shared/schemas/`; verify they are absent from `shared/schemas/` and present under `legacy/shared/schemas/`.
- [x] 1.6 Move `scripts/dev/test-generator.mjs` and `scripts/dev/test-generated-compile.mjs` to `legacy/scripts/` and fix their relative imports to `../generator/lib/` and `../examples/`; verify `scripts/dev` no longer contains them.
- [x] 1.7 Verify the moved templates/examples/schemas contain the retired `.manna` artifacts, `project.designMode`, and `F-001` IDs, and no root `.manna/` directory remains in the main path.

## 2. Split the CLI

- [x] 2.1 Replace `generator/manna.mjs` with a urbot-only dispatcher that imports only `./urbot/index.mjs`, supports `urbot init|inspect`, help, and unknown-command handling; verify it contains no `init`/`slice`/`validate`/`lock` command cases and no `./lib` import.
- [x] 2.2 Verify `generator/urbot/` is unchanged and `node generator/manna.mjs urbot inspect --help` still works through the new entrypoint.
- [x] 2.3 Verify the `bin` path in `package.json` still points at `generator/manna.mjs` and the published package excludes `legacy/`.

## 3. Scope the lock to the main path

- [x] 3.1 Create `scripts/dev/lock-utils.mjs` with `walk`, `sha256File`, and `computeDigest` copied from the legacy lock helper; verify no main-path file imports `generator/lib/lock.mjs`.
- [x] 3.2 Update `scripts/dev/update-lock.mjs` to import from `./lock-utils.mjs` and add `legacy` to its exclusions; verify `generator/lib` does not appear in the script.
- [x] 3.3 Run `npm run lock`; verify `skills.lock` contains no entries beginning with `legacy/` and `npm run lock:check` passes.

## 4. Scope validate-kit to the main path

- [x] 4.1 Update the generic JSON walk in `scripts/dev/validate-kit.mjs` to skip `legacy`, `.opencode`, `openspec`, and `.github`; verify `legacy/` JSON is not parsed.
- [x] 4.2 Verify `npm run validate` still checks `package.json`, `skills.json`, `.well-known`, `.claude-plugin`, `policies/modes.json`, `workflows/routing/pipeline.json`, all skills, and `evals/golden/`.
- [x] 4.3 Verify the validator does not read the moved five schemas or the legacy examples.

## 5. Remove main-path references

- [x] 5.1 Remove the moved schema requirements from legacy `manna-*` skills: `capability-spec` from `manna-agent`, `manna-discovery`, and `manna-domain`; `project-spec` from `manna-discovery`; `graph-schema` from `manna-graph`; `memory-schema` from `manna-memory`; `pipeline-schema` from `manna-pipeline`; verify `validate-kit` passes.
- [x] 5.2 Update the `manna-discovery` body reference to the moved capability schema so it no longer points at `shared/schemas/capability-spec.schema.json`.
- [x] 5.3 Verify no main-path skill `requires`, source import, package script, or manifest references `legacy/` or a moved schema/template/example.

## 6. Update the main tests and CI

- [x] 6.1 Update `package.json`: remove `test-generator` from `npm test`, remove `test:compile`, add `check:legacy`, and verify no script references `legacy/`.
- [x] 6.2 Update `package.json` `files` to drop `templates/` and `examples/`, and update the description/keywords to the Urbot orchestrator; verify `legacy/` is not shipped.
- [x] 6.3 Update `.github/workflows/validate.yml` to remove `npm run test:compile` and the unnecessary Java setup; verify CI runs `validate`, `lock:check`, and `npm test`.
- [x] 6.4 Verify `npm test` runs positioning, legacy, routing, profile, and tool checks and does not import the legacy generator.

## 7. Add the retirement guard

- [x] 7.1 Implement `scripts/dev/check-legacy.mjs` to assert the required legacy paths exist and the main `templates/agent-core`, `examples`, and `generator/lib` paths are absent.
- [x] 7.2 Add main-path scans for `legacy/` in `.mjs`/`.json` files and package scripts, excluding the guard itself; verify a known legacy reference fails the check.
- [x] 7.3 Assert `generator/manna.mjs` contains only the `urbot` namespace, `update-lock.mjs` uses `lock-utils`, `validate-kit.mjs` skips `legacy`, and `skills.lock` has no `legacy/` entries.
- [x] 7.4 Assert the retained paths exist: `skills/manna-router`, `workflows/routing/pipeline.json`, `scripts/dev/validate-kit.mjs`, `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, `policies/modes.json`, `policies/tool-safety.md`, `skills.lock`, `evals/golden`, and `shared/SKILL-template.md`.
- [x] 7.5 Assert `AGENTS.md` and `README.md` describe `legacy/` as historical and not shipped; wire `check:legacy` into `npm test`.

## 8. Documentation

- [x] 8.1 Add `legacy/README.md` stating historical-only, not shipped, not imported by the main path, and scheduled for removal after one release.
- [x] 8.2 Update `AGENTS.md`: legacy section, commands/test chain, asset disposition moved list, repository/layer model, and remove stale generator/templates/examples guidance.
- [x] 8.3 Update `README.md`: legacy section, repository layout, quick start without `test:compile`, asset disposition moved list, and "not a generator" wording.
- [x] 8.4 Update `docs/architecture.md`: layer diagram and asset disposition point at `legacy/` and the Urbot CLI.
- [x] 8.5 Verify `npm run check:positioning` still passes after the doc changes.

## 9. Final verification

- [x] 9.1 Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and `openspec validate retire-legacy-generator-paths --strict`; confirm all pass.
- [x] 9.2 Verify the main path has no `legacy/` or moved-schema references, `legacy/` contains the retired assets, and the retained list is intact.
- [x] 9.3 Verify `git status` shows only the intended moves/additions/deletions and no accidental deletion of legacy content.
