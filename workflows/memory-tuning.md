# Workflow: Memory Tuning

**Goal:** make DICE memory useful and safe for one capability.

## Steps

1. **Decide whether memory is needed.** If the capability can answer from the graph or a live tool, set
   `memory.enabled: false` with a reason.
2. **Choose proposition types** from `shared/patterns/dice-conventions.md`. Project them onto the same
   entity/relation vocabulary as `.manna/domain.json`; do not create a parallel memory model. Avoid
   transient requests.
3. **Define recall**: limit, order, minimum confidence, context scope.
4. **Define extraction**: window, overlap, trigger interval, entity resolution order.
5. **Define retention**: decay days, soft delete, user-forget path.
6. **Stop at `CHECKPOINT: MEMORY`.**
7. **Add evals**:
   - extracts expected propositions from a seeded conversation,
   - does not extract a transient request,
   - recalls relevant memory and not irrelevant memory,
   - deleted memory is not resurrected.
8. **Measure precision**, not volume.

## Gates
- No sensitive attributes stored without a stated need.
- Recall is bounded and scoped to the user/context.
- Deletion is honored on the next extraction.
- Memory failures never break the chat path.

## Do not
- Store entire conversations as propositions.
- Use memory as a substitute for domain data.
- Raise recall limits to "improve quality" without a precision check.
