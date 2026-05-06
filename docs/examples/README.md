# Floor Navigator — examples

Drop-in YAML configurations to copy/paste into your Lovelace dashboard.

| File | Purpose |
|------|---------|
| [`minimal.yaml`](minimal.yaml) | Bare-minimum config: one floor, no overlays. Use this to confirm the card loads with your floor plan image before wiring entities. |
| [`full-house.yaml`](full-house.yaml) | Comprehensive config: 3 floors, 5 overlays (lights, outlets, temperatures, presence, network), every `tap_action` variant exercised. Updated to the v0.2.0 `overlay_size_unit: px` baseline. |
| [`mobile-ux.yaml`](mobile-ux.yaml) | **v0.2.0** — every setting from the mobile UX overhaul shipped together (overlay readability, pan-zoom, fullscreen) commented inline. Use this as the reference when tuning the v0.2.0 knobs for your layout. |
| [`themed.yaml`](themed.yaml) | Same shape as the minimal config, but with [card-mod](https://github.com/thomasloven/lovelace-card-mod) overriding every exposed CSS variable for a neon-on-dark theme. Useful as a reference for what is themable. |
| [`dark-mode.yaml`](dark-mode.yaml) | **v0.1.1** — `backgrounds: { default, dark }` per floor + `settings.dark_mode` switch. Demonstrates the extended form, the short form (backward-compatible), and the graceful fallback when a floor has no dark variant. |

All examples assume your floor plans live under
`<config>/www/floor-plans/` (served at `/local/floor-plans/...`).
Adjust the `background` paths to match your setup.

For the full configuration schema, see the
[project README](../../README.md#configuration) or the
[data-model spec](../../specs/features/data-model.md).
