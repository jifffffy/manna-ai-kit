# Legacy Manna Generator

This directory holds the retired Manna project generator and its assets:

- `templates/agent-core/` — the generated Spring Boot application template
- `generator/` — the old `init`/`slice`/`validate`/`lock` commands and their `lib/`
- `examples/` — the generated example spec and slices
- `scripts/` — the legacy generator and generated-compile tests
- `evals/golden/` — the retired generator golden evals
- `shared/schemas/` — the retired project, capability, graph, memory, and pipeline schemas

**Status:** historical reference only.

- It is not shipped in the package (`package.json` `files` excludes it).
- The main path does not import or require it.
- It is scheduled for deletion after one release.

The product path is Urbot orchestration: `generator/manna.mjs` (`manna urbot init|inspect`),
`generator/urbot/`, `skills/urbot-*`, and `workflows/urbot-*`.

To inspect the historical tests, run them from this directory:

```bash
node legacy/scripts/test-generator.mjs
# Requires JDK 21+ and network for the legacy compile test:
node legacy/scripts/test-generated-compile.mjs
```
