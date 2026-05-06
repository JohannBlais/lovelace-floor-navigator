---
status: implemented
owner: Johann Blais
last_updated: 2026-05-06
related: [overlays-toggle.md, data-model.md, pan-zoom-interactions.md, overlay-readability.md, ../architecture/component-tree.md]
---

# Mobile Fullscreen Mode

Explicit user-triggered fullscreen mode for the card. Lets the user
escape the Lovelace grid sizing and use the entire viewport for the
plan and its controls. Spec for **v0.2.0**.

## Context

v0.1.0 follows the Lovelace grid-sizing convention: the card occupies
the slot it is placed in, and its dimensions follow the dashboard
column width. On a phone in portrait, this typically gives a card
~390px wide and a height proportional to the viewBox aspect ratio
(~220px for a 1920×1080 plan), leaving the lower two-thirds of the
screen empty. Overlay icons and texts shrink to a few pixels each.
In landscape, the card is height-clipped by the surrounding row,
hiding the overlay button bar at the bottom.

The user needs a way to **temporarily promote the card to the full
viewport** to inspect details, interact with overlay elements, or
explore the plan with pan-zoom (see
[`pan-zoom-interactions.md`](pan-zoom-interactions.md)).

The fullscreen mode also benefits desktop users with detailed plans
or presentation contexts (showing the dashboard on a TV, demoing to
visitors).

This spec is **independent** of pan-zoom and overlay-readability,
but the three together form the v0.2.0 mobile UX overhaul (see
ADR-006 in [`../decisions.md`](../decisions.md)).

## Goals

1. Explicit, user-triggered entry into fullscreen — never automatic
2. Zero state loss across enter/exit (overlays, current floor, zoom)
3. Multiple exit paths (button, Escape, browser back) to avoid
   trapping the user
4. Works inside HA companion app, Lovelace iframes, and standalone
   browser sessions
5. Backward-compatible: existing v0.1.x configs gain the feature with
   sensible defaults, no breaking change

## Scope

### In

- New floating "Expand" button rendered as an overlay on the card
- CSS-based fullscreen via `position: fixed; inset: 0; z-index: 9999`
- Configurable button position (4 corners) and visibility
  (`auto | always | never`)
- Multiple exit paths: close button, Escape key, browser back button
- State preservation across the transition (overlays, floor, theme,
  zoom)
- Body scroll lock while fullscreen is active
- Repositioning of `<fn-overlay-buttons>` to the viewport edges in
  fullscreen
- Floor indicator stays visible at the viewport edge in fullscreen

### Out

- Native browser Fullscreen API (`element.requestFullscreen()`) — not
  reliable inside Lovelace iframe contexts and the HA companion app
- Auto-fullscreen on small viewports — explicit opt-in only, per
  ADR-006
- Persisting fullscreen state across page reloads — transient by
  design
- Multiple cards in fullscreen simultaneously — last one wins via
  z-index (no explicit handling)
- Custom transition animation when entering/exiting — instant snap
  to keep the implementation simple

## Expected behaviour

### Expand button

A floating button is rendered as an SVG overlay on the card root,
above the floor stack and below the overlay buttons.

- **Icon**: `mdi:fullscreen` when not fullscreen, `mdi:fullscreen-exit`
  when fullscreen
- **Default position**: top-right corner of the card
- **Style**: 36×36 px target, semi-transparent dark background
  (`var(--fn-button-bg)`, same as overlay buttons), rounded
- **Tap action**: toggle fullscreen state on the card root component

### Visibility heuristic

Controlled by `settings.fullscreen_button`:

| Value | Visible on |
|---|---|
| `auto` (default) | Always visible, on all viewports |
| `always` | Always visible (alias for `auto` in v0.2.0) |
| `never` | Never rendered |

The breakpoint heuristic mentioned in ADR-006
(`(max-width: 768px) and (pointer: coarse)`) is **not** used to gate
the button itself. The button is always available — the breakpoint
only affects defaults for other features (overlay-readability mode,
zoom slider visibility). The user can always trigger fullscreen on
desktop too.

### Entering fullscreen

On button tap:

1. Add class `fn-fullscreen` on the `<floor-navigator-card>` root
2. CSS rule applies:
   ```css
   .fn-fullscreen {
     position: fixed;
     inset: 0;
     z-index: 9999;
     background: var(--card-background-color);
   }
   ```
