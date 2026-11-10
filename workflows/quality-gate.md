# Workflow: Quality Gate

**Goal:** prove a change is safe before release.

## Ordered checks

Run in this order; stop on the first failure.

1. **Spec** — `node generator/manna.mjs validate <project>`:
   - project and feature specs present,
   - `designMode` explicit,
   - `.manna/domain.json` matches the specs,
   - no duplicate entity across slice packages, no conflicting relation shape,
   - tool side effects complete,
   - vertical flags explicit,
   - no UI/Vaadin/admin references,
   - lock fresh.
2. **Compile** — `./mvnw -q -DskipTests compile` (or `mvn`).
3. **Contract tests** — `./mvnw -q test`.
4. **Integration tests** — `./mvnw -q test -DexcludedGroups= -Dtest="**/*IT"` only if the environment has
   Neo4j, LLM keys and network.
5. **Behavior evals** — run the capability golden evals with a live agent.
6. **Safety review** — every new or changed tool:
   - side effect declared,
   - external write idempotent or dry-run,
   - destructive requires explicit approval,
   - no secrets in repo.
7. **Drift check** — generated files match the spec and lock.

## Report

```text
Capability: F-00X
Spec: pass
Compile: pass
Contract tests: 12/12
Integration: skipped (no live Neo4j)
Behavior evals: 3/4 (one flaky, rerun)
Safety: pass
Drift: pass
Open: ...
```

## Do not
- Mark a check "pass" without running it.
- Skip integration tests silently; state why.
- Treat a rerun-until-green flaky test as passing.
