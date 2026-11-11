# Design

## Context

See `proposal.md` — Why. The current tree still carries two products:

- `legacy/` with the retired generator, templates, examples, schemas, tests, and old golden evals;
- 17 skills: 11 `manna-*` plus 6 `urbot-*`;
- 14 workflows: 8 legacy plus 6 `urbot-*`;
- `shared/patterns/` and `shared/schemas/` with generator-era guidance.

The Urbot path is the product: `manna urbot init|inspect`, the profile write workflow, and the tool write
workflow have each been verified against a real Urbot checkout. The one-release compatibility window is over.

## Goals / Non-Goals

**Goals:**

- Delete `legacy/` and every remaining `manna-*` skill and legacy workflow.
- Rename the retained router architecture to `urbot-router` and rewrite its content for Urbot.
- Keep only the seven Urbot skills and six Urbot workflows.
- Reduce manifests, modes, and routing to the Urbot inventory.
- Delete generator-era shared patterns and schemas; keep the skill template.
- Replace the legacy guard with an Urbot-only guard.
- Keep the retained orchestration spine intact.

**Non-Goals:**

- Changing `generator/urbot/`, the Urbot workflow behavior, or the profile/tool implementations.
- Reintroducing a legacy path under another name.
- A second Spring Boot application or a second domain model.

## Decisions

### D1. Delete `legacy/`

Remove the whole directory with `git rm -r legacy`. There is no fallback copy. Historical reference is the
Git history and the archived OpenSpec changes, not a live directory.

### D2. Urbot-only skills and workflows

Delete:

```text
skills/manna-agent, manna-discovery, manna-domain, manna-evals, manna-graph,
manna-memory, manna-pipeline, manna-release, manna-tools, manna-transport
workflows/requirement-to-slice.md, feature-add.md, feature-modify.md,
tool-integration.md, memory-tuning.md, data-pipeline.md, quality-gate.md, release.md
```

Rename `skills/manna-router` to `skills/urbot-router` and rewrite it as the 8-step router:

1. Confirm the target directory.
2. Missing directory → `urbot-bootstrap`.
3. Present directory → read Git and Urbot project state.
4. Identify the target profile.
5. Classify one intent.
6. Select one workflow.
7. Output target files and verification commands.
8. Hand control to the workflow.

The routing table stays: bootstrap, profile-change, prompt-tuning, tool-development, domain-memory,
verification; ambiguous → read the project and ask one precise question. The router never runs multiple
unbounded workflows.

### D3. Manifests, modes, and routes

- `skills.json`, `.well-known/agent-skills/index.json`, `.claude-plugin/plugin.json`, and
  `policies/modes.json` list only:
  `urbot-router`, `urbot-discovery`, `urbot-profile`, `urbot-tool`, `urbot-domain-memory`, `urbot-prompt`,
  `urbot-verification`.
- `workflows/routing/pipeline.json` keeps the six `urbot-*` entrypoints and their `skillRoutes`; all legacy
  entrypoints and routes are removed.
- `scripts/dev/validate-kit.mjs` changes the router exception from `manna-router` to `urbot-router`.
- `scripts/dev/check-positioning.mjs` uses the `Urbot-only assets` and `Deleted` sections instead of the
  legacy `Rewrite`/`Moved to legacy` sections, and checks every current skill/workflow against them.

### D4. Shared assets

Delete `shared/patterns/` and `shared/schemas/`:

- The seven `urbot-*` skills require only `docs/architecture.md`, the policies, and
  `workflows/routing/pipeline.json`.
- The generator-era patterns and schemas have no main-path consumer.
- Keep `shared/SKILL-template.md`; update its example `name` from `manna-example` to `urbot-example`.

### D5. Guard and validator

Replace `scripts/dev/check-legacy.mjs` with `scripts/dev/check-urbot-only.mjs` and replace the
`check:legacy` script with `check:urbot-only`. The guard asserts:

- `legacy/`, `templates/agent-core`, `examples/`, `generator/lib`, the five retired schemas,
  `shared/patterns/`, and `shared/schemas/` are absent;
- no `skills/manna-*` directory and no legacy workflow document exists;
- `skills.json`, `.well-known`, `.claude-plugin`, `policies/modes.json`, and
  `workflows/routing/pipeline.json` contain no `manna-*` entries;
- `generator/manna.mjs` exposes only the `urbot` namespace;
- `scripts/dev/update-lock.mjs` does not import `generator/lib`;
- `skills.lock` contains no legacy paths;
- the seven Urbot skills, six Urbot workflows, and retained files exist;
- `AGENTS.md` and `README.md` state the Urbot-only path and the legacy deletion.

The guard skips itself when scanning for legacy names. It scans code, JSON, and current Urbot skill/workflow
documents, not the `AGENTS.md`/`README.md` “Deleted” history.

### D6. Documentation

- `AGENTS.md`: commands use `check:urbot-only`; the asset disposition becomes Retain / Urbot-only assets /
  Deleted; the legacy section states the legacy tree is gone; the “Adding a skill” instructions use
  `urbot-*`; the canonical references point at `shared/SKILL-template.md`, `policies/tool-safety.md`,
  `workflows/routing/pipeline.json`, and `docs/architecture.md`.
- `README.md`: repository layout shows seven skills, six workflows, no `legacy/`, and `shared/` only as the
  skill template; the asset disposition becomes Retain / Urbot-only / Deleted; “Honest limitations” drops
  the stale `manna-*` note.
- `docs/architecture.md`: layers show the Urbot CLI and the router; the shared layer is the skill template;
  the asset disposition becomes Retain / Urbot-only / Deleted.

### D7. Package and tests

`package.json`:

```json
"check:urbot-only": "node scripts/dev/check-urbot-only.mjs",
"test": "node scripts/dev/check-positioning.mjs && node scripts/dev/check-urbot-only.mjs && ..."
```

The `files` list already excludes `legacy/` and the legacy templates/examples; keep it. `skills.lock` is
regenerated. The main tests remain the positioning check, the Urbot-only guard, the routing evals, the profile
fixture check, and the tool fixture check.

## Risks / Trade-offs

- **Deleting the legacy skills removes historical content** → It remains in Git history and the archived
  OpenSpec changes; the current product is Urbot-only.
- **The router rename touches the validator and manifests** → Update `urbot-router` in `skills.json`,
  `.well-known`, `plugin.json`, `modes.json`, and the validator exception in one change.
- **Deleting shared patterns could remove useful guidance** → The Urbot skills do not require them; the
  Urbot repository is the source of extension guidance.
- **The guard could flag legitimate Urbot terms** → It checks specific legacy names/paths, not the word
  “legacy” or the new `.manna-run/` state.
- **A future change adds a legacy alias** → The guard fails on `manna-*` skills/workflows/manifests and
  `legacy/`.

## Migration Plan

1. Delete `legacy/`, the ten legacy skills, and the eight legacy workflows.
2. Rename `manna-router` to `urbot-router` and rewrite its content.
3. Delete `shared/patterns/` and `shared/schemas/`; update `shared/SKILL-template.md`.
4. Update manifests, modes, and `pipeline.json`; update the validator and positioning check.
5. Replace `check:legacy` with `check:urbot-only`; update `package.json` and `npm test`.
6. Update `AGENTS.md`, `README.md`, and `docs/architecture.md`.
7. Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and
   `openspec validate urbot-only-main-path --strict`.
8. Roll back by restoring the deleted files from Git and reverting the manifest/router/guard changes; no
   Urbot orchestration code is touched.

## Open Questions

None blocking. Whether to reintroduce any shared pattern as Urbot-specific guidance is a later decision.