3. Lock body scroll: `document.body.style.overflow = 'hidden'`
   (saved previous value, restored on exit)
4. Push a history state entry: `history.pushState({ fnFullscreen: true }, '')`
5. Register a one-shot `popstate` listener that exits fullscreen
   when the user presses browser back
6. Register a one-shot `keydown` listener on `document` that exits
   fullscreen when Escape is pressed

### Exiting fullscreen

Exit triggers (any of):

- Tap on the close button (same button, now showing `mdi:fullscreen-exit`)
- Press Escape (desktop only — phones rarely have a hardware
  Escape key, soft-keyboard Escape varies)
- Browser back button / Android back gesture

On exit:

1. Remove the `fn-fullscreen` class
2. Restore body overflow to its previous value
3. Pop the history state if still present (`history.back()` if exit
   was *not* triggered by browser back)
4. Detach the popstate and keydown listeners
5. Animate the card back into its grid slot is **not** done — instant
   snap (acceptable, matches the entry behaviour)

### State preservation

The fullscreen toggle is **purely visual**. The card root's reactive
state (`visibleOverlays`, `currentFloorIndex`, `currentTheme`, and
the zoom `Transform` once pan-zoom ships) is untouched. Lit
re-renders the same DOM tree, only the surrounding CSS changes.

Consequence: zooming into a corner of L0, entering fullscreen, then
exiting, lands the user back on the same zoomed view of L0 in the
embedded card.

### Overlay buttons in fullscreen

The `<fn-overlay-buttons>` bar is repositioned to the **viewport**
edges (not the card's original edges) when fullscreen.

- `overlay_buttons_position: bottom`: bar at viewport bottom, full
  width, sticky
- `overlay_buttons_position: top`: bar at viewport top, full width,
  sticky
- `overlay_buttons_position: none`: bar not rendered (unchanged)

Background: semi-transparent dark
(`background: rgba(0, 0, 0, 0.6)`), to stay readable over varied
plan colours.

### Floor indicator in fullscreen

`<fn-floor-indicator>` stays at viewport bottom-right (or follows
`show_floor_indicator: true/false` as before).

### Body scroll lock

While fullscreen is active, the page underneath must not scroll.
Set on `document.body` (and `document.documentElement` for safari):

```js
this._previousBodyOverflow = document.body.style.overflow
document.body.style.overflow = 'hidden'
```

Restored on exit. Saved as a per-instance property to handle the
edge case of multiple cards.

### History integration

Pushing a history state entry on enter ensures the Android / iOS back
gesture exits fullscreen rather than leaving the dashboard. The
listener is one-shot: detached as soon as the popstate fires (or on
exit through any other path, in which case `history.back()` is called
explicitly).

## Configuration

New fields in `settings`:

| Field | Type | Default | Description |
|---|---|---|---|
| `fullscreen_button` | enum | `auto` | `auto`, `always`, `never` |
| `fullscreen_button_position` | enum | `top-right` | `top-right`, `top-left`, `bottom-right`, `bottom-left` |

To be merged into [`data-model.md`](data-model.md) at implementation
time.

## Edge cases

### Multiple cards on the same dashboard, both fullscreen-attempted

User has 2 floor-navigator cards on a dashboard. They tap the expand
button on card A, then on card B without exiting A first. Behaviour:
both cards have `fn-fullscreen` class. Both are `position: fixed;
inset: 0` with `z-index: 9999`. Last-painted wins (the order in the
DOM, typically B). Card A is hidden behind B.

When B exits, A becomes visible again (still fullscreen). Acceptable
edge case — the UX is "both are fullscreen, last wins, exit one at a
time". No explicit handling.

### Card already in a Lovelace popup / dialog

User has the card inside a Mushroom popup. Tapping expand still works
— the `fn-fullscreen` class is on the card root, `position: fixed`
escapes the popup's stacking context (assuming z-index 9999 > popup
z-index, which is typically the case for HA dialogs at z-index ~1000).

### HA companion app on iOS / Android

Companion app embeds Lovelace in a WebView. CSS-based fullscreen
works (no Fullscreen API permission needed). Native back gesture
caught by the `popstate` listener — confirmed pattern, used by other
Lovelace cards.

### Card reload while fullscreen (HA reconnect)

