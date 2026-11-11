# Skill Template

Every `skills/<id>/SKILL.md` starts with YAML frontmatter:

```yaml
---
name: manna-example
description: One sentence that starts with a verb and names the trigger.
version: 0.1.0
mode-default: suggest
requires:
  - docs/architecture.md
  - shared/patterns/embabel-patterns.md
---
```

Rules:

- `name` must equal the directory name.
- `mode-default` is one of `suggest`, `review`, `autofix`.
- `version` must match `skills.json` and the root version.
- `requires` paths must exist and be relative to the kit root.
- A skill may reference only its own `references/` and `scripts/`, plus `shared/` and `policies/`.
- Never reference another skill by path; route through a workflow instead.

Recommended body:

```markdown
# <Human title>

## When to use
## Inputs
## Process
1. ...
## Checkpoints
## Output
## Do not
## References
```
