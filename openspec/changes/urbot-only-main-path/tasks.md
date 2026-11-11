# Tasks

## 1. Delete the legacy tree

- [x] 1.1 Delete `legacy/` in full; verify the directory is absent and no replacement copy exists.
- [x] 1.2 Verify `templates/agent-core`, `examples`, `generator/lib`, and the five retired schemas are absent.
- [x] 1.3 Verify the main `generator/manna.mjs` still exposes only the `urbot` namespace and `generator/urbot/` is untouched.

## 2. Delete legacy skills and workflows

- [x] 2.1 Delete `skills/manna-discovery`, `manna-agent`, `manna-tools`, `manna-domain`, `manna-graph`, `manna-memory`, `manna-pipeline`, `manna-transport`, `manna-evals`, and `manna-release`; verify only the six `urbot-*` skill directories remain before the router rename.
- [x] 2.2 Rename `skills/manna-router` to `skills/urbot-router` and rewrite `SKILL.md` as the 8-step Urbot intent router with the Urbot routing table and the ambiguous-request question; verify no `manna-router` directory remains.
- [x] 2.3 Delete `workflows/requirement-to-slice.md`, `feature-add.md`, `feature-modify.md`, `tool-integration.md`, `memory-tuning.md`, `data-pipeline.md`, `quality-gate.md`, and `release.md`; verify only the six `urbot-*` workflow documents and `routing/` remain.

## 3. Make manifests, modes, and routes Urbot-only

- [x] 3.1 Remove the ten legacy skills from `skills.json` and add `urbot-router`; verify the manifest lists only `urbot-router`, `urbot-discovery`, `urbot-profile`, `urbot-tool`, `urbot-domain-memory`, `urbot-prompt`, and `urbot-verification`.
- [x] 3.2 Remove the legacy skills from `.well-known/agent-skills/index.json` and `.claude-plugin/plugin.json`, add `urbot-router`, and verify all seven Urbot skills are present.
- [x] 3.3 Remove the legacy skills from `policies/modes.json`, add `urbot-router` with `suggest`, and verify only the seven Urbot entries remain.
- [x] 3.4 Remove the eight legacy entrypoints and their `skillRoutes` from `workflows/routing/pipeline.json`; verify only the six `urbot-*` entrypoints and six Urbot routes remain.
- [x] 3.5 Update the `scripts/dev/validate-kit.mjs` router exception from `manna-router` to `urbot-router`; verify `npm run validate` passes with seven skills and six workflows.

## 4. Remove generator-era shared assets

- [x] 4.1 Delete `shared/patterns/` and `shared/schemas/`; verify `shared/` contains only `SKILL-template.md`.
- [x] 4.2 Update `shared/SKILL-template.md` so its example skill name is `urbot-example` and its `requires` example uses a main-path document; verify no generator-era schema/pattern path remains.
- [x] 4.3 Verify none of the seven Urbot skills requires a deleted shared pattern or schema.

## 5. Replace the guard and update the main tests

- [x] 5.1 Replace `scripts/dev/check-legacy.mjs` with `scripts/dev/check-urbot-only.mjs`; assert `legacy/`, `templates/agent-core`, `examples/`, `generator/lib`, the retired schemas, `shared/patterns/`, and `shared/schemas/` are absent.
- [x] 5.2 Assert no `skills/manna-*` directory, no legacy workflow document, no legacy manifest entry, and no `manna-*` entry in `pipeline.json`; assert the seven Urbot skills and six Urbot workflows exist.
- [x] 5.3 Assert `generator/manna.mjs` exposes only `urbot`, `update-lock.mjs` does not import `generator/lib`, `skills.lock` has no legacy paths, and the retained files exist.
- [x] 5.4 Assert `AGENTS.md` and `README.md` state the Urbot-only path and the legacy deletion; skip the guard itself in name scans.
- [x] 5.5 Update `package.json`: replace `check:legacy` with `check:urbot-only`, update `npm test`, and verify `npm test` runs positioning, the Urbot-only guard, routing, profile, and tool checks.
- [x] 5.6 Verify `npm run lock` and `npm run lock:check` pass and `skills.lock` contains no legacy paths.

## 6. Update the positioning check and documentation

- [x] 6.1 Update `scripts/dev/check-positioning.mjs` to use `Retain` / `Urbot-only assets` / `Deleted` sections and check every current skill/workflow against the Urbot-only inventory; verify it passes.
- [x] 6.2 Update `README.md`: repository layout shows seven skills, six workflows, no `legacy/`, and `shared/` only as the skill template; asset disposition is Retain / Urbot-only / Deleted; remove the stale `manna-*` limitation.
- [x] 6.3 Update `AGENTS.md`: commands use `check:urbot-only`; asset disposition is Retain / Urbot-only / Deleted; the legacy section says the legacy tree is gone; the skill instructions use `urbot-*`; canonical references point at the retained main-path documents.
- [x] 6.4 Update `docs/architecture.md`: layers show the Urbot CLI and router, shared is the skill template, and asset disposition is Retain / Urbot-only / Deleted.
- [x] 6.5 Verify no main-path code, manifest, route, or current Urbot skill/workflow references `legacy/`, `manna-*` assets, or deleted shared paths.

## 7. Final verification

- [x] 7.1 Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and `openspec validate urbot-only-main-path --strict`; confirm all pass.
- [x] 7.2 Verify the seven Urbot skills, six Urbot workflows, and `urbot-router` exist; verify `legacy/`, the ten legacy skills, the eight legacy workflows, and the shared patterns/schemas are gone.
- [x] 7.3 Verify `git status` shows only the intended deletions, rename, and updates.
