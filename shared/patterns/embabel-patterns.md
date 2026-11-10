# Embabel Patterns (verified against Impromptu)

These are the concrete shapes manna generates and recommends.

## Utility chatbot

```java
@Bean
Chatbot chatbot(AgentPlatform platform) {
    return AgentProcessChatbot.utilityFromPlatform(
            platform,
            new InMemoryConversationFactory()
    );
}
```

The chatbot sees all `@Action` methods on the platform. Use it for open-ended conversation.

## Structured agent

```java
@Agent(description = "Find recordings for a plan", opaque = true)
public class FindRecordingsAgent {

    @Action
    @AchievesGoal(description = "Return recordings for each work")
    public Findings find(Plan plan, ActionContext context) {
        return context.ai()
                .withDefaultLlm()
                .rendering("find_recordings")
                .createObject(Findings.class, Map.of("plan", plan));
    }
}
```

- `opaque = true` hides internal actions from the planner.
- A `@Agent` class may have multiple `@Action` methods forming a typed data flow.
- `@AchievesGoal` marks the terminal action.
- Actions are bound to the blackboard by parameter type and explicit `context.bind(...)`.

## Tools

```java
@Component
public class CatalogTools {

    @LlmTool(description = "Look up a work by title. Read-only.")
    public Work lookup(@LlmTool.Param(description = "Work title") String title) {
        return catalog.find(title);
    }
}
```

Attach tool objects to a prompt with `.withToolObject(tools)`. Use `Tool.fromFunction(...)` when you
need an explicit schema; use `PlaybookTool` when a tool is itself a plan.

## Two-phase expensive work

1. Cheap planning from general knowledge + optional read-only DB query.
2. User confirms the plan (an `Asset` in the conversation).
3. Expensive parallel search only after confirmation.
4. Optional post-processing (notes, PDF) as a separate subagent.

Use `context.parallelMap(items, maxConcurrency, fn)` for the expensive phase. Keep concurrency bounded
and log per-item failures without failing the whole batch.

## Model routing

Configure a model per task: chat, extraction, entity resolution, Cypher generation, research, document
generation. Do not use one model for everything.

## Post-validation

Any LLM output that becomes a file or external action must be validated deterministically. On failure,
run a bounded repair loop (2 attempts) and then fail loudly. Never persist unvalidated output.
