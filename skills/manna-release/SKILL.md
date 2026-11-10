---
name: manna-release
description: Version, lock, verify and package a manna-generated project or the kit itself.
version: 0.1.0
mode-default: suggest
requires:
  - policies/approval-checkpoints.md
  - workflows/quality-gate.md
  - shared/patterns/generation-invariants.md
---

# Manna Release

## When to use

- The user asks to release, version, tag or publish.
- The kit itself changes and needs a lock refresh.

## Process

### For the kit
1. `npm run validate`
2. `npm test`
3. `npm run lock`
4. `npm run lock:check`
5. Confirm `package.json`, `skills.json`, `.claude-plugin/plugin.json` and
   `.well-known/agent-skills/index.json` versions agree.

### For a generated project
1. Run `workflows/quality-gate.md`.
2. Bump the version in `pom.xml` and `.manna/project.spec.json`.
3. `node generator/manna.mjs lock <project>`
4. `node generator/manna.mjs validate <project>`
5. Update `CHANGELOG.md`.
6. Tag only from a clean tree.
7. Publish only after the safety review.

## Output

```text
Version: 0.1.0 → 0.2.0
Kit validate: pass
Kit test: pass
Kit lock: fresh
Project validate: pass
Safety: pass
Tag: v0.2.0
```

## Do not

- Bump one manifest and not the others.
- Publish with a stale lock.
- Release with unverified external-write tools.
- Tag from a dirty tree.
