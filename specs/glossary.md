---
status: validated
owner: Johann Blais
last_updated: 2026-05-04
related: []
---

# Glossary

Domain terms used in the project and its specs. Does not list general
technical terms (Lit, TypeScript, Rollup, etc.) or HA standard terms
(entity_id, hass, service) which are defined elsewhere.

## Core concepts

### Floor

A level of the house. Represented by a background image (PNG, JPG or
SVG) and a logical id (`L0`, `L1`, `L-1`, etc.). Floors are declared
as an ordered list from TOP to BOTTOM in the actual house. Example:
`[L2, L1, L0, L-1]` for a 4-level house with the office, first floor,
ground floor, and cellar.

Order matters: scrolling down moves through the list (scroll-aligned).

### Overlay

A layer of information transverse across floors. Contains elements
positioned on the plans that share a theme (lights, temperatures,
presence, infrastructure). The same overlay can have elements on
multiple floors.

Overlays are **toggleable** independently via the button bar at the
bottom of the card.

### Element

A single information point inside an overlay. Linked to a Home
Assistant entity, positioned in viewBox coordinates on a given floor,
with a type (`icon` or `text` in v0.1.0) and optionally a
`tap_action`.

### viewBox

Global coordinate system of the card, in standard SVG format
(`"x_min y_min width height"`). All element positions are expressed
in this system. Typical choice for house plans: `"0 0 1920 1080"`.

The viewBox system isolates plan positions from the card's actual
on-screen dimensions: the card can be resized while the viewBox stays
constant and element positions remain consistent.

## Navigation concepts

### Transition

Animation between two floors on a change. Three variants available
in v0.1.0:

- `crossfade` (default): fade between the two floors
- `slide`: vertical translation, the new floor pushes the old one
- `slide-scale`: translation + subtle zoom

### Edge behaviour

Behaviour when the user tries to navigate past the last or first
floor.

- `bounce` (default): bounce animation, no floor change
- `none`: nothing happens
- `loop`: wrap to the opposite floor (L0 ↔ Ln)

### Scroll-aligned

Navigation direction convention: scroll/swipe DOWN = NEXT floor in
the configuration list. Consistent with classic page-scroll
behaviour: you scroll down to go down in the house.

## Visual concepts

### Pastille

Coloured circle that renders an element icon (type `icon`). The
colour encodes the entity state (on/off, occupied/empty, etc.) via
the component's CSS variables.

### Halo

Light ring around the pastille (typically translucent white) that
improves icon readability over varied backgrounds. Material Design
pattern.

### Indicator

Small floating pill at the bottom-right that shows the current
floor's `name`. Visible by default, can be disabled via
`settings.show_floor_indicator: false`.

### Overlay buttons (bar)

Bar of buttons toggling each overlay's visibility. Position
configurable (`top`, `bottom`, `none`) via
`settings.overlay_buttons_position`.

## Naming conventions

### `fn-` prefix

Every custom element and SVG ID in the component uses the `fn-`
(Floor Navigator) prefix. Avoids collisions with other Lovelace
components co-existing on the same dashboard.

Examples: `<fn-floor>`, `<fn-element-icon>`,
`id="fn-floor-L0-bg-default"`, `--fn-color-on`.

### `--fn-*` CSS variables

Every CSS variable exposed by the component for customisation uses
the `--fn-` prefix. Documented in
[`features/color-scheme.md`](features/color-scheme.md).

## Project-specific terms

### HACS pattern

Conventions shared by HACS-ecosystem custom cards, without being
mandatory. Covers: `-card` suffix on custom elements, version
exposure via `console.info` at load, registration via
`window.customCards.push()`, `hacs.json` manifest. See
[`architecture/identity.md`](architecture/identity.md).

### Quick dev mode

Local development workflow that opens `dev/index.html` in the
browser with a `hass` mock object, no real HA dependency. Allows
iterating on visuals and logic in seconds. See
[`architecture/dev-workflow.md`](architecture/dev-workflow.md).

### Integration test mode

Workflow using the `HA_LOCAL_DIR` convention to make Rollup write
the bundle directly into HAOS's `www/` folder via Samba share.
Allows testing on real HA against real entities. See
[`architecture/dev-workflow.md`](architecture/dev-workflow.md).
