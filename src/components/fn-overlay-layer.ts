import { svg, type SVGTemplateResult } from 'lit';

import './fn-element-icon.js';
import { renderTextElement } from './fn-element-text.js';
import {
  computeEffectiveSize,
  ICON_DEFAULTS,
  type SizingContext,
} from '../utils/overlay-sizing.js';
import type { Overlay, OverlayElement, IconElement } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders an overlay layer for a given floor.
 *
 * specs/architecture/component-tree.md lists `<fn-overlay-layer>` as a
 * custom element, but a LitElement (HTML namespace) placed directly inside
 * an `<svg>` does not reliably render its shadow DOM into the SVG viewport.
 * We instead expose a render helper that inlines the layer as an SVG
 * `<g>` directly inside the parent `<svg>` template — this preserves the
 * SVG ID convention (`fn-floor-{floor_id}-overlay-{overlay_id}`) while
 * staying browser-safe.
 *
 * Per-element reactive updates (specs/architecture/rendering-strategy.md)
 * live in `<fn-element-icon>`, which is a real LitElement used inside
 * `<foreignObject>` (HTML rendering, fully reliable across browsers).
 *
 * v0.2.0 — overlay-readability: the effective size for each element is
 * computed here (one place) using the shared `SizingContext`. The
 * `<fn-element-icon>` and `renderTextElement` consume the resolved
 * value, kept in viewBox units for the SVG attributes.
 */
export interface OverlayMinSizes {
  minIconPx: number;
  minTextPx: number;
}

export function renderOverlayLayer(
  overlay: Overlay,
  floorId: string,
  hass: HomeAssistant | undefined,
  sizingCtx: SizingContext,
  minSizes: OverlayMinSizes,
): SVGTemplateResult {
  const elements = overlay.elements.filter((el) => el.floor === floorId);
  return svg`
    <g
      class="fn-overlay-layer"
      id="fn-floor-${floorId}-overlay-${overlay.id}"
      data-overlay-id=${overlay.id}
    >
      ${elements.map((el) => renderElement(el, hass, overlay.icon, sizingCtx, minSizes))}
    </g>
  `;
}

function renderElement(
  element: OverlayElement,
  hass: HomeAssistant | undefined,
  overlayIcon: string | undefined,
  sizingCtx: SizingContext,
  minSizes: OverlayMinSizes,
): SVGTemplateResult | null {
  if (element.type === 'icon') {
    return renderIconElement(element, hass, overlayIcon, sizingCtx, minSizes.minIconPx);
  }
  if (element.type === 'text') {
    return renderTextElement(element, hass, sizingCtx, minSizes.minTextPx);
  }
  return null;
}

function renderIconElement(
  element: IconElement,
  hass: HomeAssistant | undefined,
  overlayIcon: string | undefined,
  sizingCtx: SizingContext,
  minIconPx: number,
): SVGTemplateResult {
  const size = computeEffectiveSize(element.size, sizingCtx, ICON_DEFAULTS, minIconPx);
  const x = element.position.x - size / 2;
  const y = element.position.y - size / 2;
  const id = `fn-element-${element.entity.replace(/\./g, '-')}`;
  return svg`
    <foreignObject
      id=${id}
      x=${x}
      y=${y}
      width=${size}
      height=${size}
      data-entity=${element.entity}
      overflow="visible"
    >
      <fn-element-icon
        .element=${element}
        .effectiveSize=${size}
        .hass=${hass}
        .overlayIcon=${overlayIcon}
      ></fn-element-icon>
    </foreignObject>
  `;
}
