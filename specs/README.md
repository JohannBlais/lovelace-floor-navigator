---
status: validated
owner: Johann Blais
last_updated: 2026-05-06
related: []
---

# Specs — lovelace-floor-navigator

This folder contains the project's living specs. Each file describes a
frozen decision, a feature, or a transverse convention. Specs are
versioned alongside the code, and each file's status reflects the real
state of implementation.

> **Note for Claude Code**: before any code change, read the relevant
> spec file(s). If an inconsistency is spotted between the spec and the
> code, log it in `open-questions.md` rather than deciding alone.

## Vision

Lovelace card for Home Assistant that turns 2D house plans into an
interactive dashboard. The user navigates vertically between levels via
the wheel or by swiping, and overlays layers of information on top of
the plans (controllable lights, temperatures, presence, infrastructure...).

Differentiators vs existing alternatives (native Picture-Elements, HACS
Floorplan): native multi-level navigation + modular overlays.

## Spec index

### Architecture (transverse)

| File | Topic | Status |
|---|---|---|
| [`architecture/identity.md`](architecture/identity.md) | Nomenclature, custom element tag, licence | implemented |
| [`architecture/component-tree.md`](architecture/component-tree.md) | Lit tree, SVG ID conventions | implemented |
| [`architecture/rendering-strategy.md`](architecture/rendering-strategy.md) | Hybrid strategy 3 + reactive updates | implemented |
| [`architecture/navigation.md`](architecture/navigation.md) | Wheel, swipe, edge_behavior | implemented |
| [`architecture/tech-stack.md`](architecture/tech-stack.md) | Dependencies, TS, Rollup, manifest, scripts | implemented |
| [`architecture/dev-workflow.md`](architecture/dev-workflow.md) | Quick dev mode + Samba + release cycle | implemented |
| [`architecture/conventions.md`](architecture/conventions.md) | Code style + SemVer | implemented |

### Features

| File | Topic | Status |
|---|---|---|
| [`features/data-model.md`](features/data-model.md) | YAML schema, fields, tap_actions | implemented |
| [`features/color-scheme.md`](features/color-scheme.md) | Colour CSS variables, override | implemented |
| [`features/overlays-toggle.md`](features/overlays-toggle.md) | Local visibleOverlays state | implemented |
| [`features/dark-mode.md`](features/dark-mode.md) | Light/dark backgrounds + crossfade | implemented |
| [`features/mobile-fullscreen-mode.md`](features/mobile-fullscreen-mode.md) | Explicit-button fullscreen, viewport escape | draft |
| [`features/pan-zoom-interactions.md`](features/pan-zoom-interactions.md) | Unified zoom and pan engine, multi-source input | draft |
| [`features/overlay-readability.md`](features/overlay-readability.md) | Screen-space overlay sizing, viewBox-relative defaults | draft |

### Transverse (living)

| File | Role |
|---|---|
| [`open-questions.md`](open-questions.md) | Inbox for inconsistencies seen by Claude Code |
| [`decisions.md`](decisions.md) | Chronological ADRs |
| [`glossary.md`](glossary.md) | Domain terms (floor, overlay, viewBox...) |

## Roadmap

### v0.1.0 — Shipped (2026-05-03)

Functional Lovelace card, multi-level, wheel + swipe navigation, icon
+ text overlays, HA standard tap_actions. Bundle 47 KB under the
50 KB target. GitHub Release with downloadable asset. Not yet
published on HACS.

See [`decisions.md`](decisions.md) for v0.1.0 ADRs.

### v0.1.1 — Shipped (2026-05-04)

Dark mode for background images. `backgrounds: { default, dark }`
field at the floor level + global `dark_mode` setting (`auto`/`on`/
`off`). Detection cascade
`setting > hass.themes.darkMode > prefers-color-scheme`, 200ms
crossfade on opacity, graceful fallback + console warning for
floors without a dark variant. Full backward compatibility with the
v0.1.0 short `background`. See
[`features/dark-mode.md`](features/dark-mode.md) (status
`implemented`) and ADR-005 in [`decisions.md`](decisions.md).
Bundle 49.7 KiB.

### v0.2.0 — Mobile UX overhaul (date TBD)

Three mutually-supportive features targeting mobile (and benefiting
desktop), see ADR-006 in [`decisions.md`](decisions.md):

- **Mobile fullscreen mode** via explicit button — CSS-based
  `position: fixed`, multi-exit-path (close button, Escape, browser
  back), state preservation across enter/exit. See
  [`features/mobile-fullscreen-mode.md`](features/mobile-fullscreen-mode.md).
- **Pan-zoom interactions** — unified transform engine across pinch,
  Ctrl+wheel, double-tap, vertical slider. Rewrite of
  `<fn-navigation-controller>` from `touchstart/move/end` +
  `touch-action: none` to PointerEvents. Reset on floor change. See
  [`features/pan-zoom-interactions.md`](features/pan-zoom-interactions.md).
- **Overlay readability** — screen-space sizing (`overlay_size_unit:
  px`) with inverse-scale compensation, viewBox-relative defaults,
  `min_icon_px` / `min_text_px` floors. Resolves the BACKLOG bug on
  hard-coded sizes. Single ResizeObserver shared with pan-zoom. See
  [`features/overlay-readability.md`](features/overlay-readability.md).

Recommended implementation order: overlay-readability →
pan-zoom-interactions → mobile-fullscreen-mode (per ADR-006).

Other v0.2.x candidates from the original roadmap (hover tooltip,
`badge` type, overlay binding to HA entities, overlay state
persistence via localStorage, optional CSS animations, keyboard
shortcuts) — see [`BACKLOG.md`](../BACKLOG.md) at the repo root for
the living candidate list.

### v0.3.0 — Maturity & HACS publication

`zone` type (colourable SVG shapes), Lovelace UI visual editor,
optional loop mode, Vitest tests, i18n, **official HACS submission**.

### v0.4.0+ — Advanced

HA Areas auto-detection, animated heatmaps, 3D perspective mode,
multi-building support.

### Permanent non-goals

- Drag-and-drop WYSIWYG of elements → that is a config editor, not
  the role of a card
- Pre-defined furnished icon pack → too dependent on personal
  preferences

## Spec workflow

1. Every spec change goes through this folder (no markdown pasted in
   chat to copy back)
2. Read before writing: `README.md` (this index) +
   `open-questions.md` + the relevant spec file(s)
3. Ask before overwriting: show a summary of the change, wait for
   explicit OK before committing
4. One spec = one file (no megadocument)
5. YAML frontmatter mandatory on every file
6. Spec sections: Context / Goals / Scope (in & out) / Expected
   behaviour / Edge cases / Open questions / Decisions

## Spec commit format

```
specs(<slug>): <verb> — <short description>
```

Examples:
- `specs(dark-mode): add — initial draft of dark mode handling`
- `specs(data-model): update — clarify backgrounds field per Q-2026-05-04`
- `specs: resolve Q-2026-05-04 (backgrounds priority)`

Commit on the default branch directly (unless multiple active
contributors or explicit PR request).

## External resources

- Lit docs: https://lit.dev
- Custom Cards in HA: https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- HACS publishing guide: https://hacs.xyz/docs/publish/start
- custom-card-helpers: https://github.com/custom-cards/custom-card-helpers
- Reference card (Mushroom): https://github.com/piitaya/lovelace-mushroom
- `HA_LOCAL_DIR` workflow (custom-sonos-card): https://github.com/punxaphil/custom-sonos-card
- `TARGET_DIRECTORY` workflow (streamline-card): https://github.com/brunosabot/streamline-card
