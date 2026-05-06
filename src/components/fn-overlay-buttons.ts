import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import type { Overlay } from '../types/config.js';

/**
 * Bar of toggle buttons (one per overlay) that lives next to the floor
 * stack — sibling of `<fn-floor-stack>` inside `<fn-navigation-controller>`,
 * positioned `top` or `bottom` per the `overlay_buttons_position` setting
 * (see specs/features/data-model.md, Settings table).
 *
 * State (which overlays are currently visible) lives in `floor-navigator-card`
 * (specs/features/overlays-toggle.md — local non-persisted state). Clicking
 * a button dispatches an `overlay-toggle` CustomEvent with `{ id }` that
 * bubbles up to the card, which mutates its `_visibleOverlayIds` Set.
 */
@customElement('fn-overlay-buttons')
export class FnOverlayButtons extends LitElement {
  /** Full list of overlays — including those currently hidden. */
  @property({ attribute: false }) overlays: Overlay[] = [];
  /** Set of overlay ids currently visible (for the active styling). */
  @property({ attribute: false }) visibleOverlayIds: Set<string> = new Set();
  /**
   * v0.2.0 — Fullscreen flag forwarded from the controller. Adds a
   * semi-transparent dark background to the bar so it stays readable
   * over varied plan colours when the bar overlays the floor stack at
   * the viewport edge in fullscreen. See
   * specs/features/mobile-fullscreen-mode.md §"Overlay buttons in
   * fullscreen".
   */
  @property({ type: Boolean, attribute: false }) fullscreen = false;

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('fullscreen')) {
      this.classList.toggle('fullscreen', this.fullscreen);
    }
  }

  private _toggle(id: string): void {
    this.dispatchEvent(
      new CustomEvent<{ id: string }>('overlay-toggle', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected override render() {
    if (this.overlays.length === 0) return nothing;
    return html`
      <div class="bar" role="toolbar" aria-label="Overlay toggles">
        ${this.overlays.map((overlay) => {
          const active = this.visibleOverlayIds.has(overlay.id);
          return html`
            <button
              type="button"
              class=${classMap({ btn: true, active })}
              aria-pressed=${active ? 'true' : 'false'}
              aria-label=${overlay.name}
              title=${overlay.name}
              data-overlay-id=${overlay.id}
              @click=${() => this._toggle(overlay.id)}
            >
              <ha-icon icon=${overlay.icon ?? 'mdi:layers'}></ha-icon>
            </button>
          `;
        })}
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .bar {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      justify-content: center;
      flex-wrap: wrap;
      /* Buttons must remain tappable, not be hijacked by the controller's
         touch listeners for swipe navigation. The controller still gets
         touchstart events but bails on the distance check. */
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--fn-overlay-button-bg, rgba(0, 0, 0, 0.5));
      color: white;
      cursor: pointer;
      font: inherit;
      transition:
        background 200ms ease,
        transform 100ms ease;
    }
    .btn.active {
      background: var(--fn-overlay-button-active-bg, rgba(255, 193, 7, 0.8));
    }
    .btn:active {
      transform: scale(0.92);
    }
    .btn ha-icon {
      --mdc-icon-size: 22px;
      width: 22px;
      height: 22px;
      display: block;
    }
    /* v0.2.0 — fullscreen styling: semi-transparent dark background so
       the bar stays readable over the plan content at the viewport edge. */
    :host(.fullscreen) .bar {
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-overlay-buttons': FnOverlayButtons;
  }
}
