# Design

## Context

See `proposal.md` — Why. The repositioning change established Urbot as the only source of truth and named the
target `urbot-*` inventory. This change is Phase 1: a read-only inspect-and-route path that makes that
positioning usable without granting write access to Urbot. The existing `manna init|slice|validate|lock`
generator commands are deprecated and stay untouched.

## Goals / Non-Goals

**Goals:**

- Fetch a pinned Urbot checkout and record its exact resolved commit.
- Route one natural-language request to one Urbot development workflow from an 8-step read-only router.
- Add the six skill and six workflow skeletons that later changes will fill in.
- Implement only `urbot-discovery` read-only plus the read-only paths of `urbot-bootstrap` and
  `urbot-verification`.
- Prove routing with five golden evals.

**Non-Goals:**

- Real modification workflows (later changes).
- Long-lived or authoritative state.
- Copying the Urbot domain model, hashing Urbot source, or replacing Git.
- The GitHub Template API as an update mechanism.
- A Manna-owned merge engine.

## Decisions

### D1. Fetch with Git, pin the resolved commit

`manna urbot init` resolves the requested ref, clones it shallowly, and pins the exact commit:

```bash
git clone --depth=1 --single-branch --branch <ref> https://github.com/jifffffy/urbot <dir>
git -C <dir> rev-parse HEAD
```

The resolved commit is always printed. Tag-first resolution checks `refs/tags/<ref>`; if it matches, the tag
is recorded as `requestedRef`. Otherwise the ref is treated as a branch and the branch plus resolved commit
are recorded.

An optional `.manna-run/source.json` may be written only on explicit opt-in:

```json
{
  "repository": "https://github.com/jifffffy/urbot",
  "requestedRef": "main",
  "resolvedCommit": "23e8179ab884b82867d76fccd4ac976972dd3164",
  "fetchedAt": "2026-11-11T11:00:00Z"
}
```

It is not a project spec, does not lock Urbot source, and Phase 1 can operate with terminal output only.

*Alternatives rejected:* GitHub Template API (treats the repo as a template and hides the real commit) and a
Manna merge engine (creates a second update mechanism beside Git).

### D2. Router: eight ordered steps and one routing table

`manna urbot inspect` runs:

1. Confirm the target directory.
2. Directory missing → `urbot-bootstrap`.
3. Directory present → read Git and Urbot project state.
4. Identify the target profile.
5. Classify exactly one intent.
6. Select exactly one workflow.
7. Output target files and verification commands.
8. Hand control to the workflow.

| Intent | Workflow |
|--------|----------|
| New project or bot | `urbot-bootstrap` |
| New/modified profile | `urbot-profile-change` |
| Persona/objective/behaviour change | `urbot-prompt-tuning` |
| Add Tool/MCP/Subagent/Reference | `urbot-tool-development` |
| Add NamedEntity/Relations/Memory | `urbot-domain-memory` |
| Test/compile/regression | `urbot-verification` |
| Ambiguous | Read the project, then ask exactly one precise question |

The router is a pure function over an inspection context plus the request: it returns the route, the skill
sequence, target files, verification commands, and — for ambiguous requests — one question. Email-like
multi-intent requests are not split; the router asks which one to do first.

### D3. Skill and workflow skeletons

New skills (each with `SKILL.md`, `references/`, `scripts/`):

- `urbot-discovery` — read-only inspection; the only fully implemented skill in Phase 1.
- `urbot-profile` — profile change guidance (skeleton).
- `urbot-tool` — Tool/MCP/Subagent/Reference guidance (skeleton).
- `urbot-domain-memory` — NamedEntity/Relations/Memory guidance (skeleton).
- `urbot-prompt` — persona/objective/behaviour guidance (skeleton).
- `urbot-verification` — compile/test/regression guidance; read-only reporting path in Phase 1.

New workflows, following the existing flat Markdown convention:

- `workflows/urbot-bootstrap.md` — new project/bot; read-only inspection path in Phase 1.
- `workflows/urbot-profile-change.md` — skeleton.
- `workflows/urbot-tool-development.md` — skeleton.
- `workflows/urbot-domain-memory.md` — skeleton.
- `workflows/urbot-prompt-tuning.md` — skeleton.
- `workflows/urbot-verification.md` — read-only verification path in Phase 1.

