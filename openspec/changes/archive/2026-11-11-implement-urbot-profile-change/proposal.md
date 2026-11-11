# Proposal

## Why

Phase 1 proved read-only inspection and routing. Phase 2 needs the first real modification workflow, and a bot
profile is the lowest-risk case: it writes only a bot package, one profile properties file, and prompt
resources, with no tools, domain entities, or memory. This change validates the full loop: Manna reads a real
Urbot checkout, writes the files Urbot's own extension model expects, and verifies them with Urbot's compile
and test flow.

## What Changes

- **Implement the `urbot-profile` skill fully.** It creates or updates a bot profile:
  - `src/main/java/com/embabel/bot/<botname>/<BotName>Configuration.java`
  - `src/main/resources/application-<botname>.properties`
  - `src/main/resources/prompts/personas/<botname>.jinja`
  - `src/main/resources/prompts/objectives/<botname>.jinja`
  - optional `prompts/behaviours/<botname>.jinja`; the travel example uses `default`.
  - It sets `urbot.bot-packages` and the source-backed `urbot.chat.*` bindings, and reports whether the
    profile can be activated.
- **Record the `@Profile` rule.** When scanning the parent `com.embabel.bot`, every bot `@Configuration` class
  MUST be isolated with `@Profile("<bot>")`. Setting
  `urbot.bot-packages=com.embabel.bot.<botname>` inside `application-<botname>.properties` means the package
  is scanned only when that profile is active. `@Profile` is defense-in-depth, not the only activation
  mechanism; the workflow uses both.
- **Implement the `urbot-profile-change` workflow** in the order
  `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`, with a named
  `CHECKPOINT: PROFILE` before any write.
- **Add the travel example.**
  - Input: "创建一个名为 travel 的旅行助手，人格专业友好，目标是帮助用户规划行程".
  - Products: `TravelConfiguration.java`, `application-travel.properties`,
    `prompts/personas/travel.jinja`, `prompts/objectives/travel.jinja`.
  - The persona is professional and friendly; the objective is to help the user plan trips.
- **Add profile verification**: `./mvnw test`, `./mvnw -DskipTests compile`, and a profile-activation check
  that proves the configuration class loads only with the profile active.
- **Update routing and tests**: the profile route reports the four target files and the full skill sequence;
  the router recognizes the travel creation request; a new profile-change test runs in `npm test`.
- **Add a `PROFILE` approval checkpoint** to `policies/approval-checkpoints.md`.
- **Non-goals**: no Tool, Domain, or Memory workflow; no Urbot framework changes; no second Spring Boot
  application; no copied Urbot domain model.

## Capabilities

### New Capabilities

- `urbot-profile-change`: defines profile creation/modification, the `@Profile` and profile-scoped
  `urbot.bot-packages` activation contract, the discovery → profile → prompt → verification workflow, the
  travel example, and the Urbot/Manna verification gates.

### Modified Capabilities

None. `urbot-inspect-and-route` already defines the read-only router; this change adds the first mutation
workflow behind an approval checkpoint.

## Impact

- **New implementation**: `skills/urbot-profile/scripts/apply.mjs` and
  `scripts/dev/test-profile-change.mjs`.
- **Updated skills/workflows**: `skills/urbot-profile/SKILL.md`,
  `workflows/urbot-profile-change.md`, and the role of `urbot-prompt`/`urbot-verification` in the flow.
- **Policy**: `policies/approval-checkpoints.md` gains a `PROFILE` checkpoint.
- **Routing**: `generator/urbot/route.mjs` reports the configuration class plus the three resources for a
  profile change, includes the full skill sequence, and recognizes the travel example.
- **Evals/fixtures**: a travel profile fixture and case in the existing profile/prompt golden eval.
- **Tests**: `npm run test:profile` (deterministic fixture) and a real-checkout mode that copies the Urbot
  checkout, applies the profile, runs `./mvnw -DskipTests compile`, `./mvnw test`, and a profile-activation
  test. The Manna kit lock is regenerated.
- **Out of scope**: tools, domain entities, memory, framework edits, and any second application or model.
