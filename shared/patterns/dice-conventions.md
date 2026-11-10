# DICE Memory Conventions

DICE turns conversation into durable propositions. Manna uses it for user preferences, constraints and
goals that should survive a session, not for replaying whole transcripts.

## What to remember

Good proposition types:

- `User LIKES <entity>`
- `User PREFERS <attribute>`
- `User DISLIKES <entity>`
- `User HAS_GOAL <goal>`
- `User HAS_CONSTRAINT <constraint>`

Do not store:

- transient requests ("find me a recording now"),
- facts already in the graph,
- sensitive attributes the capability does not need,
- model speculation without evidence.

## Schema

Every proposition declares subject, predicate, object, confidence and decay. Confidence below the
configured minimum is not recalled. Decay is measured in days; zero means no decay.

## Extraction

- Window messages, overlap windows, and deduplicate by proposition identity.
- Resolve entities in cost order: exact → heuristic → embedding → LLM.
- Skip extraction if fewer than two messages exist.
- Extraction runs async and must never break the chat path.

## Recall

- Limit to top-N by `effectiveConfidence`.
- Include only propositions relevant to the current capability context.
- Surface recalled memory to the user when it drives a recommendation.

## Write and delete

- Project propositions into semantic graph relationships only when the capability queries them.
- Support soft delete and a user-facing "forget" operation.
- Never resurrect a deleted proposition on the next extraction.

## Evaluation

Track precision of extracted propositions on a seeded conversation. A memory system that confidently
remembers wrong facts is worse than no memory.
