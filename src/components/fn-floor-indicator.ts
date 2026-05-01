import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Floor } from '../types/config.js';

/**
 * Discrete pill-shaped overlay label showing the current floor in the
 * bottom-right corner. Sibling of `<fn-floor-stack>` inside the navigation
 * controller; positioned absolutely against the controller's box.
 *
 * Uses CSS variables `--fn-floor-indicator-bg` / `--fn-floor-indicator-color`
 * (defined on the card root by `cardVariables`).
 */
@customElement('fn-floor-indicator')
export class FnFloorIndicator extends LitElement {
  @property({ attribute: false }) floor?: Floor;

  protected override render() {
    if (!this.floor) return nothing;
    return html`
      <div class="indicator" role="status" aria-live="polite">
        <span class="floor-id">${this.floor.id}</span>
        <span class="floor-sep" aria-hidden="true">—</span>
        <span class="floor-name">${this.floor.name}</span>
      </div>
    `;
  }

  static override styles = css`
    :host {
      position: absolute;
      bottom: 12px;
      right: 12px;
      pointer-events: none;
      z-index: 10;
    }
    .indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--fn-floor-indicator-bg, rgba(0, 0, 0, 0.6));
      color: var(--fn-floor-indicator-color, white);
      border-radius: 16px;
      font-family: var(--paper-font-body1_-_font-family, sans-serif);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.2px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .floor-id {
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
    }
    .floor-sep {
      opacity: 0.5;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-floor-indicator': FnFloorIndicator;
  }
}
