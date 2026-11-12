# Design

## Context

See `proposal.md` — Why. The current entrypoint is `generator/manna.mjs`, which dispatches only the `urbot`
namespace. `generator/urbot/init.mjs` requires `--ref` and `--dir` and refuses a non-empty target;
`generator/urbot/inspect.mjs` requires `--project` and `--request`. The bin is only `manna`. The Urbot-only
guard currently forbids `case "init"` in the main CLI because that name belonged to the retired generator.

## Goals / Non-Goals

**Goals:**

- Make `manna init "<request>"` the primary one-step path.
- Use the fixed Urbot repository and sensible defaults for ref and checkout directory.
- Reuse an existing checkout; clone only when needed.
- Keep the result read-only and route-only.
- Keep the advanced `urbot init|inspect` commands available.

**Non-Goals:**

- Auto-applying the routed workflow.
- Refreshing or merging an existing Urbot checkout automatically.
- Changing the router, workflows, or Urbot source.

## Decisions

### D1. Command surface

Add a top-level `init` case to `generator/manna.mjs`; keep the existing `manna` bin and add no extra CLI
alias:

```json
"bin": {
  "manna": "generator/manna.mjs"
}
```

The advanced commands remain:

```bash
manna urbot init --repo ... --ref ... --dir ...
manna urbot inspect --project ... --request ...
```

The simple command treats the first non-flag argument as the request; optional flags follow it. It prints a
single JSON object with `source` and `inspection` sections.

*Alternative considered:* rename `urbot inspect` itself. Rejected — it would remove the explicit low-level
control and break existing scripts.

### D2. Fixed defaults

- Repository: `https://github.com/jifffffy/urbot`.
- Ref: the highest semver tag (`vX.Y.Z`) from `git ls-remote --tags`; fall back to `main`.
- Checkout directory: `./urbot` relative to the current working directory.
- Optional overrides: `--repo`, `--ref`, `--dir`, `--write-state`.

The command resolves the default ref only when it must clone. Reusing an existing checkout needs no remote
lookup.

*Alternative considered:* always use `main`. Rejected — the earlier tag-first policy gives a stable template
and a meaningful resolved commit.

### D3. Checkout reuse and validation

A directory is a valid Urbot checkout when it has `.git`, `pom.xml`, and
`src/main/java/com/embabel/urbot/`. If `./urbot` exists and is valid, read `git rev-parse HEAD` and reuse it.
If it exists but is not a Urbot checkout, fail with a clear message rather than overwriting it. If it is
missing, clone the fixed repository at the resolved ref.

The simple command does not fetch, pull, or merge an existing checkout. A `--dir` override points at another
checkout; a `--repo` override supports forks and tests.

*Alternative considered:* always fetch/update. Rejected — a surprise network write to an existing checkout is
worse than a predictable reuse. A later explicit refresh flag can be added if needed.

### D4. Combined result, read-only

The command composes the existing `initCommand` (clone + resolved commit) and `inspectCommand` (discovery +
route) and returns:

```json
{
  "source": {
    "repository": "https://github.com/jifffffy/urbot",
    "requestedRef": "refs/tags/v0.2.0",
    "resolvedCommit": "<sha>",
    "directory": "<absolute path>"
  },
  "inspection": {
    "runId": "RUN-...",
    "request": "<request>",
    "discovery": { "...": "..." },
    "route": "urbot-domain-design",
    "skills": ["urbot-discovery", "urbot-domain-design", "urbot-verification"],
    "targetFiles": ["..."],
    "verificationCommands": ["..."],
    "question": null,
    "status": "read-only"
  }
}
```

The command does not execute the routed workflow. `--write-state` keeps the existing optional
`.manna-run/source.json` and run-state behavior; the default writes no state. The router also recognizes
"design/model ... domain" phrasing, so the natural one-step request selects `urbot-domain-design` instead of
falling through to memory.

*Alternative considered:* return only the route. Rejected — the source record and resolved commit are useful
for reproducibility and later apply steps.

### D5. Guard update

`scripts/dev/check-urbot-only.mjs` currently rejects `case "init"` in `generator/manna.mjs` because the legacy
generator used that name. Change the guard to:

- allow `case "init"`;
- still reject `case "slice"`, `case "validate"`, `case "lock"`, and `./lib` imports;
- assert the main CLI does not import the retired generator (`initProject`, `addSlice`, `validateProject`,
  `writeProjectLock`).

This preserves the Urbot-only guarantee while allowing the new one-step command.

### D6. Tests

Add `scripts/dev/test-simple-init.mjs`:

1. Create a temporary local Git repository with a Urbot-shaped tree and tags `v0.1.0` and `v0.2.0`.
2. Run `node generator/manna.mjs init "<request>" --repo <local> --dir <checkout>`.
3. Assert `requestedRef` is the highest tag, `resolvedCommit` is the tag commit, and the inspection routes to
   the expected workflow.
4. Run again after renaming the local source repo; assert the existing checkout is reused without a clone.
5. Assert the checkout's `git status --porcelain` is unchanged and no routed files were written.
6. Assert `package.json` exposes the `manna` bin and no extra CLI alias.
7. Assert the exported default repository constant is `https://github.com/jifffffy/urbot`.

Wire `test:init` into `npm test`. The test uses local repositories only; no network.

### D7. Documentation

- `README.md`: make `manna init "<request>"` the first quick-start command; keep the explicit
  `urbot init|inspect` commands below as advanced usage.
- `AGENTS.md`: add the one-step command and its defaults to the CLI section; note it is read-only and does not
  auto-apply.
- `docs/architecture.md`: describe the one-step init as fetch + inspect + route; keep the low-level commands.
- Regenerate `skills.lock`.

## Risks / Trade-offs

- **A user already has `./urbot` with unrelated content** → Validate the Urbot markers and fail clearly; never
  overwrite.
- **Latest-tag lookup needs network on first run** → Only on the clone path; reuse works offline.
- **`init` conflicts with the retired command name** → Update the Urbot-only guard and keep the legacy
  generator absent.
- **Users expect auto-apply** → Document that `init` routes only and stops; the apply workflow remains
  explicit.
- **A custom `--repo` could point at a non-Urbot repo** → Validate the checkout markers and clarify that the
  default is the fixed template.

## Migration Plan

1. Add the top-level `init` dispatch; keep the existing `manna` bin.
2. Implement default ref/directory resolution and checkout reuse.
3. Compose the source record with the existing inspection/route result.
4. Update the Urbot-only guard for the new `init` while preserving the legacy-command bans.
5. Add the local-repository test and wire it into `npm test`.
6. Update docs and `skills.lock`.
7. Run `npm run validate`, `npm run lock:check`, `npm test`, and `openspec validate simplify-cli-init --strict`.
8. Roll back by removing the `init` case, the bin alias, the test, and the doc changes; the advanced commands
   are untouched.

## Open Questions

None blocking. A later change can add an explicit `--refresh` option if users want the simple init to update an
existing checkout.
