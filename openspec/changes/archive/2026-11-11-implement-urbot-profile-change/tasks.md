# Tasks

## 1. Implement the urbot-profile skill

- [x] 1.1 Implement `skills/urbot-profile/scripts/apply.mjs` with `--project`, `--name`, `--persona`, `--objective`, `--behaviour`, `--max-words`, `--model`, `--temperature`, `--approve`, and `--force`; verify a run without `--approve` returns a plan and writes nothing.
- [x] 1.2 Validate the target checkout in `apply.mjs`: require `pom.xml` and `src/main/java/com/embabel/urbot/`; verify a non-Urbot directory is rejected.
- [x] 1.3 Write the four profile artifacts with the current bindings: `src/main/java/com/embabel/bot/<bot>/<BotName>Configuration.java`, `src/main/resources/application-<bot>.properties`, `prompts/personas/<bot>.jinja`, and `prompts/objectives/<bot>.jinja`; verify each file exists after an approved run.
- [x] 1.4 Add `@Configuration` and `@Profile("<bot>")` to the generated config class and set `urbot.bot-packages=com.embabel.bot.<bot>` in the profile properties; verify both strings in the generated files.
- [x] 1.5 Reject obsolete names (`urbot.persona`, `urbot.objective`, `urbot.max-words`, `urbot.chat-llm.model`) and never write `spring.profiles.active`; verify a generated properties file contains none of them.
- [x] 1.6 Refuse to overwrite an existing file without `--force`, and return a no-op when the same profile is re-applied; verify with two consecutive approved runs.
- [x] 1.7 Update `skills/urbot-profile/SKILL.md` with the full process, the `@Profile` rule, the `CHECKPOINT: PROFILE`, the script usage, and the profile-only boundary; verify the document names all four artifacts and the activation contract.

## 2. Encode the @Profile activation rule

- [x] 2.1 Add the `PROFILE` checkpoint to `policies/approval-checkpoints.md`: approve the bot package, config class, profile properties, and prompt resources; never approve tools, domain, memory, or framework edits.
- [x] 2.2 Document the two activation cases in `design.md`: profile-scoped `urbot.bot-packages` in `application-<bot>.properties`, and `@Profile("<bot>")` isolation when scanning `com.embabel.bot`; verify both cases and the "defense-in-depth, not sole mechanism" statement are present.
- [x] 2.3 Verify the workflow does not edit `src/main/java/com/embabel/urbot/` or set `spring.profiles.active`; check the generated diff in the temp copy.

## 3. Implement the urbot-profile-change workflow

- [x] 3.1 Rewrite `workflows/urbot-profile-change.md` with the ordered flow `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`, the `CHECKPOINT: PROFILE` before writes, the apply step, and the verification step.
- [x] 3.2 Add the travel example input and the four expected products to the workflow document; verify the paths and the persona/objective descriptions are present.
- [x] 3.3 Update `skills/urbot-prompt/SKILL.md` so its role in the profile flow (drafting persona/objective content) is explicit while remaining non-writing.
- [x] 3.4 Update `skills/urbot-verification/SKILL.md` to name the profile verification commands and the activation check; verify it still forbids source edits.

## 4. Add the travel example

- [x] 4.1 Add `evals/fixtures/urbot/profile-travel.json` with the Chinese travel request and `directoryExists: true`; verify the router selects `urbot-profile-change`.
- [x] 4.2 Add the travel case to `evals/golden/urbot-profile-prompt.eval.json`; verify `npm run test:routing` still passes.
- [x] 4.3 Update `generator/urbot/route.mjs` so `urbot-profile-change` reports `<BotName>Configuration.java` plus the three resources and lists `urbot-discovery → urbot-profile → urbot-prompt → urbot-verification`; verify the route output.
- [x] 4.4 Add profile-creation intent handling (including `创建`/`新建` plus `助手`/`机器人`, and English create/new plus assistant/profile) so the travel example routes to profile-change and does not get split by persona/objective words; verify with the travel fixture and a pure persona request.

## 5. Wire verification commands and tests

- [x] 5.1 Add `scripts/dev/test-profile-change.mjs` with a deterministic fixture mode: create a minimal Urbot-shaped temp tree, apply the travel profile, and assert the four files, `@Profile("travel")`, `urbot.bot-packages`, current bindings, no legacy names, no `spring.profiles.active`, and no framework files changed.
- [x] 5.2 Add the no-approval and idempotency checks to the deterministic test: a run without `--approve` writes nothing, and a second approved run is a no-op.
- [x] 5.3 Add the real-checkout mode (`--project <dir>`): copy the checkout to a temp dir, apply the profile, add `TravelProfileActivationTest.java` using `ApplicationContextRunner`, and run `./mvnw -q -DskipTests compile`, `./mvnw -q test`, and the activation check.
- [x] 5.4 Verify the activation test asserts the bean is present with `spring.profiles.active=travel` and absent without it.
- [x] 5.5 Add `test:profile` to `package.json` and include the deterministic mode in `npm test`; verify `npm test` passes without network.
- [x] 5.6 Run the real-checkout mode against a shallow Urbot clone at the pinned commit and confirm compile, tests, and activation pass; confirm the original clone is unchanged.

## 6. Integration and final verification

- [x] 6.1 Update the `urbot-profile-change` entry in `workflows/routing/pipeline.json` to list `urbot-discovery`, `urbot-profile`, `urbot-prompt`, and `urbot-verification`; verify `npm run validate` passes.
- [x] 6.2 Update `AGENTS.md`/`README.md` only where the profile write flow and activation rule are now actionable; verify `npm run check:positioning` passes.
- [x] 6.3 Run `npm run lock` and `npm run lock:check`; verify the lock is fresh.
- [x] 6.4 Run `npm run validate`, `npm run check:positioning`, `npm run test:routing`, `npm test`, and `openspec validate implement-urbot-profile-change --strict`; confirm all pass.
- [x] 6.5 Verify the travel example produces exactly the four product files and that no Tool, domain, memory, or framework file is created.
