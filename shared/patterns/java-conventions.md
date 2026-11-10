# Java Conventions for Generated Projects

- Java 21, Spring Boot 3.5.x, Maven.
- Package root from `project.package`; capability code lives in `<root>.<capability.package>`.
- One capability per package: `agent/`, `tools/`, `domain/`, `graph/`, `memory/`, `pipeline/`, `transport/`
  may be subpackages or siblings, but boundaries are explicit.
- Prefer records for immutable actions inputs/outputs and domain value objects.
- Persisted Neo4j nodes may be classes with a no-arg constructor; keep setters minimal.
- No field injection; constructor injection only.
- No `System.out`; use SLF4J.
- Return typed results, not raw `Map` or `List`, from actions.
- Validate inputs with Jakarta Validation where the value crosses a trust boundary.
- Keep LLM prompts in `src/main/resources/prompts/*.jinja`, named after the action.
- Mark live-LLM tests with `@Tag("integration")` and the `IT` suffix.
- Contract tests must not call an LLM or require Neo4j.
- Use Apache-2.0 license headers on generated Java files.
- `-parameters` must be enabled so `@LlmTool.Param` parameter names survive compilation.
