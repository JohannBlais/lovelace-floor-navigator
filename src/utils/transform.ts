// v0.2.0 — Pan-zoom transform math.
// See specs/features/pan-zoom-interactions.md.
//
// All functions here are pure: same input → same output, no side effects.
// They are designed to be unit-testable in isolation (Vitest planned for
// v0.3.0; see specs/open-questions.md). The controller calls them from
// gesture handlers; the floor-stack and slider read the resulting state.

/** A 2D affine transform with uniform scale, in viewBox units. */
export interface Transform {
  /** Uniform scale factor. Identity = 1. */
  scale: number;
  /** Pan offset along X, in viewBox units. Identity = 0. */
  x: number;
  /** Pan offset along Y, in viewBox units. Identity = 0. */
  y: number;
}

/** Identity transform: no zoom, no pan. */
export const IDENTITY: Transform = Object.freeze({ scale: 1, x: 0, y: 0 });

/** A point in some coordinate system (viewBox or screen). */
export interface Point {
  x: number;
  y: number;
}

/** Clamp scale to the configured [min, max] range. */
export function clampScale(scale: number, zoomMin: number, zoomMax: number): number {
  if (!Number.isFinite(scale)) return 1;
  if (scale < zoomMin) return zoomMin;
  if (scale > zoomMax) return zoomMax;
  return scale;
}

/**
 * Clamp pan so the scaled plan does not drift into the void.
 *
 * Two-branch behaviour, see open-question (2026-05-06):
 * - scale ≥ 1: the plan is at least the size of the viewport. Clamp so
 *   that AT LEAST 50% of the plan area stays inside the viewport — the
 *   user can focus on edges but cannot scroll the plan off-screen.
 * - scale < 1: the plan is smaller than the viewport. Clamp so the plan
 *   stays at least 50% inside the viewport (its centre cannot leave a
 *   centred sub-region equal to viewport minus plan/2). Same intent:
 *   prevent the plan from disappearing into the empty space.
 *
 * Returned object is a new instance — caller can compare by reference
 * to detect a change.
 */
export function clampPan(
  transform: Transform,
  viewBoxWidth: number,
  viewBoxHeight: number,
): Transform {
  const { scale } = transform;
  if (scale === 1) return { scale: 1, x: 0, y: 0 };
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) return transform;

  const visibleW = viewBoxWidth / scale;
  const visibleH = viewBoxHeight / scale;

  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;

  if (scale > 1) {
    // Scaled plan ≥ viewport. Keep ≥ 50% of the plan inside the viewport.
    // The pan range allows the visible window to scan over the plan.
    minX = -visibleW / 2;
    maxX = viewBoxWidth - visibleW / 2;
    minY = -visibleH / 2;
    maxY = viewBoxHeight - visibleH / 2;
  } else {
    // scale < 1: plan smaller than viewport. The plan's centre can move
    // around inside a sub-region equal to viewport minus plan/2. In
    // viewBox units (post-scale), the plan width is viewBoxWidth (the
    // full canvas), but the visible viewport is `visibleW = viewBoxWidth / scale`,
    // which is LARGER than the plan. The pan range is the difference,
    // halved on each side, then we tighten by 50% of the plan to
    // satisfy "≥ 50% inside the viewport".
    const slackX = (visibleW - viewBoxWidth) / 2;
    const slackY = (visibleH - viewBoxHeight) / 2;
    minX = -slackX - viewBoxWidth / 2;
    maxX = slackX + viewBoxWidth / 2;
    minY = -slackY - viewBoxHeight / 2;
    maxY = slackY + viewBoxHeight / 2;
  }

  const x = Math.min(maxX, Math.max(minX, transform.x));
  const y = Math.min(maxY, Math.max(minY, transform.y));
  return { scale, x, y };
}

/**
 * Compute the new transform after a zoom centred on `anchorScreen` (in
 * screen pixels relative to the card root).
 *
 * The constraint: the viewBox point currently under `anchorScreen` must
 * stay under `anchorScreen` after the scale change. Standard zoom-around-
 * point formula:
 *
 *   anchor_vb = (anchorScreen - oldT.translate) / oldT.scale
 *   new_x = anchorScreen.x - anchor_vb.x * newScale
 *
 * but expressed in **viewBox-translation units**. We work entirely in
 * viewBox units for `transform.{x,y}`; the screen→viewBox conversion is
 * handled by the caller via `viewBoxToScreenRatio`.
 *
 * @param oldT Current transform.
 * @param newScale Target scale (already clamped to [zoomMin, zoomMax]).
 * @param anchorVb Anchor point in **viewBox** coordinates (the point in
 *   the plan that must stay under the user's cursor / centroid).
 * @param anchorScreenVb Same anchor point expressed as a viewBox-units
 *   offset from the card's top-left corner — i.e. the screen-pixel
 *   anchor converted to viewBox units. For a slider centred-card anchor,
 *   pass `{ x: viewBoxWidth/2, y: viewBoxHeight/2 }` and treat the
 *   anchor as if the centre stayed under the centre.
 *
 * Returns a new Transform with the same scale = newScale and pan
 * adjusted so the anchor invariant holds. Caller should run `clampPan`
 * afterwards.
 */
export function applyZoomAnchor(
  newScale: number,
  anchorVb: Point,
  anchorScreenVb: Point,
): Transform {
  // The screen point P satisfies: P = T.x + anchor_vb * scale (per axis,
  // in viewBox-units). So anchor_vb = (P - T.x) / scale, and after the
  // scale change to newScale, we want T'.x = P - anchor_vb * newScale.
  // anchor_vb is provided directly (from the caller's hit-testing) so we
  // do not need the previous transform.
  const x = anchorScreenVb.x - anchorVb.x * newScale;
  const y = anchorScreenVb.y - anchorVb.y * newScale;
  return { scale: newScale, x, y };
}

/**
 * Convert a screen-pixel position (relative to the card top-left) to a
 * viewBox-coordinate point, given the current transform.
 *
 * Inverse of `viewBox → screen` mapping:
 *   screen = (viewBox * scale + T) * (cardWidthPx / viewBoxWidth)
 * Equivalent viewBox-units form:
 *   screen_vb = viewBox * scale + T
 *   ⇒ viewBox = (screen_vb - T) / scale
 */
export function screenToViewBox(
  screenPx: Point,
  cardSize: { width: number; height: number },
  viewBox: { width: number; height: number },
  transform: Transform,
): Point {
  if (cardSize.width <= 0 || cardSize.height <= 0) {
    return { x: 0, y: 0 };
  }
  // Convert pixel position to viewBox-units position (without transform).
  const xVb = (screenPx.x * viewBox.width) / cardSize.width;
  const yVb = (screenPx.y * viewBox.height) / cardSize.height;
  // Undo the transform.
  return {
    x: (xVb - transform.x) / transform.scale,
    y: (yVb - transform.y) / transform.scale,
  };
}

/** Convert a screen-pixel position to viewBox-units (no transform). */
export function screenToViewBoxUnits(
  screenPx: Point,
  cardSize: { width: number; height: number },
  viewBox: { width: number; height: number },
): Point {
  if (cardSize.width <= 0 || cardSize.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (screenPx.x * viewBox.width) / cardSize.width,
    y: (screenPx.y * viewBox.height) / cardSize.height,
  };
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Centroid (midpoint) of two points. */
export function centroid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Reference equality check, useful to short-circuit Lit re-renders. */
export function transformsEqual(a: Transform, b: Transform): boolean {
  return a.scale === b.scale && a.x === b.x && a.y === b.y;
}