The `urbot-discovery` read-only implementation lives in
`skills/urbot-discovery/scripts/inspect.mjs` and is invoked by `generator/urbot/inspect.mjs`. The fetch and
route modules live in `generator/urbot/`, dispatched from `generator/manna.mjs` under the `urbot` namespace.
The old generator commands remain deprecated.

*Alternative considered:* new top-level workflow directories with `README.md` files. Rejected to match the
existing `workflows/*.md` convention and the retained `workflows/routing/pipeline.json` shape.

### D4. Discovery output contract

The read-only report always contains:

```text
Project / Source / Commit / Profiles / Target profile /
Bot package / Persona / Objective / Domain types / Tools
```

Missing values are reported as absent, never invented. The report is the router's input context; it does not
copy the Urbot domain model.

### D5. Minimal, optional run state

By default, Phase 1 writes no state. With explicit opt-in, `.manna-run/<run-id>.json` may contain only:
`runId`, `repository`, `resolvedCommit`, `targetProfile`, `request`, `route`, `skills`, `changedFiles`,
`commands`, `status`. It must not contain a domain copy or source hashes. `.manna-run/` is ignored by
`.gitignore` and is never a source of truth.

### D6. Golden routing evals

Five evals under `evals/golden/`:

1. `urbot-bootstrap.eval.json` — new project/bot.
2. `urbot-profile-prompt.eval.json` — profile and prompt requests (multiple cases).
3. `urbot-tool.eval.json` — Tool/MCP/Subagent/Reference.
4. `urbot-domain-memory.eval.json` — NamedEntity/Relations/Memory.
5. `urbot-verification.eval.json` — test/compile/regression.

Fixtures live under `evals/fixtures/urbot/` and hold a request plus a minimal project context. A runner
`scripts/dev/test-routing.mjs` executes every eval/fixture, compares the selected workflow to the expected
route, asserts the routing table covers all six intents, and fails on any mismatch. It runs from `npm test`.

The profile/prompt eval uses a `cases` array (profile → `urbot-profile-change`, prompt →
`urbot-prompt-tuning`) so the five-file budget still covers both routes.

### D7. Keep manifests and the positioning check consistent

Adding skill directories requires updates to `skills.json`, `.well-known/agent-skills/index.json`,
`policies/modes.json`, `workflows/routing/pipeline.json`, and `skills.lock`. The `AGENTS.md`/`README.md`
inventories and `scripts/dev/check-positioning.mjs` must classify the six new skills and six new workflows,
otherwise `npm test` fails. Phase 1 discovery and verification use `suggest` mode; the writing-oriented
skeletons use `review`.

## Risks / Trade-offs

- **Shallow clone cannot check out arbitrary commits** → Accept branch/tag refs only; record the resolved
  commit for stability. Deeper history is a later need.
- **Tag detection adds a remote lookup** → Use `git ls-remote --tags` once; if it fails, fall back to branch
  handling and still record the commit.
- **A read-only router can still be tempted to write run state** → Make state opt-in, keep the default path
  write-free, and gitignore `.manna-run/`.
- **Skeletons can drift from later workflows** → Give each skeleton explicit inputs, checkpoints, and output
  sections now; later changes fill in behavior without renaming.
- **Adding skills breaks the positioning check and manifests** → Treat manifest/inventory updates as part of
  the change, not follow-up cleanup.
- **Phase 1 verification could be confused with real verification** → Limit it to reporting state and
  commands; do not edit source or claim a build passed unless it ran.

## Migration Plan

1. Add the `urbot` CLI namespace and fetch/inspect/route modules.
2. Add the six skill skeletons; implement discovery read-only.
3. Add the six workflow skeletons and routing pipeline entries; implement the read-only bootstrap and
   verification paths.
4. Add the five evals, fixtures, and routing runner.
5. Update manifests, inventories, positioning check, `.gitignore`, and the kit lock.
6. Roll back by removing the new `urbot` namespace, skills, workflows, evals, and manifest entries; the
   deprecated generator path is unaffected.

## Open Questions

None blocking. How later phases persist run state, and whether verification eventually runs builds, is
deferred to the change that introduces write workflows.
