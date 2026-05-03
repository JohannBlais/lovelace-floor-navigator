---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [data-model.md, ../architecture/component-tree.md]
---

# Overlays Toggle

Visibility-toggle mechanism for overlays. Local non-persisted state in
v0.1.0, v0.2.0+ extension toward HA binding. Frozen spec for v0.1.0.

## Context

Overlays group elements by theme (lights, temperatures, presence,
infrastructure). The user wants to be able to show/hide each overlay
independently to reduce visual density when only interested in one
topic at a time.

For v0.1.0 we keep it simple: local state held during the session,
reset per `default_visible` on every reload. More advanced use cases
(syncing across multiple dashboards, persisting between sessions) are
deferred to v0.2.0+ via binding to HA entities.

## Goals

1. Overlay toggle in one click, immediate visual feedback
2. Initial state driven by config (`default_visible`)
3. No surprise: the user knows it is local and not persisted
4. Mechanism extensible to HA binding in v0.2.0+ without breaking the
   API

## Scope

### In

- v0.1.0 local state mechanism
- Initialisation from `default_visible`
- UI button bar
- Extension pattern for v0.2.0+ (binding to `input_boolean`)

### Out

- The UI component itself (see
  [`../architecture/component-tree.md`](../architecture/component-tree.md)
  for `<fn-overlay-buttons>`)
- Config fields (see [`data-model.md`](data-model.md))

## Expected behaviour — v0.1.0 local state

### Storage

State held in a `@state() visibleOverlays: Set<string>` on the root
component `floor-navigator-card`.

The `Set<string>` contains the ids of overlays currently visible.

### Initialisation

On the first render after `setConfig()`:

```
visibleOverlays = new Set(
  config.overlays
    .filter(o => o.default_visible === true)
    .map(o => o.id)
)
```

Overlays with `default_visible: true` are visible at startup. Others
(default `false`) are hidden.

### Mutation

Buttons in the `<fn-overlay-buttons>` bar emit a custom `overlay-toggle`
event with the overlay id. The root component intercepts and updates
`visibleOverlays`:

```
toggleOverlay(id) {
  const next = new Set(visibleOverlays);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  visibleOverlays = next;  // new reference for Lit reactivity
}
```

The new reference (`new Set(...)`) is required so Lit detects the
change and re-renders (no in-place mutation).

### Propagation

`visibleOverlays` is passed down as a prop to `<fn-floor>`, then to
`<fn-overlay-layer>`. Each overlay layer applies `display: none` or
`display: block` depending on whether its id is in the Set.

### Persistence

**Not persisted** in v0.1.0. State lost on page refresh, reset per
`default_visible` on every load. Behaviour assumed for v0.1.0 —
extension planned.

## Expected behaviour — UI

### Button bar

The `<fn-overlay-buttons>` bar is positioned at the bottom (default)
or top, or hidden, per `settings.overlay_buttons_position`.

For each declared overlay, one button:
- Shows the icon (`overlay.icon`, default `mdi:layers`)
- Shows the label (`overlay.name`)
- Visual "active" state if the id is in `visibleOverlays`
- Tap → emits `overlay-toggle` with the id

### Button styling

An active button has the background `--fn-overlay-button-active-bg`
(translucent amber yellow by default). An inactive button has the
background `--fn-overlay-button-bg` (translucent black by default).
See [`color-scheme.md`](color-scheme.md) for the CSS variables.

### `overlay_buttons_position: none`

If `none`, the bar is not rendered. The user has no interactive way to
toggle overlays (other than custom code). Rare use case: locked
dashboards where the config defines what is visible and the user
cannot change it.

## Expected behaviour — v0.2.0+ extension (HA binding)

Forward-looking spec to avoid breaking the API in v0.2.0. **Not
implemented in v0.1.0.**

### Config field

Optional addition of a `visible_entity` field at the overlay level:

```yaml
overlays:
  - id: lights
    name: Lights
    default_visible: true
    visible_entity: input_boolean.show_lights_overlay  # new in v0.2.0+
    elements: [...]
```

### Behaviour

- If `visible_entity` is defined: visibility is read from the HA
  entity state (`on`/`off`). The UI toggle updates the entity via
  service call (`input_boolean.toggle`). State synced across
  dashboards and persistent.
- If `visible_entity` is not defined: v0.1.0 behaviour (local state).

Perfect backward compatibility: v0.1.0 configs without
`visible_entity` work unchanged.

## Edge cases

### No overlays

`overlays: []` or `overlays` absent. Behaviour:
`<fn-overlay-buttons>` is not rendered (empty bar hidden). No error,
just a card without interactive overlays.

### All overlays hidden at start

All overlays have `default_visible: false` (or unspecified). At load,
no element is visible on the plans. The button bar is rendered with
all buttons inactive. The user clicks to activate.

### Duplicate overlay id

Two overlays with the same `id`. Behaviour: the `Set<string>` does
not distinguish duplicates, so toggling one toggles the other. No
explicit error. YAML good practice: unique ids (validated manually,
no runtime validation in v0.1.0).

### Toggle during a transition

The user clicks an overlay button while a floor transition is in
progress. Behaviour: the toggle applies immediately, the overlay
becomes visible/hidden on every floor. The floor transition continues.
No visual conflict.

### `default_visible` modified at runtime

The user edits their Lovelace config and changes `default_visible:
true` to `false`. Behaviour: on the next `setConfig()` (dashboard
reload), `visibleOverlays` is re-initialised per the new value.
Previous state lost. Consistent with "no persistence".

## Open questions

None.

## Decisions

No formal ADR. The "v0.1.0 local state + v0.2.0+ entity binding"
choice lets us ship a minimal functional feature quickly and extend
it cleanly when the need for synchronisation arises. Recurring
pattern in the custom cards ecosystem (cf. button-card which
followed a similar path).
