# Design

## Context

See `proposal.md` — Why. Phase 1 added read-only `manna urbot init|inspect`, six Urbot skill skeletons, and
six workflow skeletons. The `urbot-profile` skill and `urbot-profile-change` workflow are currently
documentation-only. This change makes the profile path the first approved writer.

The authoritative Urbot behavior comes from source, not the bot README (which still documents obsolete
property names):

- `UrbotApplication` imports `BotPackageScanConfiguration`.
- `BotPackageScanConfiguration` reads `urbot.bot-packages` from the Spring `Environment` and scans those
  packages with a `ClassPathBeanDefinitionScanner`.
- `UrbotProperties` exposes `botPackages` and nested `chat` options.
- `ChatbotOptions` uses `persona`, `objective`, `behaviour`, `maxWords`, and the nested LLM options.
- `spring.profiles.active` is external activation; profile-specific properties are merged only when the
  profile is active.
- `./mvnw test` runs unit tests and excludes `**/*IT.java`; the compile/test gate does not need Neo4j.

## Goals / Non-Goals

**Goals:**

- Implement a deterministic, approval-gated profile scaffolder that writes the four travel artifacts.
- Make `@Profile` and profile-scoped `urbot.bot-packages` the explicit activation contract.
- Wire the profile workflow through discovery, profile, prompt, and verification.
- Verify with Urbot's compile/tests plus an isolated activation check.
- Keep the change strictly inside the profile boundary.

**Non-Goals:**

- Tool, domain, or memory workflows.
- Urbot framework edits.
- A second Spring Boot application or a copied domain model.
- Activating a profile by hardcoding `spring.profiles.active` in the generated properties file.

## Decisions

### D1. Deterministic profile scaffolder with approval and idempotency

`skills/urbot-profile/scripts/apply.mjs` is the write entry point:

```bash
node skills/urbot-profile/scripts/apply.mjs \
  --project <urbot-checkout> \
  --name travel \
  --persona "professional and friendly travel assistant" \
  --objective "help users plan trips and itineraries" \
  --approve
```

- Without `--approve`, it returns a plan and writes nothing.
- It validates the target has `pom.xml` and `src/main/java/com/embabel/urbot/` before writing.
- It refuses to overwrite an existing file unless `--force` is set; re-running is a no-op.
- It writes only:
  - `src/main/java/com/embabel/bot/<bot>/<BotName>Configuration.java`
  - `src/main/resources/application-<bot>.properties`
  - `src/main/resources/prompts/personas/<bot>.jinja`
  - `src/main/resources/prompts/objectives/<bot>.jinja`
  - an optional `prompts/behaviours/<bot>.jinja` only when requested.
- It rejects the obsolete property names and never writes `spring.profiles.active`.

*Alternative considered:* have the agent freehand the files from the workflow. Rejected — deterministic
generation is testable and prevents drift from the extension model.

### D2. Activation: profile-scoped bot-packages plus @Profile

`BotPackageScanConfiguration` scans whatever `urbot.bot-packages` contains. Two cases matter:

1. **Preferred for a bot profile:** put `urbot.bot-packages=com.embabel.bot.<bot>` in
   `application-<bot>.properties`. That file is merged only when the profile is active, so the package is
   scanned only then.
2. **Parent-package scan:** if `urbot.bot-packages=com.embabel.bot` is used, every bot `@Configuration` class
   MUST be isolated with `@Profile("<bot>")`, because the parent scan discovers all bots.

Both mechanisms are used for generated profiles:

```java
package com.embabel.bot.travel;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("travel")
public class TravelConfiguration {
}
```

`@Profile` is defense-in-depth, not the only activation mechanism. Activation remains external:
`SPRING_PROFILES_ACTIVE=travel` or `--spring.profiles.active=travel`; the generated properties do not set it.

*Alternative considered:* rely on `@Profile` alone or on `urbot.bot-packages=com.embabel.bot` globally.
Rejected — it couples every bot to every activation and defeats package-level isolation.

### D3. Workflow: discovery → profile → prompt → verification

`urbot-profile-change` runs:

1. `urbot-discovery` — read project, source, commit, profiles, target profile, bot package, persona,
   objective, domain types, and tools.
2. `urbot-profile` — produce the profile plan: bot name, package, config class, properties, activation.
3. `urbot-prompt` — draft the persona/objective (and optional behaviour) content.
4. `CHECKPOINT: PROFILE` — approve the exact files and activation contract.
5. Write via `skills/urbot-profile/scripts/apply.mjs --approve`.
6. `urbot-verification` — run compile, tests, and the activation check.
7. Report created files, activation, commands, and any skipped/overwritten files.

### D4. Travel example

Input: "创建一个名为 travel 的旅行助手，人格专业友好，目标是帮助用户规划行程".

Products (exactly four):

