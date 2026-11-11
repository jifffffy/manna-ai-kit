# Java Modeling in Color

Java Modeling in Color (Coad) gives a small discovery vocabulary. Use it before choosing DDD building blocks.

## Archetypes

### Pink — moment-interval

Something that happens over time, has a beginning/end, or is a business moment.

- Questions: What events or intervals does the business care about? What is scheduled, booked, planned, or
  completed?
- Typically becomes an aggregate root or entity.
- Sample: `Trip`, `Booking`, `Order`, `Subscription`.

### Yellow — role

How a party, place, or thing participates in a moment-interval.

- Questions: Who plays which role? Does the role have its own identity or is it a value?
- Becomes a role value object when it has no identity; becomes an entity when it must be referenced and
  identified on its own.
- Sample: `Traveler`, `Organizer`, `Approver`, `Customer`.

### Green — party, place, or thing

A durable actor, place, or thing in the domain.

- Questions: Who or what exists independently of a single moment? What must be referenced across moments?
- Typically becomes an entity or aggregate root.
- Sample: `Person`, `Destination`, `Hotel`, `Vehicle`.

### Blue — description

A description, catalog entry, type, or template.

- Questions: What describes or classifies another thing? Is it a reusable catalog or a value attached to one
  object?
- Becomes a value object when it is attached to one object; becomes a catalog entity when it has its own
  lifecycle.
- Sample: `Itinerary`, `Preference`, `Policy`, `RoomType`.

### Milled — attribute

A simple value carried by another object.

- Questions: What amounts, dates, ranges, codes, or measures appear repeatedly?
- Becomes a value object/record.
- Sample: `Money`, `DateRange`, `Address`, `Duration`.

## Discovery questions

1. What moment-intervals does the request describe?
2. Who or what participates in each, and in what role?
3. What durable parties, places, or things are referenced?
4. What descriptions or catalogs classify them?
5. What attributes are reused and deserve a value object?
6. What are the relationships and cardinalities?
7. What must always be true (invariants)?
8. What words does the domain use, and which synonyms must be resolved?

## Relationship notation

```text
Trip 1 --- * Destination
Trip 1 --- 1 Traveler
Trip 1 --- 1 DateRange
```

Use identifiers for cross-aggregate references. Keep a single aggregate's relationships as object references
inside its boundary.

## Sample color table

| Class | Color | Responsibility | DDD variant |
|-------|-------|----------------|-------------|
| Trip | Pink moment-interval | A planned journey | Aggregate root |
| Traveler | Yellow role | The person planning the trip | Entity |
| Destination | Green party/place/thing | A place to visit | Entity |
| Itinerary | Blue description | The ordered plan for a trip | Value object |
| DateRange | Milled attribute | Inclusive travel dates | Value object |
| TripPlanned | Event | A trip was planned | Domain event |

## Smells

- Two colors for one class: split the responsibilities or choose the dominant lifecycle.
- A role with its own repository: it probably has identity and is an entity, not a value object.
- A description with a lifecycle and many references: it is a catalog entity, not a value object.
- A moment-interval with no invariant: ask what must be true when it starts or ends.
