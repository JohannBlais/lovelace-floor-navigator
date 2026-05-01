import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { resolveColorVar } from '../utils/color-resolver.js';
import { resolveIcon } from '../utils/icon-resolver.js';
import type { IconElement } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders a single icon element. The host is meant to live inside an SVG
 * `<foreignObject>` (placed by `fn-overlay-layer`'s helper) so HTML rendering
 * works reliably while the position lives in viewBox coordinates.
 *
 * Reactive granularity (SPEC §4.4 approche B) : `shouldUpdate` short-circuits
 * re-renders to entities whose state actually changed. This means HA can push
 * a fresh `hass` object through every state tick, but only the elements whose
 * tracked entity moved will re-render.
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

    return html`
      <ha-icon
        icon=${icon}
        data-entity=${this.element.entity}
        data-state=${state ?? 'unavailable'}
        style="color: ${color};"
      ></ha-icon>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }
    ha-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      /* ha-icon sizes its inner SVG via --mdc-icon-size; we want it to fill
         the foreignObject's box. */
      --mdc-icon-size: 100%;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
      transition: color 200ms ease;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-element-icon': FnElementIcon;
  }
}
