import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { resolveColorVar } from '../utils/color-resolver.js';
import { resolveIcon } from '../utils/icon-resolver.js';
import type { IconElement } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders a single icon element. Used inside an SVG `<foreignObject>` placed
 * by `fn-overlay-layer`, so HTML rendering is reliable while position lives
 * in viewBox coordinates.
 *
 * Visual = a circular "pastille" filled with the state color (light-on amber,
 * binary_sensor-on blue, etc.), surrounded by a translucent white halo, and
 * a centered white glyph. The halo + filled disc is the standard pattern
 * for visibility on photographic floor-plan backgrounds (Mushroom / iOS).
 *
 * Reactive granularity (SPEC §4.4 approche B) : `shouldUpdate` short-circuits
 * re-renders to entities whose state actually changed. HA can push a fresh
 * `hass` object every state tick — only the elements whose tracked entity
 * moved will re-render.
 */
@customElement('fn-element-icon')
export class FnElementIcon extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) element!: IconElement;

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.has('element')) return true;
    if (changed.has('hass')) {
      const oldHass = changed.get('hass') as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states?.[this.element.entity];
      const newStateObj = this.hass?.states?.[this.element.entity];
      // Same reference = nothing changed for this entity. HA reuses state
      // objects when a state hasn't changed, so identity check is reliable.
      return oldStateObj !== newStateObj;
    }
    return false;
  }

  protected override render() {
    const stateObj = this.hass?.states?.[this.element.entity];
    const state = stateObj?.state;
    const icon = this.element.icon ?? resolveIcon(this.element.entity);
    const color = resolveColorVar(this.element.entity, state);
    // Inside foreignObject CSS lengths are interpreted in user (viewBox)
    // units, so a 48-unit element gets a ~31-unit glyph. Proportional to
    // the user-configured `size`.
    const size = this.element.size ?? 48;
    const iconSizePx = size * 0.65;

    return html`
      <div
        class="pastille"
        data-entity=${this.element.entity}
        data-state=${state ?? 'unavailable'}
        style="background: ${color};"
      >
        <ha-icon
          icon=${icon}
          style="--mdc-icon-size: ${iconSizePx}px;"
        ></ha-icon>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      /* Halo + drop-shadow extend outside the pastille; allow them through. */
      overflow: visible;
      /* Reset text-flow inherited from the surrounding <foreignObject> body
         so it can't push the absolutely-positioned glyph by a baseline. */
      line-height: 0;
      font-size: 0;
    }
    .pastille {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow:
        0 0 0 2px var(--fn-pastille-halo, rgba(255, 255, 255, 0.85)),
        0 2px 6px rgba(0, 0, 0, 0.45);
      transition:
        background 200ms ease,
        transform 100ms ease;
    }
    /* Bulletproof centering : we don't rely on flexbox / text baseline
       alignment because <ha-icon>'s default :host display can carry a
       sub-pixel vertical-align offset. Absolute + translate(-50%, -50%)
       depends only on the element's own width / height, which we pin
       explicitly to --mdc-icon-size. */
    ha-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
      transform: translate(-50%, -50%);
      color: var(--fn-color-icon-foreground, #fff);
      display: block;
      margin: 0;
      padding: 0;
      line-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-element-icon': FnElementIcon;
  }
}
