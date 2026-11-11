# Proposal

## Why

The repositioning change made Urbot the authoritative source but did not yet give Manna a usable Phase 1
entry point. Before any workflow is allowed to modify Urbot, we need to prove that natural-language routing is
valuable and safe. This change delivers a **read-only inspect-and-route** path: fetch a pinned Urbot checkout,
record the resolved commit, inspect the project, classify the request, and hand off to the right workflow
without touching Urbot files.

## What Changes

- **Remote fetch** via `manna urbot init --repo https://github.com/jifffffy/urbot --ref <ref> --dir <dir>`:
  `git clone --depth=1 --single-branch --branch <ref> <repo> <dir>`, then
  `git -C <dir> rev-parse HEAD` to record the resolved commit.
- **Tag-first resolution**: prefer a tag (`refs/tags/vX.Y.Z`); when no tag matches, treat the ref as a branch
  and record the branch plus the resolved commit. Always print the resolved commit.
- **Optional source record**: `.manna-run/source.json` with `repository`, `requestedRef`, `resolvedCommit`,
  and `fetchedAt`. This is not a second project spec, does not lock Urbot source, and is not created by
  default; Phase 1 may print the commit only.
- **No GitHub Template API** as an update mechanism and **no Manna merge engine**.
- **Router (8 steps)** documented in `design.md`: confirm target directory → missing directory routes to
  `urbot-bootstrap` → existing directory reads Git and project state → identify target profile → classify one
  intent → select one workflow → output target files and verification commands → hand control to the workflow.
- **Routing table**:
  - new project or bot → `urbot-bootstrap`
  - new/modify profile → `urbot-profile-change`
  - modify persona/objective/behaviour → `urbot-prompt-tuning`
  - add Tool/MCP/Subagent/Reference → `urbot-tool-development`
  - add NamedEntity/Relations/Memory → `urbot-domain-memory`
  - test/compile/regression → `urbot-verification`
  - ambiguous → read the project, then ask one precise question
- **Six skill skeletons** with `SKILL.md`, `references/`, and `scripts/`: `urbot-discovery`,
  `urbot-profile`, `urbot-tool`, `urbot-domain-memory`, `urbot-prompt`, `urbot-verification`. Only
  `urbot-discovery` is implemented read-only in Phase 1; the rest are skeletons and documentation.
- **Six workflow skeletons** plus routing pipeline entries: `urbot-bootstrap`, `urbot-profile-change`,
  `urbot-tool-development`, `urbot-domain-memory`, `urbot-prompt-tuning`, `urbot-verification`. Only
  `urbot-bootstrap` and `urbot-verification` expose read-only Phase 1 paths.
- **Read-only discovery output**: Project / Source / Commit / Profiles / Target profile / Bot package /
  Persona / Objective / Domain types / Tools.
- **Minimal state**: no state by default. Optional `.manna-run/<run-id>.json` with `runId`, `repository`,
  `resolvedCommit`, `targetProfile`, `request`, `route`, `skills`, `changedFiles`, `commands`, and `status`.
  It is not a source of truth, does not copy domain data, does not hash Urbot source, does not replace Git,
  and is gitignored by default.
- **Five golden routing evals**: new project, profile/prompt, tool, domain/memory, and verification requests,
  with a routing runner that proves each request lands on the expected workflow.

## Capabilities

### New Capabilities

- `urbot-inspect-and-route`: defines the remote fetch and resolved-commit contract, the 8-step read-only
  router and routing table, the six skill/workflow skeletons, the discovery output fields, optional run state,
  and golden routing verification.

### Modified Capabilities

None. `manna-urbot-orchestrator` already defines the authority and asset-disposition rules; this change adds
the Phase 1 inspect-and-route behavior without changing those requirements.

## Impact

- **CLI**: adds `manna urbot init` and `manna urbot inspect`; the existing `manna init|slice|validate|lock`
  commands remain deprecated and untouched.
- **New assets**: `skills/urbot-{discovery,profile,tool,domain-memory,prompt,verification}/`,
  `workflows/urbot-{bootstrap,profile-change,tool-development,domain-memory,prompt-tuning,verification}.md`,
  routing entries in `workflows/routing/pipeline.json`, and five golden routing evals with fixtures.
- **Implementation modules**: `generator/urbot/` for fetch, inspect, and route; a routing eval runner used by
  `npm test`.
- **Manifests**: `skills.json`, `.well-known/agent-skills/index.json`, `policies/modes.json`, and
  `skills.lock` must include the new skills so `npm run validate` and installs stay consistent.
- **Docs and inventory**: `AGENTS.md`, `README.md`, and the positioning check must classify the new assets.
- **State**: add `.manna-run/` to `.gitignore`; the default inspect path writes nothing.
- **Out of scope**: implementing real modification workflows, long-lived state, copying the Urbot domain
  model, hashing Urbot source, replacing Git, the GitHub Template API, and a Manna merge engine.
