---
status: implemented
owner: Johann Blais
last_updated: 2026-05-06
related: [rendering-strategy.md, ../features/data-model.md, ../features/pan-zoom-interactions.md]
---

# Navigation

User-intent detection (desktop wheel, mobile swipe) and edge behaviour.
**Updated for v0.2.0**: PointerEvents + unified gesture state machine
that coexists with the pan-zoom transform engine
(see [`../features/pan-zoom-interactions.md`](../features/pan-zoom-interactions.md)).

## Context

The card's central value proposition is fluid navigation between
levels. This navigation must be:

- **Intuitive**: consistent direction convention across desktop/mobile
- **Reliable**: no accidental jump, no double trigger
- **Responsive**: transitions immediate on gesture, no perceived
  latency
- **Discriminated**: a swipe must not trigger an element tap, and vice
  versa

## Goals

1. Desktop wheel: 1 wheel notch = 1 floor change, never 2
2. Mobile swipe: clear threshold to distinguish scroll vs intentional
   swipe
3. "Scroll-aligned" convention: down → next in the list
4. Configurable edge behaviour at the boundaries (bounce / none / loop)
5. No interference with element tap_actions

## Scope

### In

- Wheel detection + throttle
- Touch swipe detection
- Edge behaviour at the boundaries
- Tap vs swipe discrimination

### Out

- Transition animations (see
  [`rendering-strategy.md`](rendering-strategy.md))
- Config fields (see [`../features/data-model.md`](../features/data-model.md))
- Keyboard shortcuts (PageUp/PageDown) → deferred to v0.2.0+

## Expected behaviour — Wheel detection (desktop)

- `wheel` listener on the controller host
- Throttle to avoid multiple jumps: 1 floor change per 400ms minimum
- **No modifier**: `deltaY > 0` → NEXT floor (`currentFloorIndex + 1`),
  `deltaY < 0` → PREVIOUS floor (existing v0.1.x behaviour)
- **`Ctrl+wheel` / `Cmd+wheel` (v0.2.0+)**: zoom around cursor — see
  [`../features/pan-zoom-interactions.md`](../features/pan-zoom-interactions.md).
  Wheel navigation is suppressed in this branch (no floor change).

The throttle is implemented via a local timestamp variable
(`_lastNavigationTime`) without `setTimeout` to avoid leaks.

## Expected behaviour — Pointer-based gesture state machine (v0.2.0+)

Updated in v0.2.0: the controller no longer uses
`touchstart/move/end` + `touch-action: none`. It subscribes to
`PointerEvents` (`pointerdown`, `pointermove`, `pointerup`,
`pointercancel`, `pointerleave`) on a `.gesture-area` wrapper inside
the controller's shadow DOM. PointerEvents unify mouse, touch, and
pen handling, and let pinch coexist with single-pointer swipe / pan
inside the same handler.

`touch-action: none` stays on the controller's host: it prevents the
browser from interpreting touches as native scroll / pinch (which
would conflict with our handlers), without suppressing click
synthesis on tap.

### Gesture states

The controller owns a `_gestureState` field with the following
transitions:

```
            pointerdown (1 ptr)
   IDLE ────────────────────────→ TAP
                                   │
              pointerup            │ pointermove > 10px
              < 600ms ─────────────┤
              same target          │
              within 300ms          ▼
              → DOUBLE-TAP   SWIPE (scale === 1)  /  PAN (scale > 1)
                                   │
                                   │ second pointerdown
                                   ▼
                                  PINCH (2 pointers)
                                   │
                                   │ one pointer up
                                   ▼
                          PAN (if scale > 1) / IDLE
```

### Single-pointer cases

- `scale === 1`: a 1-pointer drag with `|displacement| > 50 px` OR
  velocity `> 0.3 px/ms` triggers floor navigation (existing
  v0.1.x semantics, scroll-aligned: down → next).
- `scale > 1`: a 1-pointer drag is a pan, translating the
  `Transform` state by the screen-delta converted to viewBox units.
  No floor navigation.

### Two-pointer pinch