1. `src/main/java/com/embabel/bot/travel/TravelConfiguration.java` — `@Configuration @Profile("travel")`.
2. `src/main/resources/application-travel.properties`:

   ```properties
   urbot.bot-packages=com.embabel.bot.travel
   urbot.chat.persona=travel
   urbot.chat.objective=travel
   urbot.chat.behaviour=default
   urbot.chat.max-words=80
   urbot.chat.llm.model=gpt-4.1-mini
   urbot.chat.llm.temperature=0.0
   ```

3. `src/main/resources/prompts/personas/travel.jinja` — a professional, friendly travel assistant.
4. `src/main/resources/prompts/objectives/travel.jinja` — help the user plan trips and itineraries.

No travel behaviour template, Agent, Tools, or domain file is created. The example is a profile, not a full
bot bootstrap.

### D5. Verification and activation check

In the target Urbot checkout:

```bash
./mvnw -q -DskipTests compile
./mvnw -q test
```

`./mvnw test` runs unit tests and excludes `**/*IT.java`; it does not need Neo4j or an LLM. The profile
activation check is a small JUnit test written only into the disposable temp copy:

```java
new ApplicationContextRunner()
    .withUserConfiguration(TravelConfiguration.class)
    .withPropertyValues("spring.profiles.active=travel")
    .run(context -> assertThat(context).hasSingleBean(TravelConfiguration.class));
```

A second run without the property asserts the bean is absent. This proves `@Profile` gating without starting
the full application.

*Alternative considered:* start the full Spring Boot app with `spring-boot:run`. Rejected — it needs Neo4j and
LLM configuration and is not deterministic in CI.

### D6. Manna kit tests

`scripts/dev/test-profile-change.mjs` supports two modes:

- **Default (fixture)**: builds a minimal temporary Urbot-shaped tree, applies the travel profile, and
  asserts the four files, `@Profile("travel")`, `urbot.bot-packages`, current bindings, no legacy names, no
  `spring.profiles.active`, the no-approval plan, and idempotent re-apply. This runs from `npm test` without
  network.
- **Real checkout (`--project <dir>`)**: copies the checkout to a temp directory, applies the travel profile,
  adds the activation test, and runs `./mvnw -DskipTests compile`, `./mvnw test`, and the activation check.
  The original checkout is never modified.

`npm run test:profile` runs the deterministic mode; `npm run test:profile -- --project <dir>` runs the real
mode.

### D7. Router and routing metadata

`generator/urbot/route.mjs` updates the `urbot-profile-change` route to report the configuration class plus
the three resources, and to list `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`.
The router also recognizes profile-creation phrasing, including the Chinese travel example:

- a creation verb (`create`/`new`/`创建`/`新建`) plus an assistant/profile noun
  (`assistant`/`profile`/`助手`/`机器人`) selects `urbot-profile-change`;
- persona/objective/behaviour words in the same creation request are treated as profile fields, not as a
  separate prompt-tuning intent;
- a pure persona/objective request without creation still routes to `urbot-prompt-tuning`.

`workflows/routing/pipeline.json` reflects the full profile skill sequence.

### D8. Approval checkpoint

`policies/approval-checkpoints.md` gains a `PROFILE` row: it approves the bot package, configuration class,
profile properties, and prompt resources; it never approves tools, domain, memory, or framework edits. This
keeps the write behind the `review` mode and a named checkpoint.

## Risks / Trade-offs

- **A new profile collides with an existing bot** → Preflight checks existing files, requires `--force`, and
  reports skipped files.
- **Parent-package scanning leaks a bot into the wrong profile** → Generated configs always carry
  `@Profile("<bot>")`, and the preferred properties set package-level scanning.
- **Tests might not prove activation** → The activation test asserts both the active and inactive states with
  `ApplicationContextRunner`.
- **The Manna `npm test` could become slow or network-dependent** → The default mode uses a fixture; the real
  Maven mode is opt-in via `--project`.
- **The workflow could drift into tools/domain/memory** → The spec and workflow explicitly stop at the
  profile boundary; tools/domain/memory routes remain separate.
- **The Chinese travel example might mis-route** → Add the creation phrasing rule and a golden eval case; the
  routing test covers it.

## Migration Plan

1. Add `apply.mjs` and update `urbot-profile/SKILL.md`.
2. Update `urbot-profile-change.md` with the approved write flow and activation rule.
3. Add the `PROFILE` checkpoint to the policy.
4. Update the router, pipeline, and travel fixture/eval.
5. Add `test-profile-change.mjs` and wire it into `npm test`.
6. Run the deterministic test, then the real-checkout mode against a Urbot clone.
7. Roll back by removing the script/test, restoring the skeleton docs, and reverting the router/policy/lock;
   the generated Urbot files live only in the target checkout or temp copy.

## Open Questions

None blocking. A future change can add tool/domain/memory write workflows and richer profile migration.
