# Workflow: Urbot Profile Change

**Goal:** create or modify a Urbot bot profile — the bot package, configuration class, profile properties, and
persona/objective resources — and verify it with Urbot's own compile and test flow.

## Scope

This is the first write workflow. It touches only:

- `src/main/java/com/embabel/bot/<bot>/`
- `src/main/resources/application-<bot>.properties`
- `src/main/resources/prompts/{personas,objectives}/*.jinja`

It does not implement tools, domain entities, memory, or framework changes.

## Activation rule

- A bot configuration class must be `@Configuration` and `@Profile("<bot>")`.
- Prefer `urbot.bot-packages=com.embabel.bot.<bot>` in `application-<bot>.properties`, so the package is
  scanned only when the profile is active.
- If `urbot.bot-packages=com.embabel.bot` scans the parent package, every bot class must remain isolated by
  `@Profile("<bot>")`.
- `@Profile` is defense-in-depth, not the only activation mechanism.
- Do not hardcode `spring.profiles.active` in the generated properties. Activate externally with
  `--spring.profiles.active=<bot>` or `SPRING_PROFILES_ACTIVE=<bot>`.

## Ordered steps

1. **Discover** — run `urbot-discovery` to read project, source, commit, profiles, target profile, bot
   package, persona, objective, domain types, and tools.
2. **Profile** — run `urbot-profile` to plan the bot package, `@Profile("<bot>")` configuration class,
   `application-<bot>.properties`, and the `urbot.chat.*` bindings.
3. **Prompt** — run `urbot-prompt` to draft the persona and objective (and an optional behaviour) content.
4. **Approve** — stop at `CHECKPOINT: PROFILE`. Show the exact files and activation contract. Do not write
   before approval.
5. **Apply** — after approval, run:

   ```bash
   node skills/urbot-profile/scripts/apply.mjs \
     --project <urbot-checkout> \
     --name <bot> \
     --persona "<persona text>" \
     --objective "<objective text>" \
     --approve
   ```

   Add `--force` only when replacing an existing profile.

6. **Verify** — run `urbot-verification`:

   ```bash
   ./mvnw -q -DskipTests compile
   ./mvnw -q test
   ```

   Also confirm the activation contract: the configuration class loads with the profile active and is absent
   when it is inactive.

7. **Report** — list created/skipped files, the activation profile, commands, and any open issues.

## Example

Input: "创建一个名为 travel 的旅行助手，人格专业友好，目标是帮助用户规划行程".

Products:

- `src/main/java/com/embabel/bot/travel/TravelConfiguration.java` — `@Configuration @Profile("travel")`.
- `src/main/resources/application-travel.properties` — `urbot.bot-packages=com.embabel.bot.travel` plus the
  current `urbot.chat.*` bindings.
- `src/main/resources/prompts/personas/travel.jinja` — professional, friendly travel assistant.
- `src/main/resources/prompts/objectives/travel.jinja` — help the user plan trips and itineraries.

No Agent, Tools, domain, memory, or behaviour template is created for this example.

## Output

```text
Route: urbot-profile-change
Skills: urbot-discovery → urbot-profile → urbot-prompt → urbot-verification
Profile: travel
Package: com.embabel.bot.travel
Activation: @Profile("travel") + urbot.bot-packages=com.embabel.bot.travel
Compile: pass/fail
Tests: pass/fail
Activation check: pass/fail
Files: ...
CHECKPOINT: PROFILE (before write)
```

## Do not

- Write before `CHECKPOINT: PROFILE`.
- Use obsolete `urbot.persona`/`urbot.objective`/`urbot.max-words`/`urbot.chat-llm.model` names.
- Hardcode `spring.profiles.active` in the generated properties.
- Create tools, domain, or memory artifacts.
- Modify `src/main/java/com/embabel/urbot/`.
- Create a second Spring Boot application or copy the Urbot domain model.
