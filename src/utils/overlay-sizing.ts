// v0.2.0 — Effective-size computation for overlay icons and text.
// See specs/features/overlay-readability.md.
//
// All sizes returned are in viewBox units (the value to put in the SVG
// attribute). The two modes:
//
//   viewbox  — `configured` is in viewBox units. Default if omitted is
//              `viewBoxWidth / defaultViewBoxDivisor`. Element scales
//              with the card and with pan-zoom.
//
//   px       — `configured` is in screen pixels. Inverse-compensated
//              against the viewBox-to-screen ratio and pan-zoom scale,
//              so the rendered screen size stays constant.
//
// In both modes a `minPx` floor acts as a clamp: when the rendered
// screen size would otherwise fall below it, the returned value is
// bumped up to meet the floor.

import type { OverlaySizeUnit } from '../types/config.js';

export interface SizingContext {
  /** viewBox width in viewBox units (e.g. 1920 for "0 0 1920 1080"). */
  viewBoxWidth: number;
  /** viewBoxWidth / cardWidthPx. Equals 1 when card width is unknown
   * (no compensation, identical to v0.1.x behaviour). */
  viewBoxToScreenRatio: number;
  /** Pan-zoom transform scale. 1 in v0.2.0 spec 1; updated by spec 2. */
  zoomScale: number;
  /** Selected sizing semantics (default `viewbox` for backward compat). */
  sizeUnit: OverlaySizeUnit;
}

export interface SizingDefaults {
  /** In viewbox mode, default = viewBoxWidth / this divisor. */
  viewBoxDivisor: number;
  /** In px mode, default in screen pixels when `configured` is omitted. */
  px: number;
  /** Minimum rendered size in screen pixels (clamp). */
  minPx: number;
}

/** Per spec: 40 → default icon ≈ viewBoxWidth/40 (= 48 for 1920). */
export const ICON_DEFAULTS: SizingDefaults = {
  viewBoxDivisor: 40,
  px: 32,
  minPx: 24,
};

/** Per spec: 80 → default text ≈ viewBoxWidth/80 (= 24 for 1920). */
export const TEXT_DEFAULTS: SizingDefaults = {
  viewBoxDivisor: 80,
  px: 14,
  minPx: 14,
};

/**
 * Returns the effective size to write into the SVG attribute (in
 * viewBox units), accounting for the configured value, the active
 * sizing mode, the viewBox-to-screen ratio, the pan-zoom scale, and
 * the minimum-size floor.
 *
 * `configured` is whatever the user wrote in YAML (`size` for icons,
 * `font_size` for text), or `undefined` if absent. The semantics of
 * `configured` depend on `ctx.sizeUnit`:
 *   - viewbox: viewBox units (kept as-is on output)
 *   - px:      screen pixels (compensated to viewBox units on output)
 *
 * When `minPx` is provided, the rendered screen size is computed and
 * compared against the floor; the result is clamped if needed.
 */
export function computeEffectiveSize(
  configured: number | undefined,
  ctx: SizingContext,
  defaults: SizingDefaults,
  minPxOverride?: number,
): number {
  const minPx = minPxOverride ?? defaults.minPx;
  const ratio = ctx.viewBoxToScreenRatio;
  const zoom = ctx.zoomScale || 1;

  let svgUnits: number;
  if (ctx.sizeUnit === 'px') {
    const sPx = configured !== undefined ? Math.max(0, configured) : defaults.px;
    // svgUnits such that rendered = sPx px:
    //   rendered = svgUnits * (1/ratio) * zoom
    //   ⇒ svgUnits = sPx * ratio / zoom
    svgUnits = (sPx * ratio) / zoom;
  } else {
    const sVb =
      configured !== undefined
        ? Math.max(0, configured)
        : ctx.viewBoxWidth / defaults.viewBoxDivisor;
    svgUnits = sVb;
  }

  // Apply minimum-pixel floor as a clamp. Rendered pixel size:
  //   rendered = svgUnits * (1/ratio) * zoom
  // Solve svgUnits for rendered = minPx if needed.
  const renderedPx = (svgUnits / Math.max(ratio, 1e-6)) * zoom;
  if (renderedPx < minPx) {
    return (minPx * ratio) / zoom;
  }
  return svgUnits;
}
