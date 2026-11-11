---
name: urbot-domain-design
description: Discover a Urbot bot domain with Java Modeling in Color and implement it with DDD.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - policies/approval-checkpoints.md
  - workflows/routing/pipeline.json
---

# Urbot Domain Design

## When to use

A request asks to discover, model, or implement a Urbot bot domain: entities, roles, moments, descriptions,
relationships, aggregates, value objects, or domain events. The bot profile must already exist; if it does not,
route to `urbot-profile-change` first.

This skill designs and implements the domain. Memory propositions and recall belong to
`urbot-domain-memory` and run as a separate workflow.

## Inputs

- The target Urbot checkout and bot.
- The domain request and its ubiquitous language.
- Existing `src/main/java/com/embabel/bot/<bot>/domain/` types.
- An approved domain model for the script.

## Color modeling

Use Java Modeling in Color to discover the domain:

| Color | Archetype | Discovery question | DDD result |
|-------|-----------|--------------------|------------|
| Pink | Moment-interval | What happens over time? | Aggregate root or entity |
| Yellow | Role | How does a party/place/thing participate? | Role value object, or entity with identity |
| Green | Party/place/thing | Who or what is durable in the domain? | Entity or aggregate root |
| Blue | Description | What describes or catalogs a thing? | Value object or catalog entity |
| Milled | Attribute | What simple values are carried? | Value object/record |

Every candidate gets exactly one color. Capture responsibility, attributes, relationships, cardinalities,
invariants, and ubiquitous-language terms. See `references/color-modeling.md`.

## DDD model

Map the color model to DDD:

- one bounded context per bot profile;
- one root and one consistency boundary per aggregate;
- entities/aggregate roots as `NamedEntity` interfaces;
- value objects and domain events as records;
- domain services for cross-aggregate behavior;
- repositories through Urbot's `NamedEntityDataRepository`, never a second persistence layer.

See `references/ddd-mapping.md`.

## Process

1. **Discover** — read the project, existing domain types, and the request.
2. **Color** — classify candidates and build the color table.
3. **Model** — map colors to DDD, set aggregate boundaries, invariants, and events.
4. **Approve** — stop at `CHECKPOINT: DOMAIN`. Show the color model, DDD model, target files, and invariants.
5. **Apply** — after approval, run the script:

   ```bash
   node skills/urbot-domain-design/scripts/apply.mjs \
     --project <urbot-checkout> \
     --bot <bot> \
     --model <domain-model.json> \
     --approve
   ```

   Add `--force` only to replace existing generated files.

6. **Verify** — run `urbot-verification`:
   `./mvnw -q -DskipTests compile` and `./mvnw -q test`.
7. **Hand off** — if memory behavior is requested, stop and report `urbot-domain-memory` as the next separate
   workflow.

## Generated artifacts

```text
src/main/java/com/embabel/bot/<bot>/domain/<Entity>.java
src/main/java/com/embabel/bot/<bot>/domain/<ValueObject>.java
src/main/java/com/embabel/bot/<bot>/domain/events/<Event>.java
src/main/java/com/embabel/bot/<bot>/domain/<Service>.java
src/test/java/com/embabel/bot/<bot>/domain/<Name>Test.java
src/main/resources/application-<bot>.properties
```

The properties file gains `urbot.memory.entity-packages=com.embabel.bot.<bot>` so the domain types enter the
data dictionary.

## Output

A domain report with the color model, DDD model, aggregate boundaries, invariants, created/skipped files,
entity package, generated tests, and verification results.

## Checkpoints

`CHECKPOINT: DOMAIN` approves the color model, DDD model, entities, value objects, events, services, and
invariants. It never approves memory propositions, tools, or framework edits.

## Do not

- Create a second domain model, repository, or persistence layer.
- Put domain types outside the bot package.
- Write memory propositions or projections here.
- Skip the color model or the DDD mapping.
- Write before `CHECKPOINT: DOMAIN`.
