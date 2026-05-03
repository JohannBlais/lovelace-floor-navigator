---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [conventions.md, tech-stack.md]
---

# Identity

Frozen nomenclature and identity of the component. Frozen spec — every
evolution is a versioned breaking change.

## Context

The component exists under several names depending on context (GitHub
repo, npm package, DOM custom element, YAML type, HACS label).
Aligning these names avoids confusion and subtle bugs (notably the
mismatch between custom element tag and YAML type, which produces the
"Custom element doesn't exist" error at load time).

## Goals

1. A single nomenclature referenced everywhere
2. Compliance with HACS conventions to ease installation
3. Clarity for the end user (readable YAML config)

## Scope

### In

- Repo, package, class, custom element names
- YAML type used in the Lovelace config
- HACS label

### Out

- Implementation (see `src/` components)
- Code conventions (see [`conventions.md`](conventions.md))

## Expected behaviour — Frozen nomenclature

| Element | Value |
|---|---|
| GitHub repo name | `lovelace-floor-navigator` |
| GitHub owner | `JohannBlais` |
| **Custom element tag** | **`floor-navigator-card`** |
| **YAML type** | **`custom:floor-navigator-card`** |
| TS class name | `FloorNavigatorCard` |
| npm package name | `lovelace-floor-navigator` |
| HACS marketing name | "Floor Navigator" |
| Bundle filename | `floor-navigator.js` |

## Edge cases

### Tag / YAML type mismatch

The custom element tag (`floor-navigator-card`) and the YAML type
(`custom:floor-navigator-card`) must match exactly. HA resolves
`type: custom:<X>` by looking for a custom element defined with
`customElements.define('<X>', ...)`. If they don't match, the "Custom
element doesn't exist" error appears at card load.

The standard HACS convention is to suffix the custom element tag with
`-card` (cf. `mushroom-light-card`, `mini-graph-card`, `button-card`,
`bubble-card`). Our tag follows this convention.

See ADR-001 in [`../decisions.md`](../decisions.md) for the history of
this decision.

### Repo rename

The GitHub repo name affects the custom HACS install URL and external
links. **Renaming the repo would be a breaking change for HACS users.**
Not under consideration before official HACS publication.

### Namespace conflict

The `fn-` prefix on custom element tags and CSS variables is short
(2 letters). Theoretical risk of collision with another card using the
same prefix. To date, no known HACS custom card claims this prefix. If
a collision arose, the opposing maintainer would likely change (short
prefixes follow first-come, first-served in the community).

## Licence

MIT (HACS standard, allows maximal reuse, including commercial).

## Open questions

None.

## Decisions

- ADR-001 — Custom element tag suffixed with `-card` (2026-05-01)

See [`../decisions.md`](../decisions.md) for details.
