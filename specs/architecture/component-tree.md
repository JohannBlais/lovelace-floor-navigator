---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [rendering-strategy.md, navigation.md, ../features/data-model.md]
---

# Component Tree

Tree of Lit components at runtime + SVG ID naming conventions. Frozen
spec for v0.1.0.

## Context

The card is composed of several nested Lit custom elements. This
decomposition enables granular reactive updates (see
[`rendering-strategy.md`](rendering-strategy.md)) and separation of
concerns. The SVG naming conventions exist to make DOM debugging
(DevTools) and `card-mod` overrides easy.

## Goals

1. Predictable tree: a developer who opens the inspector should grasp
   the hierarchy in 30 seconds
2. Uniform prefixes to avoid collisions and make selectors easy
3. Reactive update granularity: only the affected element re-renders
   when its entity changes

## Scope

### In

- Lit component hierarchy
- SVG ID naming conventions
- Universal `fn-` prefix

### Out

- Rendering strategy (see [`rendering-strategy.md`](rendering-strategy.md))
- Navigation logic (see [`navigation.md`](navigation.md))
- YAML config format (see
  [`../features/data-model.md`](../features/data-model.md))

## Expected behaviour — Component tree

```
<floor-navigator-card>           # root component, owns config + global state
  └── <fn-navigation-controller>  # owns wheel/swipe/transition state
      ├── <fn-floor-stack>        # container of stacked floors
      │   ├── <fn-floor>          # one per declared floor
      │   │   ├── <svg>           # background + overlays
      │   │   │   ├── <image>     # floor background (PNG/JPG/SVG)
      │   │   │   ├── <fn-overlay-layer> (×N)
      │   │   │   │   └── <fn-element-icon> or <fn-element-text> (×M)
      │   ├── <fn-floor>
      │   └── <fn-floor>
      ├── <fn-floor-indicator>    # label "L0 — Ground floor"
      └── <fn-overlay-buttons>    # toggle button bar
```

## Expected behaviour — SVG naming conventions

Prefix `fn-` (Floor Navigator) to avoid collisions:

| Pattern | Description |
|---|---|
| `fn-floor-{floor_id}` | `<g>` wrapper for the entire floor |
| `fn-floor-{floor_id}-bg` | `<image>` background |
| `fn-floor-{floor_id}-overlay-{overlay_id}` | `<g>` wrapper for an overlay on this floor |
| `fn-element-{entity_id_normalised}` | Element wrapper (`.` → `-` for IDs) |

Example of rendered DOM:

```html
<g id="fn-floor-L0">
  <image id="fn-floor-L0-bg" href="L0.png" />
  <g id="fn-floor-L0-overlay-lights">
    <g id="fn-element-light-salon" data-entity="light.salon" data-state="on">
      <circle cx="600" cy="450" r="24" />
      <path d="..." />  <!-- MDI lightbulb icon -->
    </g>
  </g>
</g>
```

The `data-entity` and `data-state` attributes are systematically present
on element wrappers, to ease CSS selectors and DOM debugging.

## Edge cases

### Empty floors

A floor declared without any overlay element still renders (the
background image + an empty `<svg>` without `<fn-overlay-layer>`).
Sensible: a house plan can be informative visually even without
elements.

### Duplicate SVG IDs

The `.` → `-` normalisation in `entity_id` could theoretically create
collisions (`light.salon` and `light-salon` both become `light-salon`).
In practice, HA does not allow `-` in entity IDs, so the normalisation
is collision-free.

If the same `entity_id` appears in multiple overlays (use case "same
lamp in two different overlays"), the wrappers share the same ID. Minor
risk of selector ambiguity, but no functional bug. To revisit if this
use case becomes common in v0.2.0.

### Future refactor

If a new element type appears in v0.2.0+ (`badge`, `zone`), the pattern
`<fn-element-{type}>` continues to scale.

## Open questions

None.

## Decisions

No direct ADR on this topic. The `fn-` prefix was decided during the
initial design session (2026-05-01) without structuring debate.
