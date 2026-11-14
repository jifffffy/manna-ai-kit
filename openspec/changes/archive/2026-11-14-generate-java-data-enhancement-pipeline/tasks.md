# Tasks

## 1. Generator and domain inspection

- [x] 1.1 Implement `skills/urbot-data-enhance-pipeline/scripts/apply.mjs` with `--project`, `--bot`, `--name`, `--source`, `--target`, `--relationship`, `--match`, `--csv`, `--key`, `--properties`, `--source-label`, `--target-label`, `--approve`, and `--force`; verify kebab-case and camelCase parse and unknown options fail.
- [x] 1.2 Validate the project, bot package, and `application-<bot>.properties`; verify a missing bot or properties file fails before writing.
- [x] 1.3 Scan `domain/` for the source and target `NamedEntity` interfaces (following local `extends` chains); verify missing types, non-`NamedEntity` types, and missing IDs fail with the type named.
- [x] 1.4 Build the plan: batch id, source, target, relationship, CSV path, key columns, properties, labels, and every file; verify no file is written without `--approve`.

## 2. Generated Java pipeline

- [x] 2.1 Generate `EnhancementBatch.java` and `ReviewCsv.java`; verify quoted fields, doubled quotes, duplicate-key detection, and status parsing are implemented.
- [x] 2.2 Generate `EnhancementPipeline.java` with `@Service @Profile("<bot>")`, batch discovery, `generate(id)`, `apply(id)`, and `infos()`; verify it references only `EnhancementBatch`.
- [x] 2.3 Generate `<Batch>Enhancer.java` with `@Component @Profile("<bot>")`, `NamedEntityDataRepository` iteration, the pattern hook, pending CSV generation, and approved-only apply with existence checks, `source`, and `reviewedAt`.
- [x] 2.4 Generate `DataEnhancementController.java` with list/generate/apply endpoints, `@Profile`, `@ConditionalOnProperty(name="urbot.data-enhancement.enabled", havingValue="true")`, and `confirm=true` on apply; verify no force or delete endpoint exists.
- [x] 2.5 Append `urbot.data-enhancement.enabled=false` and the CSV path to `application-<bot>.properties` idempotently; verify re-running does not duplicate keys.
- [x] 2.6 Generate `<Batch>EnhancerTest.java` covering CSV round-trip, duplicate rejection, and approved-only filtering without Neo4j.

## 3. Pattern generation

- [x] 3.1 Implement `--match contains` using `NamedEntity.getName()` for both types; verify the generated rule and reason text.
- [x] 3.2 Implement `--match none` with a clearly marked TODO hook returning no candidates; verify no LLM import or call is generated.
- [x] 3.3 Verify the pattern method is the only extension point and is documented in the generated class.

## 4. Tests and verification

- [x] 4.1 Extend `scripts/dev/test-data-enhance-pipeline.mjs` with a fixture bot project containing `domain/` `NamedEntity` interfaces and `application-<bot>.properties`; verify plan, approve, and generated content.
- [x] 4.2 Assert the CSV header, key columns, Neo4j labels, relationship, `@Profile`, REST paths, and `approved` filter reflect the fixture domain.
- [x] 4.3 Assert `--match none` generates the TODO hook and `--match contains` generates the contains rule.
- [x] 4.4 Assert missing types, a non-`NamedEntity`, and a missing properties file fail before writing; assert `--force` overwrites and existing files are reported otherwise.
- [x] 4.5 Add an optional real-checkout check that generates into a copied Urbot checkout and runs `./mvnw -q -DskipTests compile`; verify it is skipped without `--project`.
- [x] 4.6 Run `npm run test:data` and `npm test`; confirm both pass.

## 5. Documentation and spec

- [x] 5.1 Rewrite `skills/urbot-data-enhance-pipeline/SKILL.md` around the generator: inputs, plan/approve, generated files, pattern hook, REST, review gate, and verification.
- [x] 5.2 Update `references/csv-contract.md` for the domain-derived columns and reframe `scripts/review-csv.mjs` as an optional pre-check.
- [x] 5.3 Replace `references/urbot-implementation.md` with the generated-code contract and extension points.
- [x] 5.4 Update `workflows/urbot-data-enhance-pipeline.md`: generator plan → approve → generate → review → apply with `confirm=true` → verify.
- [x] 5.5 Confirm `openspec validate generate-java-data-enhancement-pipeline --strict` passes and `npm run lock` refreshes the shipped files.
