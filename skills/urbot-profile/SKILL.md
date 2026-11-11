---
name: urbot-profile
description: Create or modify a Urbot bot profile with a gated configuration class, profile properties, and prompt resources.
version: 0.1.0
mode-default: review
requires:
  - docs/architecture.md
  - workflows/routing/pipeline.json
  - policies/approval-checkpoints.md
  - policies/tool-safety.md
---

# Urbot Profile

## When to use

A request creates or modifies a bot profile: a bot package, an `application-<bot>.properties` file, and the
persona/objective/behaviour resources. This is the only write workflow in Phase 2; it does not handle tools,
domain, or memory.

## Inputs

- The target Urbot checkout.
- The bot name, persona text, and objective text.
- An optional custom behaviour name and text; default to `default`.
- The current project state from `urbot-discovery`.

## Process

1. **Inspect.** Read the existing bot package, `application-<bot>.properties`, and prompt resources. Reuse
   existing profiles where possible.
2. **Plan.** Produce the four target artifacts:
   - `src/main/java/com/embabel/bot/<bot>/<BotName>Configuration.java`
   - `src/main/resources/application-<bot>.properties`
   - `src/main/resources/prompts/personas/<bot>.jinja`
   - `src/main/resources/prompts/objectives/<bot>.jinja`
   - optional `src/main/resources/prompts/behaviours/<bot>.jinja`
3. **Stop.** Show the plan at `CHECKPOINT: PROFILE`. Do not write before approval.
4. **Apply.** After approval, run:

   ```bash
   node skills/urbot-profile/scripts/apply.mjs \
     --project <urbot-checkout> \
     --name <bot> \
     --persona "<persona text>" \
     --objective "<objective text>" \
     --approve
   ```

   Add `--force` only to replace existing files.
5. **Verify.** Run `./mvnw -q -DskipTests compile` and `./mvnw -q test`; confirm the profile activation
   contract.

## Activation contract

- The configuration class is `@Configuration` and `@Profile("<bot>")`.
- `application-<bot>.properties` sets `urbot.bot-packages=com.embabel.bot.<bot>` so the package is scanned
  only when the profile is active.
- When scanning the parent `com.embabel.bot`, the `@Profile("<bot>")` annotation isolates each bot.
- `@Profile` is defense-in-depth; never rely on it as the only activation mechanism.
- Activate externally (`--spring.profiles.active=<bot>` or `SPRING_PROFILES_ACTIVE=<bot>`); never hardcode
  `spring.profiles.active` in the generated properties.

## Configuration

Use the source-backed bindings only:

```properties
urbot.bot-packages=com.embabel.bot.<bot>
urbot.chat.persona=<bot>
urbot.chat.objective=<bot>
urbot.chat.behaviour=default
urbot.chat.max-words=80
urbot.chat.llm.model=gpt-4.1-mini
urbot.chat.llm.temperature=0.0
```

Never emit `urbot.persona`, `urbot.objective`, `urbot.max-words`, or `urbot.chat-llm.model`.

## Output

A profile report with created/skipped files, the bot package, the activation profile, and verification
results.

## Checkpoints

`CHECKPOINT: PROFILE` approves the bot package, configuration class, profile properties, and prompt
resources. It never approves tools, domain, memory, or framework edits.

## Do not

- Write before approval, or overwrite existing files without `--force`.
- Create Agent, Tools, domain, memory, or framework files.
- Create a second Spring Boot application or copy the Urbot domain model.
- Use obsolete property names.
