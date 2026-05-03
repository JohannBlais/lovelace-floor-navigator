---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [component-tree.md, navigation.md]
---

# Rendering Strategy

DOM/CSS rendering strategy and Lit reactive-update mechanism. Frozen
spec for v0.1.0.

## Context

A multi-floor card with fluid navigation raises two technical
questions:

1. **How do we stack N floors and switch between them** without a
   visible flash, while keeping transitions performant?
2. **How do we re-render only the elements whose entity has changed**,
   without re-rendering the entire card on every HA update?

The choices made here determine perceived performance and code
simplicity. Three rendering strategies were considered before settling
on the hybrid option.

## Goals

1. Smooth 60fps transitions even on mid-range mobile
2. Granular re-render: only the affected element re-renders when its
   entity changes
3. Predictable code: no magic, the developer can follow the flow
4. No memory leaks: listeners and watchers are cleaned up in
   `disconnectedCallback`

## Scope

### In

- Floor stacking strategy in the DOM
- Lit reactive-update mechanism
- CSS animation strategy for transitions

### Out

- Wheel/swipe detection logic (see [`navigation.md`](navigation.md))
- Component details (see [`component-tree.md`](component-tree.md))

## Expected behaviour — Strategy 3 (hybrid)

The three strategies considered:

1. **Mount/unmount on every change**: only the current floor lives in
   the DOM, replaced on each change → simple but flash + image
   re-fetch on every navigation
2. **All floors in the DOM, only one visible**: all rendered, the
   non-current ones in `display: none` → no flash, but transitions
   impossible (no CSS transition on display)
3. **Hybrid (chosen)**: all floors in the DOM, stacked via CSS
   `position: absolute` at the same origin, with `transform` and
   `opacity` for transitions

### CSS mechanism

- All `<fn-floor>` elements are `position: absolute` at `top: 0; left: 0`
- Three classes drive the state:
  - `fn-floor-active`: current floor, visible
  - `fn-floor-prev`: floor above in the list, off-screen at the top
  - `fn-floor-next`: floor below in the list, off-screen at the bottom
- Transitions are CSS animations on `transform` and `opacity` per the
  chosen mode (`crossfade`, `slide`, `slide-scale`)

### Transition choice

The mode is driven by `settings.transition` (default `crossfade`). The
`fn-navigation-controller` applies the appropriate classes per mode and
direction (up/down). Keyframes are defined in the CSS of
`card-styles.ts`.

## Expected behaviour — Reactive updates

Chosen approach: **reactive properties per element**.

- `<fn-element-icon>` and `<fn-element-text>` are LitElements with
  `@property() hass: HomeAssistant`
- Lit re-renders only the elements whose entity changed between two
  `hass` updates
- Standard HA pattern, identical to Mushroom and Mini-Graph

### Mechanism

The root component `floor-navigator-card` receives `hass` via the HA
setter, passes it to `<fn-navigation-controller>`, which broadcasts it
to `<fn-floor>`, then `<fn-overlay-layer>`, then to the elements. On
every update:

1. Lit compares old vs new `hass`
2. For each element, Lit's native `shouldUpdate` triggers a re-render
   only if the element's tracked entity actually changed
3. The SVG DOM of only the affected element is patched

### Cost

For ~50 simultaneously active elements (order of magnitude for a
fully-configured house), no perceptible jank measured at profiling.
For very large configs (~200+ elements), a per-element optimisation
would be worth considering (forking the current `<fn-element-text>`
which depends on parent re-render); see BACKLOG.md.

## Edge cases

### First render

On the very first render, no floor yet has the `fn-floor-active`
class. The `fn-navigation-controller` initialises state at mount with:
- `currentFloorIndex` = index of the floor declared in
  `settings.start_floor` (or 0 if not specified)
- Immediate class application without animation (CSS transition
  temporarily disabled via a `fn-no-transition` class, removed after
  the first paint)

### Single floor

If `floors` contains only one floor, navigation is disabled at the
controller level (early return in the wheel/touch handler). The floor
indicator stays visible if `show_floor_indicator: true`.

### More than 5 floors

The DOM contains all floors, so 10+ floors = 10+ images in memory. For
plans that are 100–500 KB each, this stays under 1 MB. No hard limit
imposed.

### Card resize

The SVG viewBox system isolates positions from the actual display
dimensions. The card can be resized without breaking element
positions. The browser scales the SVG content automatically.

## Open questions

None.

## Decisions

Strategy 3 chosen during the initial design session (2026-05-01)
without a formal ADR — the alternatives were inferior on every
relevant criterion.
