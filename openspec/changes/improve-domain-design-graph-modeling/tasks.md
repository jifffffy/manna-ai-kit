# Tasks

## 1. Schema v2

- [x] 1.1 Require `schemaVersion: 2` in `skills/urbot-domain-design/scripts/apply.mjs` and reject missing/older versions with a migration message; verify a v1 model fails before writing.
- [x] 1.2 Add `catalog-entity` as a DDD variant for the description color, and reject relationships on value objects; verify the color/variant matrix.
- [x] 1.3 Add `creationPermitted` and `description` to classes; `optional` and `description` to attributes; `method`, `type`, `optional`, and `direction` to relationships; verify unknown or invalid fields fail.
- [x] 1.4 Enforce unique relationship methods, allow repeated `type` and repeated targets, and reject `optional` on `many`; verify the error names the class and method.

## 2. Generation

- [x] 2.1 Emit `@Relationship(name = "<TYPE>")` on relationship getters and `direction = RelationshipDirection.<VALUE>` only for non-default directions; verify self-relations, `SCORED_FOR` on two targets, and `FEATURES` on the same target.
- [x] 2.2 Emit `@CreationPermitted(true|false)` for entities and catalog entities with the documented defaults; verify catalog entities default to `false`.
- [x] 2.3 Emit `@JsonClassDescription` from the class description and `@JsonPropertyDescription` on described entity getters; verify Java string escaping for quotes and backslashes.
- [x] 2.4 Emit `@Nullable` for optional attributes and single relations; verify required reference components still reject null while optional components skip the check.
- [x] 2.5 Generate catalog entities as `NamedEntity` interfaces with attributes, not records; verify `Genre`/`Nationality` output.
- [x] 2.6 Add imports only when needed (`List`, `Nullable`, `Relationship`, `RelationshipDirection`, `CreationPermitted`, Jackson annotations); verify a class without relations has no `List` or `Relationship` import.

## 3. Fixtures

- [x] 3.1 Migrate `evals/fixtures/urbot/domain-travel.json` to `schemaVersion: 2`, splitting relationship `method`/`type`; verify it still generates the same travel model plus annotations.
- [x] 3.2 Add `evals/fixtures/urbot/domain-music.json` modeled on impromptu: `Composer` with self `INFLUENCED`, `HAS_NATIONALITY`, `OF_EPOCH`, `USES`; `Work` with `SCORED_FOR` and `FEATURES`; catalog `Nationality`, `Genre`, `Epoch`, `Technique`, `Instrument`, `Ensemble`; creatable `Performer`; optional `birthYear`.
- [x] 3.3 Verify the music fixture covers a self-relation, two relationship types to the same target, a catalog with attributes, and a creatable entity.

## 4. Tests

- [x] 4.1 Update `scripts/dev/test-domain-design.mjs` for the v2 travel fixture and the new annotations.
- [x] 4.2 Assert `Composer` output: `@CreationPermitted(false)`, `@JsonClassDescription`, `@Relationship` on `nationalities`/`influenced`/`epoch`, `@Nullable` on optional values.
- [x] 4.3 Assert `Work` output: both `SCORED_FOR` getters and the `FEATURES` getter; assert `Genre`/`Nationality` are interfaces and `Performer` is `@CreationPermitted(true)`.
- [x] 4.4 Assert a v1 model, a value object with a relationship, a duplicate method, and an invalid direction fail with clear messages.
- [x] 4.5 Run `npm run test:domain`; verify it passes.

## 5. Documentation and verification

- [x] 5.1 Update `skills/urbot-domain-design/SKILL.md` and `references/color-modeling.md` for catalog entities and relationship semantics.
- [x] 5.2 Update `references/ddd-mapping.md` with the v2 schema, annotation rules, and optional/nullable rules.
- [x] 5.3 Update `workflows/urbot-domain-design.md` with the v2 model and the new generated shape.
- [x] 5.4 Run `npm run validate`, `npm test`, `npm run lock`, `npm run lock:check`, and `openspec validate improve-domain-design-graph-modeling --strict`; confirm all pass.
