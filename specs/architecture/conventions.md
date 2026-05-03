---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: []
---

# Conventions

Code style + versioning + naming. Frozen spec — every evolution goes
through a decision recorded in [`../decisions.md`](../decisions.md).

## Context

OS project publishable on HACS, single primary maintainer. Conventions
target long-term readability and alignment with the Lovelace custom
cards ecosystem rather than purely personal style. Many potential
external contributors are ad-hoc developers coming from similar cards
(Mushroom, Mini-Graph, Button-Card) — the less specific they have to
learn, the better.

## Goals

1. Immediate readability for someone familiar with Lit + TypeScript
2. Consistency with the HACS custom cards ecosystem
3. Strict SemVer versioning for API stability up to v1.0
4. Predictable naming of DOM/CSS elements (easy debugging and card-mod)

## Scope

### In

- TypeScript / HTML / CSS code style
- Naming conventions (classes, variables, custom elements, CSS vars,
  YAML config keys)
- SemVer versioning

### Out

- Build tooling choices (see [`tech-stack.md`](tech-stack.md))
- Git workflow (see [`dev-workflow.md`](dev-workflow.md))
- Automated tests (to be defined in v0.3.0)

## Code style

| Aspect | Convention |
|---|---|
| Indentation | 2 spaces (modern TypeScript standard) |
| Quotes | Single for TS, double for HTML/JSX |
| Semicolons | Yes (Lit/HA standard) |
| Imports | Alphabetical sort, separate node_modules / local with blank line |

## Naming conventions

| Element | Style | Example |
|---|---|---|
| TS classes | PascalCase | `FloorNavigatorCard` |
| Methods/variables | camelCase | `currentFloorIndex` |
| Custom elements | kebab-case with `fn-` prefix | `<fn-floor>`, `<fn-element-icon>` |
| CSS variables | kebab-case with `--fn-` prefix | `--fn-color-on`, `--fn-text-shadow` |
| YAML config keys | snake_case | `default_visible`, `tap_action`, `dark_mode` |

The `fn-` (Floor Navigator) prefix on custom elements and CSS variables
avoids collisions with other Lovelace components co-existing on the same
dashboard. Deliberately short (2 letters) so as not to bloat CSS
selectors and card-mod overrides.

## SemVer versioning

Strict application of the [SemVer](https://semver.org/) spec:

| Bump | Criterion | Example |
|---|---|---|
| Patch (0.1.0 → 0.1.1) | Bug fix OR new feature with full backward compatibility | Dark mode (isolated feature, backward-compatible) |
| Minor (0.1.0 → 0.2.0) | Substantial new features, backward-compatible | Tooltips + badges + persistence in v0.2.0 |
| Major (0.x → 1.0) | Breaking API changes | Avoid before HACS publication |

**Edge case resolved in v0.1.1 (dark mode)**: technically a new feature
(not a bug fix), but isolated and backward-compatible (the v0.1.0
`background` field still works). Patch is defensible because we don't
want to inflate minor versions too early. Decision taken to avoid
multiplying v0.x.0 releases before v0.3.0 maturity / HACS publication.

## Expected behaviour

### Immediate readability

A Lit/TS developer opening any `src/` file should grasp the intent
without consulting the conventions file. The test: if the style forces
the reader to look up these conventions, it is too far from the common
idiom.

### Card-mod and override

All CSS variables (`--fn-*`) must be nameable without lookup:
`--fn-color-light-on`, `--fn-color-switch-off`. No cryptic naming. The
`--fn-color-{domain}-{state}` pattern must be predictable so users can
override their domains without guessing.

### Major migration

If a breaking change becomes necessary one day (major bump), a
`MIGRATION.md` file at the repo root will document the changes. Not
before v1.0.

## Edge cases

- **Conflicts between ESLint/Prettier and these conventions**: the
  written convention wins. If we add a linter in v0.3.0, its config
  must reflect these conventions, not replace them.
- **External libs with their own style**: imported code is not
  reformatted. Conventions apply to code written in `src/`.
- **Retroactive renaming**: when a convention evolves, existing code
  stays as-is. New writes follow the new convention; existing code is
  updated opportunistically (next time the area is refactored).

## Open questions

None.

## Decisions

See ADR-001 and ADR-002 in [`../decisions.md`](../decisions.md) for the
history of critical naming decisions (custom element tag, dotenv
loading).
