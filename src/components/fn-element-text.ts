import { svg, type SVGTemplateResult } from 'lit';

import type { TextElement } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders a text element as an SVG `<text>` directly inside the parent
 * floor's SVG. Symmetric with `fn-overlay-layer.renderOverlayLayer` :
 * a render helper, not a LitElement.
 *
 * Why not a LitElement (asymmetric vs `fn-element-icon`) :
 * - SVG `<text>` paints natively in SVG context; no need for foreignObject
 * - A LitElement (HTML namespace) inside `<svg>` doesn't reliably render
 *   its shadow DOM in the SVG viewport across browsers
 * - Per-element reactive granularity isn't critical here : text rendering
 *   is cheap, the whole layer can re-render on hass changes
 *
 * Display rules (specs/features/data-model.md, "Element type `text`"):
 * - value : numeric → `toFixed(precision)` (default 1)
 *           non-numeric → raw state string
 *           unavailable / unknown → "—" placeholder
 * - unit  : explicit `unit` config, or fallback to entity's
 *           `unit_of_measurement` attribute, or empty string
 * - font-size : `font_size` (default 24) in viewBox units
 *
 * Outline-on-text rendering : we paint a thick stroke first, then the fill
 * on top (`paint-order: stroke fill`). Stroke width scales with font-size
 * so the outline stays proportional regardless of the user's chosen size.
 */
const UNAVAILABLE_PLACEHOLDER = '—';

export function renderTextElement(
  element: TextElement,
  hass: HomeAssistant | undefined,
): SVGTemplateResult {
  const stateObj = hass?.states?.[element.entity];
  const rawState = stateObj?.state;
  const isAvailable =
    rawState !== undefined &&
    rawState !== 'unavailable' &&
    rawState !== 'unknown';

  let displayValue: string;
  if (!isAvailable) {
    displayValue = UNAVAILABLE_PLACEHOLDER;
  } else {
    const num = Number(rawState);
    if (Number.isNaN(num)) {
      displayValue = String(rawState);
    } else {
      const precision = element.precision ?? 1;
      displayValue = num.toFixed(precision);
    }
  }

  const explicitUnit = element.unit;
  const attrUnit =
    typeof stateObj?.attributes?.unit_of_measurement === 'string'
      ? stateObj.attributes.unit_of_measurement
      : undefined;
  const unit = explicitUnit ?? attrUnit ?? '';
  const label = unit ? `${displayValue} ${unit}` : displayValue;

  const fontSize = element.font_size ?? 24;
  // Stroke ~14% of font size — visible enough to outline against busy
  // backgrounds, thin enough to not eat the glyph fill.
  const strokeWidth = fontSize * 0.14;
  const id = `fn-element-${element.entity.replace(/\./g, '-')}`;

  return svg`
    <text
      id=${id}
      class="fn-element-text"
      x=${element.position.x}
      y=${element.position.y}
      data-entity=${element.entity}
      data-state=${rawState ?? 'unavailable'}
      font-size=${fontSize}
      stroke-width=${strokeWidth}
    >${label}</text>
  `;
}
