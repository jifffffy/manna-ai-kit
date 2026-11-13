# Design

## Context

See `proposal.md` — Why. `generator/urbot/simple-init.mjs` currently parses a request, copies the kit, ensures a
checkout, and calls `inspectCommand`. `generator/urbot/init.mjs` already provides the shallow clone
(`git clone --depth=1 --single-branch --branch <ref>`) and rejects a non-empty target. The Urbot repository ships
its own `AGENTS.md` with operational knowledge that must not be lost.

OpenCode loads `AGENTS.md` from the workspace upward and does not load arbitrary files. Manna therefore owns the
single `AGENTS.md` instead of adding a second instruction file or an `opencode.json` indirection.

## Goals / Non-Goals

**Goals:**

- One required argument: the project directory.
- One directory: the project root is the Urbot checkout and the Manna workspace.
- Exactly one `AGENTS.md`, owned by Manna, containing the Urbot operations that matter.
- Manna carries the build/run/test steps for Urbot.
- Keep the router and `manna urbot inspect` behavior, adding only build/run/test triggers.

**Non-Goals:**

- Nested `urbot/` checkouts, a separate workspace root, or a second instruction file.
- Preserving the Urbot `AGENTS.md` verbatim; its necessary content is ported instead.
- Committing the kit files into the project repository.
- Launching OpenCode from the CLI.

## Decisions

### D1. Required positional project, resolved as a directory path

`parseArgs` accepts exactly one positional token and treats it as the project path (`path.resolve`), so
`manna init demo` → `./demo` and `manna init ../demo` → that parent directory. Missing and extra positionals are
errors. `--workspace`, `--dir`, and `--force` are removed from `init`: the positional is the target, copying
always overwrites kit-owned files, and `manna urbot init --dir` remains the checkout-only command.

*Alternatives considered:* keep `--workspace` as an alias (rejected — two ways to name the same directory);
default to the current directory (rejected by the confirmed contract — the name is mandatory).

### D2. Clone, reuse, or reject before any kit write

Order:

1. Parse arguments (no writes on error).
2. Reject `project === KIT_ROOT`.
3. If the target is missing or an empty directory → `initCommand({ repo, ref, dir: target })` (clone at the
   latest tag, falling back to `main`).
4. If the target is non-empty and passes `isUrbotCheckout` (`.git`, `pom.xml`,
   `src/main/java/com/embabel/urbot`) → reuse and read the origin URL and commit.
5. Otherwise → fail with `Target directory is not a Urbot checkout: <dir>` and write nothing.

### D3. Kit is copied into the project root with overwrite semantics

`copyWorkspaceKit(root)` drops the `checkout` and `force` options. Every file in the copy set is written
unconditionally; an existing file at a kit path is replaced. Files outside the copy set are untouched. This makes
re-running `init` a refresh, so no `--force` flag is needed.

`relativeProject` becomes `.` and the `{{URBOT_PROJECT}}` placeholder is replaced with `.`; the template text
changes from `./urbot` to the project root. The copy set is unchanged otherwise.

### D4. `AGENTS.md` is deleted and rewritten from the Manna template

`copyWorkspaceKit` SHALL remove the existing `AGENTS.md` (when present) and write
`generator/urbot/workspace-agents.md` as `AGENTS.md`. This is a full replacement, not a merge and not a marked
section. The write is part of the normal overwrite copy, so re-running `init` refreshes it with no extra flag.

The template SHALL absorb these Urbot sections, rewritten for the merged layout (project root is the checkout):

