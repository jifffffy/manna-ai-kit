---
name: urbot-discovery
description: Inspect a Urbot checkout read-only and report project, source, commit, profiles, prompts, domain types, and tools.
version: 0.1.0
mode-default: suggest
requires:
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
  - docs/architecture.md
---

# Urbot Discovery

## When to use

At the start of every Urbot request, before routing or planning. It is the only Phase 1 skill that reads the
project and produces the context the router needs.

## Inputs

- The Urbot project directory.
- The user's natural-language request, used only to infer the target profile.

## Process

1. Read Git metadata without writing: remote URL, `HEAD`, and status.
2. Read profiles from `src/main/resources/application-*.properties|yml` and
   `src/main/java/com/embabel/bot/*/`.
3. Infer the target profile from the request; if it cannot be inferred, leave it absent.
4. Read `urbot.chat.persona` and `urbot.chat.objective` from the authoritative configuration files.
5. Read domain types from `src/main/java/com/embabel/bot/<profile>/domain/`.
6. Read tool classes from `src/main/java/com/embabel/bot/<profile>/**/*Tools.java`.
7. Report the fields below and hand them to the router.

## Output

```text
Project / Source / Commit / Profiles / Target profile /
Bot package / Persona / Objective / Domain types / Tools
```

Missing values are reported as absent, never invented.

## Checkpoints

No write checkpoint. Discovery is read-only in every phase.

## Do not

- Write project files, run mutating Git commands, or create `.manna-run/` unless explicitly asked.
- Copy the Urbot domain model, hash Urbot source, or treat the report as a source of truth.
- Guess a profile or invent a domain type.

## References

- `scripts/inspect.mjs` — the read-only inspector used by `manna urbot inspect`.
- `references/README.md` — how to extend the report without adding writes.
