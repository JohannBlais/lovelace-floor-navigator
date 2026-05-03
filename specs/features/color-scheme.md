---
status: implemented
owner: Johann Blais
last_updated: 2026-05-04
related: [data-model.md, ../architecture/conventions.md]
---

# Colour Scheme

Element state colours and CSS variables exposed for customisation.
Frozen spec for v0.1.0.

## Context

Overlay elements (icons, text) must visually reflect HA entity state
without explicit configuration from the basic user. The HA standard has
per-domain colour conventions (yellow for lights, green for switches,
red for errors) that we follow. Advanced users must be able to override
via card-mod or via the Lovelace theme.

## Goals

1. Sensible default colours without configuration (HA standard pattern)
2. Exposed CSS variables with predictable names
3. Override possible via card-mod or Lovelace theme
4. Readability on light AND dark backgrounds (acceptable contrast
   ratio)

## Scope

### In

- Default colours per domain and state
- CSS variables exposed for override
- Variable naming pattern

### Out

- Dark-mode mechanism for background images (covered by
  `features/dark-mode.md` from v0.1.1)
- Config fields driving colours (no direct field — everything goes
  through CSS variables)

## Expected behaviour — Default colours

The component automatically applies colours based on the **entity
domain** and its **state**. The basic user has nothing to configure.

### Exposed CSS variables

```css
:host {
  /* Generic states */
  --fn-color-on:           rgb(255, 193, 7);    /* amber yellow, active state */
  --fn-color-off:          rgb(120, 120, 120);  /* grey, inactive state */
  --fn-color-unavailable:  rgb(180, 80, 80);    /* dark red */

  /* Domain-specific (override the generic) */
  --fn-color-light-on:     rgb(255, 193, 7);
  --fn-color-light-off:    rgb(120, 120, 120);
  --fn-color-switch-on:    rgb(76, 175, 80);
  --fn-color-switch-off:   rgb(120, 120, 120);
  --fn-color-binary_sensor-on:  rgb(33, 150, 243);
  --fn-color-binary_sensor-off: rgb(120, 120, 120);

  /* Text (overlay type "text") */
  --fn-color-text:         rgb(255, 255, 255);
  --fn-text-shadow:        0 0 4px rgba(0, 0, 0, 0.8);

  /* UI chrome */
  --fn-floor-indicator-bg:    rgba(0, 0, 0, 0.6);
  --fn-floor-indicator-color: white;
  --fn-overlay-button-bg:     rgba(0, 0, 0, 0.5);
  --fn-overlay-button-active-bg: rgba(255, 193, 7, 0.8);
}
```

## Expected behaviour — Resolution cascade

For a given entity, the colour-resolution algorithm:

```
1. Read the entity domain (light, switch, binary_sensor, sensor, ...)
2. Read the state (on, off, unavailable, or numeric value for sensors)
3. Look up --fn-color-{domain}-{state}
   ├── Found → use that colour
   └── Not found → fall back to --fn-color-{state} (generic)
4. If the state is neither on/off/unavailable, use the "on" colour by
   default (for sensors with a value)
```

Concrete examples:
- `light.salon` state `on` → resolves to `--fn-color-light-on` (amber
  yellow)
- `switch.cafetiere` state `on` → resolves to `--fn-color-switch-on`
  (green)
- `sensor.temperature` value `21.5` → resolves to `--fn-color-on`
  (generic amber yellow)

## Expected behaviour — User override

### Via card-mod (local style)

```yaml
card_mod:
  style: |
    :host {
      --fn-color-light-on: red;
    }
```

### Via Lovelace theme (global style)

```yaml
# themes.yaml
my_theme:
  fn-color-light-on: "#ff5500"
  fn-color-switch-on: "#00ff88"
```

The Lovelace theme applies at the `:root` level and is inherited by
every child component, so the `--fn-*` variables are accessible
automatically.

## Expected behaviour — Text

For elements of type `text`, two variables:

- `--fn-color-text`: font colour (white by default)
- `--fn-text-shadow`: drop shadow for readability over varied
  backgrounds (default: black shadow with 4px blur)

The shadow ensures good readability even on light plans (white wall
strips, for example). Override possible:

```yaml
card_mod:
  style: |
    :host {
      --fn-color-text: black;
      --fn-text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
    }
```

## Edge cases

### Non-standard custom state

An entity may have a non-standard state (e.g. `media_player` with
`playing`, `paused`, `idle`). Current behaviour: only `on`/`off`/
`unavailable` have specific colours. Others fall back to
`--fn-color-on` by default.

To extend in v0.2.0+ if needed via a richer
domain→states→colours mapping mechanism.

### Colours and accessibility

Default colours were chosen empirically, not through a formal contrast
ratio analysis. For users with accessibility needs, use a dedicated
Lovelace theme that overrides the variables with higher-contrast
colours.

### Conflict with HA dark/light theme

The global Lovelace theme can define CSS variables that conflict with
the component's. No reconciliation mechanism — the last override wins.
Conforms to standard CSS cascade.

### Colours and dark mode

Dark mode (v0.1.1) does not change state-colour CSS variables — only
the background image. Element colours stay the same in light and dark
mode (yellow for "light on" in both). If specific dark-mode colours
are wanted, the user can define them in a dark HA theme.

## Open questions

None.

## Decisions

No formal ADR. The default colours follow HA standard conventions
(notably the Material Design colours used by HA's native domain
icons).
