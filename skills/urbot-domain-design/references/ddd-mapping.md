# DDD Mapping for Urbot

Map the color model to DDD, then to Urbot's Java conventions.

## Mapping table

| Color | DDD variant | Urbot artifact |
|-------|-------------|----------------|
| Pink moment-interval | Aggregate root or entity | `NamedEntity` interface in the bot `domain/` package |
| Yellow role | Role value object or entity | Record (no identity) or `NamedEntity` interface (identity) |
| Green party/place/thing | Entity or aggregate root | `NamedEntity` interface |
| Blue description | Value object or catalog entity | Record, or `NamedEntity` interface for a catalog |
| Milled attribute | Value object | Record |
| Event | Domain event | Record in `domain/events/` |
| Cross-aggregate behavior | Domain service | Class in the bot package |

## Aggregate rules

- One aggregate root per consistency boundary.
- A transaction changes one aggregate.
- References across aggregates use identifiers, not object graphs.
- Invariants that span objects belong to one aggregate, or to a domain service when they cross aggregates.
- Repositories exist only for aggregate roots.

## Entity vs value object

Use an entity when identity and lifecycle matter. Use a value object when equality is defined by its values and
the object is replaceable.

- `Trip` has identity and a lifecycle → entity/aggregate root.
- `Traveler` has identity → entity; a `TravelerProfile` snapshot would be a value object.
- `DateRange(start, end)` is replaceable and value-equal → value object.
- `Itinerary(notes)` attached to one trip → value object.

## Urbot conventions

- Aggregate roots/entities are `NamedEntity` interfaces under
  `src/main/java/com/embabel/bot/<bot>/domain/`.
- Value objects and events are Java records.
- Add `urbot.memory.entity-packages=com.embabel.bot.<bot>` to `application-<bot>.properties` so entity types
  enter the data dictionary.
- Use `NamedEntityDataRepository` for persistence; never add a second repository or ORM layer.
- Generate tests for the domain vocabulary (data dictionary), value objects, and record shape.
- Keep the domain vocabulary inside the bot package; do not copy it elsewhere.

## Generated shape

```java
public interface Trip extends NamedEntity {
    LocalDate startDate();
    Traveler traveler();
    List<Destination> destinations();
}
```

```java
public record DateRange(LocalDate start, LocalDate end) {
    public DateRange {
        if (start == null) throw new IllegalArgumentException("start is required");
        if (end == null) throw new IllegalArgumentException("end is required");
    }
}
```

```java
public record TripPlanned(String tripId, Instant occurredAt) {}
```

## Memory boundary

Domain design stops at the domain model. Propositions, projections, and recall policy belong to
`urbot-domain-memory` and run as a separate workflow.
