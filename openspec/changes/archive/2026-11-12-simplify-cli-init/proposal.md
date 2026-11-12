# Proposal

## Why

The current first-run path asks for `--repo`, `--ref`, and `--dir` on `manna urbot init`, then asks for a
second `manna urbot inspect` call with the request. The Urbot repository is fixed, so this ceremony adds no
value for the common case. The primary command should be one step: `manna init "<request>"`.

## What Changes

- **Add a one-step `init "<request>"` command.**
  - Use the fixed repository `https://github.com/jifffffy/urbot` by default.
  - Default the ref to the latest semver tag, falling back to `main`.
  - Default the checkout directory to `./urbot` (relative to the current working directory).
  - Reuse an existing valid Urbot checkout; clone only when it is missing.
  - After the checkout is available, run the existing read-only discovery and router, then print the source
    record and the selected workflow, skills, target files, verification commands, and any question.
- **Use the existing `manna` binary**: the command is `manna init "<request>"`; no extra CLI alias is added.
- **Keep explicit control available**: `manna urbot init` and `manna urbot inspect` remain for advanced use.
  The simple `init` may accept optional `--repo`, `--ref`, `--dir`, and `--write-state` overrides for forks,
  tests, or state recording, but none are required for the common path.
- **Do not auto-apply**: the simple `init` fetches and routes only. It does not modify Urbot source and does
  not start a write workflow; the existing checkpoints and apply workflow remain explicit.
- **Update the Urbot-only guard**: allow the new top-level `init` command while still rejecting the retired
  generator commands `slice`, `validate`, `lock`, and `generator/lib`.
- **Update help and docs**: show `manna init "<request>"` as the primary quick start; keep the advanced
  commands documented below it.
- **Add tests**: use a local Git repository with a tag to verify fixed-repo defaults, latest-tag selection,
  checkout reuse, route output, and read-only behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `urbot-inspect-and-route`: adds the simplified `init "<request>"` entry point and its defaults while keeping
  the existing fetch, tag-first, inspect, and routing behavior.

## Impact

- **CLI**: `generator/manna.mjs` gains the top-level `init` case; `generator/urbot/` gains the default-ref and
  checkout-reuse path.
- **Package**: `package.json` adds the new test script; the bin stays `manna`.
- **Guard**: `scripts/dev/check-urbot-only.mjs` must permit the new `init` while still rejecting the retired
  generator commands.
- **Docs**: `AGENTS.md`, `README.md`, and `docs/architecture.md` show the one-step command.
- **Tests**: a new local-repository test wired into `npm test`; `skills.lock` is regenerated.
- **Out of scope**: automatic application of the routed workflow, a second runtime, and changes to the
  existing workflow behavior.
