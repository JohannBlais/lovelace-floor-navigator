import { svg, type SVGTemplateResult } from 'lit';

import './fn-element-icon.js';
import { renderTextElement } from './fn-element-text.js';
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
 */
export function renderOverlayLayer(
  overlay: Overlay,
  floorId: string,
  hass: HomeAssistant | undefined,
): SVGTemplateResult {
  const elements = overlay.elements.filter((el) => el.floor === floorId);
  return svg`
    <g
      class="fn-overlay-layer"
      id="fn-floor-${floorId}-overlay-${overlay.id}"
      data-overlay-id=${overlay.id}
    >
      ${elements.map((el) => renderElement(el, hass, overlay.icon))}
    </g>
  `;
}

function renderElement(
  element: OverlayElement,
  hass: HomeAssistant | undefined,
  overlayIcon: string | undefined,
): SVGTemplateResult | null {
  if (element.type === 'icon') {
    return renderIconElement(element, hass, overlayIcon);
  }
  if (element.type === 'text') {
    return renderTextElement(element, hass);
  }
  return null;
}

function renderIconElement(
  element: IconElement,
  hass: HomeAssistant | undefined,
  overlayIcon: string | undefined,
): SVGTemplateResult {
  const size = element.size ?? 48;
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
        .hass=${hass}
        .overlayIcon=${overlayIcon}
      ></fn-element-icon>
    </foreignObject>
  `;
}
