# Design

## Context

See `proposal.md` — Why. The main path is now the Urbot orchestration:

- `generator/manna.mjs` dispatches `urbot init|inspect` and still carries the legacy generator switch.
- `generator/lib/` contains the legacy generate/validate/lock helpers.
- `scripts/dev/update-lock.mjs` imports `generator/lib/lock.mjs` for the generic walk/digest helpers.
- `scripts/dev/validate-kit.mjs` walks every JSON file under the repo.
- `scripts/dev/test-generator.mjs` and `test-generated-compile.mjs` exercise `examples/` and the legacy
  generator.
- `skills/manna-*` still require the legacy project schemas.
- `package.json` still ships `templates/` and `examples/`, and `npm test` still runs the generator test.

**Dependency note:** the requested prerequisite `implement-urbot-domain-memory` is not archived in this
repository. The latest archived change is `implement-urbot-tool-development`. This change does not touch
Urbot orchestration logic, so it is independent of domain/memory; rebase if that change lands first.

## Goals / Non-Goals

**Goals:**

- Move the legacy generator, templates, schemas, examples, and tests under `legacy/`.
- Make the main path self-contained: no imports or `requires` into legacy.
- Scope validation and the kit lock to the main path.
- Keep the retained orchestration spine intact.
- Make documentation and package metadata honest about the boundary.

**Non-Goals:**

- Deleting `legacy/` (a later release does that).
- Changing `generator/urbot/`, the router, or any Urbot workflow behavior.
- Generating a second Spring Boot application.

## Decisions

### D1. Legacy layout

```text
legacy/
├── README.md                      # historical, not shipped, remove after one release
├── templates/agent-core/          # moved from templates/agent-core/
├── generator/
│   ├── manna.mjs                  # the old init/slice/validate/lock switch
│   └── lib/                       # generate, validate, lock
├── examples/                      # example.spec.json and slices
├── scripts/                       # test-generator.mjs, test-generated-compile.mjs
└── shared/schemas/                # the five project schemas
```

`legacy/` is committed for one release, is not in the package `files` list, and is not imported by the main
path. The `.manna` artifacts, `project.designMode`, and `F-001` IDs live inside the moved templates/examples/
schemas; no root `.manna` directory remains.

*Alternative considered:* delete the generator now. Rejected — the user wants one release of compatibility and
historical reference.

### D2. CLI split

The main `generator/manna.mjs` becomes a thin dispatcher:

```js
import { runUrbotCommand } from "./urbot/index.mjs";
// only the `urbot` namespace, help, and unknown-command handling
```

The old switch and `generator/lib/` move to `legacy/generator/`; the old entrypoint keeps its relative
`./lib/...` imports. `generator/urbot/` stays untouched. The `bin` path remains `generator/manna.mjs`.

*Alternative considered:* move the whole `generator/` directory and create a new `bin/`. Rejected — it would
change the published bin path for no benefit.

### D3. Extract the lock helper

`scripts/dev/update-lock.mjs` currently imports `computeDigest`/`walk` from `generator/lib/lock.mjs`. Because
`generator/lib/` moves to legacy, extract the generic helpers into `scripts/dev/lock-utils.mjs`:

- `walk(root, { exclude })`
- `sha256File(file)`
- `computeDigest(root, { files })`

`update-lock.mjs` imports from `./lock-utils.mjs` and adds `legacy` to its exclusions. The legacy
`legacy/generator/lib/lock.mjs` keeps the project-lock functions for historical reference.

*Alternative considered:* let `update-lock.mjs` import `legacy/generator/lib/lock.mjs`. Rejected — it would
put a legacy reference in the main path.

### D4. Validator scope

`scripts/dev/validate-kit.mjs` keeps validating `package.json`, `skills.json`, `.well-known`,
`.claude-plugin`, `policies/modes.json`, `workflows/routing/pipeline.json`, `skills/`, `workflows/`, and
`evals/golden/`. Its generic JSON walk skips `legacy/`, `.opencode/`, `openspec/`, and `.github/`. This keeps
the validator focused on the product and avoids parsing historical assets.

### D5. Legacy skill `requires`

The legacy `manna-*` skills are still in the rewrite inventory, but their `requires` must not point at moved
schemas. Remove the moved schema requirements:

- `manna-agent`, `manna-discovery`, `manna-domain`: drop `capability-spec.schema.json`.
- `manna-discovery`: drop `project-spec.schema.json`.
- `manna-graph`: drop `graph-schema.schema.json`.
- `manna-memory`: drop `memory-schema.schema.json`.
- `manna-pipeline`: drop `pipeline-schema.schema.json`.

Keep requirements on the remaining main schemas (`domain-slice`, `tool-contract`, `transport-schema`) where
they still apply. Update the `manna-discovery` body that points at the capability schema so it does not point
at a moved path.

*Alternative considered:* move all legacy `manna-*` skills to `legacy/`. Deferred — the user's move list is
about generator assets, and the rewrite inventory still classifies these skills. Remove only the broken
references.

### D6. Main tests and CI

The main `npm test` becomes:

```bash
check:positioning && check:legacy && test:routing && test:profile && test:tool
```

Remove `test-generator` from the chain and remove the `test:compile` script. Move the legacy tests to
`legacy/scripts/` and document that they are historical only. Remove the legacy compile step and the now
unnecessary Java setup from CI; the main tests are Node-only.

### D7. Documentation and package metadata

- `AGENTS.md` / `README.md`: a `legacy/` section states historical-only, not shipped, not imported, removed
  after one release. The asset disposition changes from “deprecate (mark only)” to “moved to `legacy/`”. The
  repository layout drops `templates/agent-core/` and `examples/` and adds `legacy/`. The quick start drops
  `test:compile`.
- `docs/architecture.md`: the layer diagram becomes Urbot CLI plus a separate legacy layer; asset disposition
  points at `legacy/`.
- `package.json`: update the description to the Urbot orchestrator, drop `templates/` and `examples/` from
  `files`, add `legacy` to the lock exclusions via the script, and remove `test:compile`.
- `legacy/README.md`: explains the historical-only status and the one-release removal.

### D8. Retirement guard

Add `scripts/dev/check-legacy.mjs` and wire it into `npm test`:

- assert the required legacy directories/files exist;
- assert the main directories/files are absent (`templates/agent-core`, `examples`, `generator/lib`);
- scan main `.mjs`/`.json` files and package scripts for `legacy/` (excluding the guard itself);
- assert `generator/manna.mjs` contains only the `urbot` namespace and not the legacy cases or `./lib`;
- assert `update-lock.mjs` uses `lock-utils` and not `generator/lib`;
- assert `validate-kit.mjs` skips `legacy`;
- assert `skills.lock` has no `legacy/` entries;
- assert `AGENTS.md`/`README.md` describe the boundary;
- assert the retained paths exist.

The guard is the acceptance mechanism for “main path has no legacy references” and “the retain list is
complete”.

## Risks / Trade-offs

- **Legacy assets are still in the repo** → They are isolated and not shipped; the guard prevents accidental
  imports. Deletion is a later change.
- **The lock helper is duplicated** → The main copy is small and stable; the legacy copy is frozen.
- **Legacy skills lose schema references** → Their content is already historical; the rewrite path uses the
  `urbot-*` skills.
- **The package `files` list and CI drift** → Update both in the same change and verify with the guard.
- **A dependency is missing** → This change is independent of domain/memory; rebase if it lands first.

## Migration Plan

1. Move the legacy assets with `git mv`.
2. Create the urbot-only `generator/manna.mjs`; keep the old switch in `legacy/generator/manna.mjs`.
3. Extract `scripts/dev/lock-utils.mjs`; update `update-lock.mjs`.
4. Scope `validate-kit.mjs`; update legacy skill `requires`.
5. Move the legacy tests; update `package.json` and CI.
6. Add `check-legacy.mjs`; wire `npm test`.
7. Update docs and `legacy/README.md`.
8. Run `npm run validate`, `npm run lock`, `npm run lock:check`, `npm test`, and
   `openspec validate retire-legacy-generator-paths --strict`.
9. Roll back by moving `legacy/` assets back and restoring the main CLI/lock/validator/test wiring; no Urbot
   orchestration code is touched.

## Open Questions

None blocking. The one-release deletion and any further legacy-skill moves are later changes.
