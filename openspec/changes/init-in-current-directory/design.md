# Design

## Context

See `proposal.md` — Why. The self-contained workspace change introduced `./manna-workspace` as the default.
That creates an extra nesting level and makes the user open a generated subdirectory instead of the project
directory they already chose. The workspace copy machinery (`generator/urbot/workspace.mjs`) already supports
a caller-provided root; the correction is mainly a default-path and `.gitignore` behavior change.

## Goals / Non-Goals

**Goals:**

- Default the workspace root to the current working directory.
- Keep the Urbot checkout at `./urbot`.
- Preserve `--workspace` and `--dir` overrides.
- Extend an existing `.gitignore` instead of replacing it.
- Prevent copying the kit into its own root.
- Keep the copy set, OpenCode discovery, and read-only Urbot behavior unchanged.

**Non-Goals:**

- Auto-applying a workflow.
- Changing the kit copy set beyond `.gitignore` handling.
- A second runtime/domain or UI.
- Migrating existing `./manna-workspace` directories automatically.

## Decisions

### D1. Current directory is the default workspace

`DEFAULT_WORKSPACE` becomes `"."`; `runSimpleInit` resolves it to `process.cwd()`. The checkout remains
`<workspace>/urbot`, which is `./urbot` for the default. `--workspace <dir>` still selects another root and
`--dir <dir>` still selects another checkout.

*Alternative considered:* keep `./manna-workspace` and tell users to `cd`. Rejected — it adds a directory the
user did not ask for.

### D2. Extend `.gitignore` instead of skipping or replacing

`ensureGitignore` reads an existing `.gitignore`, keeps its lines, and appends only missing
`.manna-run/` and checkout ignore entries. It does not overwrite the file, even with `--force`; the required
entries are additive. If the file is absent, it is created.

*Alternative considered:* use `writeGenerated` with skip/overwrite. Rejected — a user project often already
has a `.gitignore`; replacing it would discard their rules.

### D3. Reject the kit root

The copy helper already rejects `workspace === KIT_ROOT`. Keep that guard and document it: run `manna init` in
the target project directory, not in the Manna kit checkout. This prevents overwriting the kit's `AGENTS.md`
and copying the kit into itself.

### D4. Preserve the rest of the workspace contract

The copy set, exclusions, generated `AGENTS.md`, `.opencode/skills` copies, OpenSpec root, `--force` refresh,
and Urbot read-only behavior are unchanged. Existing files are still preserved unless `--force` is used.

### D5. Tests and docs

Update `test-simple-init.mjs` so the default workspace is the test working directory and the checkout is
`work/urbot`. Add assertions for:

- no `manna-workspace` directory;
- `AGENTS.md` at the current directory and `./urbot` inside it;
- `.gitignore` is appended, not replaced, when it already exists;
- the kit-root guard fails cleanly.

Update `README.md`, `AGENTS.md`, `docs/architecture.md`, the main specs, and `skills.lock`.

## Risks / Trade-offs

- **Existing project has an `AGENTS.md`** → The copy preserves it by default; `--force` overwrites. Document
  that the user can review the generated workspace AGENTS before forcing.
- **Existing `.gitignore` is large** → Append only missing entries and preserve all lines.
- **Running in the kit root** → Fail with a clear error; do not copy.
- **Nested `urbot/` checkout** → The generated `.gitignore` includes `urbot/`; the checkout keeps its own Git
  history.
- **Old `./manna-workspace` directories** → This change does not migrate them; users can remove or ignore them.

## Migration Plan

1. Change the default workspace to `.` and the default checkout to `./urbot`.
2. Replace generated `.gitignore` writing with append-if-missing.
3. Keep the kit-root guard.
4. Update the init test, docs, specs, and lock.
5. Run `npm run validate`, `npm run lock:check`, `npm test`, and `openspec validate
   init-in-current-directory --strict`.
6. Roll back by restoring the `./manna-workspace` default and the previous `.gitignore` writer.

## Open Questions

None. Users who want a generated workspace root can still pass `--workspace`.