Tracks initial centroid / distance / transform `(c0, d0, T0)`. On
each move, computes the new scale `T0.scale × (d / d0)` clamped to
`[zoom_min, zoom_max]`, and applies a zoom-around-anchor formula
that keeps the viewBox point initially under `c0` aligned with the
current centroid. See `applyZoomAnchor` in
[`src/utils/transform.ts`](../../src/utils/transform.ts).

### Tap discrimination

Browsers do not synthesise `click` when `touchend`/`pointerup` is
> ~10 px away from the start. Existing v0.1.x icon click handlers
(`fn-element-icon`) continue to fire for sub-10 px taps. Combined
with the controller's 50 px swipe threshold, the "ambiguous zone"
(10–50 px) triggers neither — a desirable filter for accidental
gestures.

### Double-tap detection

A second tap landing within 300 ms and 30 px of the first toggles
zoom (`zoom_double_tap_scale` if currently at scale 1, identity
otherwise). Suppressed when the tap started on an overlay element
(`FN-ELEMENT-ICON` / `FN-ELEMENT-TEXT`) so the element's click
handler runs normally.

## Expected behaviour — Edge behaviour

`settings.edge_behavior` controls what happens when the user tries to
navigate past the last or first floor.

### `bounce` (default)

- CSS "bounce" animation (~150ms, back-out easing, 20px amplitude)
  applied to the current floor
- No effective floor change (`currentFloorIndex` stays constant)
- Implicit visual feedback: the user understands they have hit the
  boundary

### `none`

Nothing happens. No animation, no feedback. For setups where parasitic
animation distracts.

### `loop`

Wrap to the opposite floor: at the last floor scrolling down returns
to the first floor (and vice versa). Carousel-style infinite
behaviour.

## Expected behaviour — Tap vs swipe discrimination

The challenge: tapping an overlay element triggers its `tap_action`
(toggle, more-info, etc.), but a swipe initiated on that element must
trigger navigation, not the action.

### Mechanism leveraged

Browsers do **not** synthesise a `click` event when `touchend` is more
than ~10px away from `touchstart`. Therefore:

- Short tap on an element (movement < 10px) → native click event →
  `<fn-element-icon>` catches it → `handleAction` called
- Long swipe on an element (movement > 50px) → no native click →
  `<fn-element-icon>` catches nothing → only the controller sees the
  gesture and navigates

The browser's native threshold (~10px) is stricter than our swipe
threshold (50px), so the "ambiguous zone" between 10 and 50px triggers
**neither** tap **nor** swipe (nothing happens). Acceptable, even
desirable behaviour (filters accidental gestures).

### Defensive guard

`<fn-element-icon>` calls `e.stopPropagation()` in its click handler
to prevent the controller from also catching the event and navigating.
Not strictly necessary given the browser mechanism above, but protects
against future behaviours (hold_action, etc.).

## Edge cases

### Pinch-to-zoom gesture (obsolete since v0.2.0)

In v0.1.x a 2-finger gesture cancelled tracking via the multi-finger
guard (`e.touches.length === 1`). v0.2.0 replaces this: 2+ active
pointers enter the PINCH state (zoom + pan via centroid) instead of
being suppressed. See
[`../features/pan-zoom-interactions.md`](../features/pan-zoom-interactions.md).

### Tap on an overlay button while swiping

If the user starts a swipe with the finger on an overlay-bar button,
the browser does not synthesise a click → navigation occurs, the
button is not toggled. Current behaviour = "swipe wins over tap if
movement > 50px" semantics. Consistent.

See BACKLOG.md at the repo root for a candidate fix (filter the swipe
tracking when `e.target` is inside `<fn-overlay-buttons>`).

### Wheel on a MacBook trackpad

MacBook trackpads emit `wheel` events at very high frequency (mixed
horizontal/vertical ratios). The 400ms throttle handles this well: 1
full trackpad swipe = 1 floor change, as expected.

### `none` navigation mode

`settings.navigation_mode: none` fully disables navigation (neither
wheel nor swipe). The card becomes a static dashboard with only the
start floor. Rare but valid use case.

## Open questions

None.

## Decisions

No formal ADR. The thresholds (50px displacement, 0.3px/ms velocity,
400ms throttle, 150ms bounce) were calibrated empirically on a Pixel 9
Pro XL and a desktop machine during development. Adjustable without
spec change if user feedback warrants.