1. **Build and run** — Neo4j via `docker compose up -d` (Bolt 7891, HTTP 8892), provider activation by exported
   key (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`), `./mvnw spring-boot:run`,
   `-Dspring-boot.run.profiles=<bot>`, `aot.sh` needs plain `mvn`, Java 24+, and deletes `target/` and
   `extracted/`.
2. **Tests** — `./mvnw test`, `./mvnw -Dtest=<ClassName>Test test`, `*IT.java` excluded from compilation and
   Surefire, integration tests need live Neo4j and a key, `TemplateRenderingTest` after prompt changes,
   `ByokFactoryClasspathTest` for Embabel version skew, smoke startup after dependency bumps.
3. **Extension model** — core `com.embabel.urbot` vs `com.embabel.bot.<name>`, `@Profile` gating,
   `urbot.bot-packages`, `BotPackageScanConfiguration` and `PropositionConfiguration`, tool bean collection by
   `ChatActions`, entity extraction for `NamedEntity` via `urbot.memory.entity-packages`, `urbot.chat.*`
   config keys, prompt template resolution.
4. **RAG and memory scoping** — `context` metadata, `<userId>_<contextName>` personal scope, literal `global`,
   `RagConfiguration.globalDocuments` and `UrbotUser.references()` filters.
5. **Gotchas** — `alice` / `ben` with password `test`, `NullRequestCache`, disabled Neo4j actuator health, MCP
   client default and the Brave Docker dependency, explicit `jspecify`, Spring Security 7
   `PathPatternRequestMatcher`.
6. **Manna workspace guidance** — layout, start at `skills/urbot-router`, workflows, OpenCode `opsx` commands,
   tool safety, no second runtime, review in Git.

*Alternatives considered:* keep the Urbot `AGENTS.md` and append a section (rejected by the user — Manna owns
the whole process); `MANNA.md` plus `opencode.json` `instructions` (rejected — one file); overwrite without
porting (rejected — loses the operations and gotchas).

### D5. Manna owns build/run/test guidance

The build/run/test knowledge is also added to the `urbot-verification` skill and workflow, so it is available
during verification requests and can be kept current in one place:

- compile: `./mvnw -q -DskipTests compile`;
- tests: `./mvnw -q test`; single test: `./mvnw -Dtest=<ClassName>Test test`;
- integration boundary: `*IT.java` excluded, needs live Neo4j and a key;
- prompt changes: run `TemplateRenderingTest`;
- run: `docker compose up -d` and a provider key exported before startup;
- profile run: `./mvnw spring-boot:run -Dspring-boot.run.profiles=<bot>`;
- `aot.sh` caveats.

The `AGENTS.md` file carries the summary and points at `skills/urbot-verification`. Router triggers add `build`,
`run`, `start`, `构建`, `运行`, `启动` to the existing `test`/`compile` route.

*Alternative considered:* a new `urbot-runtime` skill (rejected — a ninth skill, manifest, mode, and eval churn
for content that belongs to verification).

### D6. Ignore run state without touching tracked files

In a Git checkout, append `.manna-run/` to `.git/info/exclude` (local, untracked). Do not edit `.gitignore`.
If the target is not a Git repository, create a `.gitignore` with the local entries. No `urbot/` entry is needed
because there is no nested checkout.

### D7. Output shape

`{ workspace, kit, source, entry, next }` where `workspace` is the absolute project path, `entry` is always
`AGENTS.md`, and `next` is `Open <workspace> in OpenCode to start work`. No `inspection`.

### D8. Tests

`scripts/dev/test-simple-init.mjs`:

- `init demo` from an empty temp parent: `demo/` is the checkout (`demo/pom.xml`), kit files at `demo/`, no
  `demo/urbot`, source commit matches the tag;
- missing name and non-Urbot non-empty targets fail without writes;
- the fixture `AGENTS.md` is fully replaced, with no leftover fixture text;
- the replacement contains the ported operations: `docker compose`, `7891`, `./mvnw`, `TemplateRenderingTest`,
  `urbot.bot-packages`, `context`, `NullRequestCache`, `DummyUrbotUserService`;
- a second run rewrites `AGENTS.md` idempotently and creates no `MANNA.md`;
- a modified kit file is restored on the next run, and a user file outside the copy set is untouched;
- `.gitignore` is unchanged and `.git/info/exclude` contains `.manna-run/`;
- the kit-root guard fails cleanly;
- router eval: "build", "run", "test" requests select `urbot-verification`;
- help text and `URBOT_REPO` assertions stay.

### D9. Docs and specs

README (quick start, layout tree, CLI reference, single Manna-owned `AGENTS.md`), the kit `AGENTS.md` (CLI and
verification section), docs/architecture.md, the three delta specs, and `skills.lock`.

## Risks / Trade-offs

- **Urbot's `AGENTS.md` is deleted** → Everything still needed is ported into the template; the content-coverage
  assertions in the init test guard against silent loss, and the Urbot repository remains the source of truth
  for new behavior.
- **`AGENTS.md` becomes dirty in Git** → It is the one intentional tracked edit; the full replacement is a
  reviewable diff.
- **Kit files appear as untracked in the Urbot repo** → Expected for a workspace; they are not ignored, so the
  user can review and commit them on a branch.
- **Overwrite clobbers local edits to kit files** → Kit paths are reserved and always refreshed; user edits
  belong outside the copy set or in the Urbot source.
- **Ported guidance drifts from Urbot** → `urbot-verification` and `AGENTS.md` tell the reader to re-check the
  source; `AGENTS.md` is a map, not the authority.
- **Router trigger collisions** → `build`/`run` are added only to the verification route; golden evals cover the
  known intents.
- **Breaking CLI change** → Usage and error messages name the new form; `manna urbot inspect` covers routing.

## Migration Plan

1. Require the project argument; remove `--workspace`/`--dir`/`--force` from `init`.
2. Add clone/reuse/reject ordering before the kit copy.
3. Make the project root the checkout in `copyWorkspaceKit`; replace `./urbot` in the template with `.`.
4. Replace `AGENTS.md` wholesale in the copy; drop `MANNA.md` and `opencode.json`.
5. Port the Urbot operations and gotchas into `generator/urbot/workspace-agents.md`.
6. Add build/run/test guidance to `urbot-verification`, the workflow, and the router triggers.
7. Add `.git/info/exclude` handling.
8. Remove `inspectCommand` from `init`; return `{ workspace, kit, source, entry, next }`.
9. Update tests, README, AGENTS, architecture, and the three specs; run `npm run lock`.
10. Verify with `npm run validate`, `npm run lock:check`, `npm test`, and
    `openspec validate init-project-workspace --strict`.
11. Roll back by restoring the request-based init, the preserved Urbot `AGENTS.md`, and the nested-checkout
    workspace copy.

## Open Questions

None.