HA disconnects, reconnects. Lovelace re-instantiates the card.
`connectedCallback` runs, but `fn-fullscreen` class is gone, history
state is gone. Card reverts to embedded view. Acceptable — rare event,
and the user can just tap expand again.

### `setConfig` called during fullscreen

User edits the dashboard YAML while the card is fullscreen. HA pushes
a new config. The card re-validates and re-initialises state, but the
`fn-fullscreen` class on the DOM root persists (Lit doesn't re-render
the host element). Behaviour: stays fullscreen. Acceptable.

### `fullscreen_button_position` collision with `overlay_buttons_position`

User sets `fullscreen_button_position: bottom-right` and
`overlay_buttons_position: bottom`. The expand button overlaps the
overlay bar's right edge. Behaviour: button on top (higher z-index),
slight visual collision but functionally fine. Acceptable v0.2.0
trade-off; can document a recommended pairing in the YAML examples.

### User taps expand button mid-swipe

Single-finger drag started on the expand button. Browser native
behaviour: the button receives `pointerdown`, but the swipe threshold
in `<fn-navigation-controller>` requires displacement on the floor
stack, not on the button. The button's click handler runs on
`pointerup` if displacement < ~10px. Otherwise, the swipe is ignored
because `e.target` is the button. To verify at implementation:
either `e.stopPropagation()` on the button's `pointerdown`, or
`closest('.fn-fullscreen-button')` filter in the controller's swipe
guard.

### Pan-zoom state at entry/exit

When [`pan-zoom-interactions.md`](pan-zoom-interactions.md) ships,
the `Transform` state lives on the card root. Fullscreen toggle does
not touch it. The user enters fullscreen at scale 2.5 with a pan
offset, exits, and finds the same scale and pan in the embedded view.
However, because the embedded card is much smaller, the same
transform looks different (more aggressive crop). Acceptable — the
transform is in viewBox-relative units, behaviour is consistent.

### Browser back button before history state pushed

Fullscreen entry pushes a history state. If the user taps the
browser back button **before** the entry completes (very fast tap),
the listener may not be attached yet. Acceptable race — `pushState`
is synchronous in practice, listener attached in the same tick.

## Open questions

- Should the expand button be hidden when the card is at full
  viewport size already (e.g. user dropped the card in a 12-column
  Lovelace row, occupying the whole width)? **Status: deferred at
  implementation (2026-05-06)** — kept always visible by default;
  users can disable via `fullscreen_button: never` for a clean look.
  Detection complexity not justified by current use cases.
- Animation on entry / exit? **Status: deferred at implementation
  (2026-05-06)** — instant snap shipped, as spec'd. Animation can
  be added in v0.2.x if visual feedback turns out to be worth the
  layout-reflow complexity.
- Aspect-fit layout for the floor stack inside fullscreen.
  **Status: confirmed at implementation (2026-05-06)** — without
  it, in landscape mobile the plan still overflows because
  `width:100%; aspect-ratio` makes `.stack` taller than the
  viewport. The fullscreen mode applies `:host(.fullscreen)` CSS
  on `<fn-floor-stack>` that switches to height-driven sizing
  (`height:100%`, `width:auto`, aspect preserved via inline
  `aspect-ratio` attribute), giving an "object-fit: contain"
  result inside the flex column.

## Decisions

- **CSS-based fullscreen rather than Fullscreen API**: HA companion
  app and Lovelace iframe contexts make the Fullscreen API
  unreliable (permission policy, sandbox attributes). CSS
  `position: fixed; inset: 0; z-index: 9999` works universally, no
  permission prompt, no platform-specific quirks.
- **Explicit button rather than auto-fullscreen on tap**: avoids
  false triggers when the user wants to interact with overlay
  elements. Per ADR-006 arbitration #1.
- **Always-visible button by default** (across desktop and mobile):
  low cost (small icon in a corner), useful for presentations and
  large plans on desktop too. Per ADR-006 arbitration.
- **Multiple exit paths**: button + Escape + browser back. Avoids
  trapping the user, especially in companion app contexts where
  Escape is unavailable.
- **History state push for back-button integration**: standard
  pattern across Lovelace cards (Mushroom modal, HA more-info
  dialog) — ensures Android back gesture exits fullscreen rather
  than the dashboard.
- **Instant snap rather than animated transition**: simpler
  implementation, predictable timing, no layout-reflow jank.
  Animation can be added in v0.2.x if needed.
