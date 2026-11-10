# Workflow: Release

**Goal:** produce a reproducible version with a fresh lock and changelog.

## Steps

1. Run `workflows/quality-gate.md` and keep the report.
2. Bump the version in `pom.xml` and `.manna/project.spec.json`.
3. Regenerate the project lock:
   `node generator/manna.mjs lock <project>`.
4. Run `node generator/manna.mjs validate <project>` and `npm run lock:check` (for the kit).
5. Update `CHANGELOG.md` with capability slices, tools, migrations and known issues.
6. Tag the release.
7. Publish only after the safety review passes.

## Gates
- No uncommitted generated drift.
- No obsolete `pending` data applied without review.
- No secrets in the repo or build artifacts.
- Rollback instructions exist for graph/data changes.

## Do not
- Release from a dirty tree.
- Bypass the lock because "it's just a small change".
- Publish with unverified external-write tools.
