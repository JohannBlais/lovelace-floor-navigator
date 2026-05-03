---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [rendering-strategy.md, ../features/data-model.md]
---

# Navigation

User-intent detection (desktop wheel, mobile swipe) and edge behaviour.
Frozen spec for v0.1.0.

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

- `wheel` listener on the root container (`<floor-navigator-card>`)
- Throttle to avoid multiple jumps: 1 floor change per 400ms minimum
- `deltaY > 0` → NEXT floor in the list (`currentFloorIndex + 1`)
- `deltaY < 0` → PREVIOUS floor (`currentFloorIndex - 1`)

The throttle is implemented via a local timestamp variable
(`_lastNavigationTime`) without `setTimeout` to avoid leaks.

## Expected behaviour — Swipe detection (mobile/touch)

- `touchstart` / `touchmove` / `touchend` listeners on the root
  container
- Track vertical displacement (`deltaY = touch.clientY - startY`)
  during `touchmove`
- On `touchend`, trigger navigation if:
  - `|deltaY| > 50` (px minimum displacement)
  - **OR** velocity `|deltaY| / duration > 0.3` (px/ms)
- Down direction (deltaY > 0) → NEXT floor
- Up direction (deltaY < 0) → PREVIOUS floor

The dual criterion (displacement OR velocity) handles two cases:
- Slow long gesture: displacement crosses the threshold
- Fast short gesture: velocity crosses the threshold

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

### Pinch-to-zoom gesture

A 2-finger gesture (native iOS/Android zoom) must not trigger
navigation. `touchstart` records `e.touches.length === 1` as the
condition for engaging tracking. If multiple fingers are down,
tracking is cancelled.

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
