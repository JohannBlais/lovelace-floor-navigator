import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import './fn-floor.js';
import type { Floor, Overlay, TransitionMode } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Stacks all floors in the same coordinate space (CSS strategy 3 from SPEC §4.3).
 *
 * - Every floor is rendered in the DOM at all times.
 * - Floors are absolutely positioned at the same origin (`inset: 0`).
 * - The active floor is shown via CSS class (`fn-floor-active`); others get
 *   `fn-floor-prev` / `fn-floor-next` and are hidden through the active
 *   transition style (only `crossfade` implemented in step 3).
 * - The host gets a fixed aspect-ratio derived from the viewBox so the
 *   absolutely-positioned children have a height to fill.
 */
export type BounceDirection = 'top' | 'bottom' | null;

@customElement('fn-floor-stack')
export class FnFloorStack extends LitElement {
  @property({ attribute: false }) floors: Floor[] = [];
  @property({ type: String }) viewbox = '';
  @property({ type: Number, attribute: false }) currentIndex = 0;
  @property({ type: String }) transition: TransitionMode = 'crossfade';
  @property({ type: Number, attribute: false }) transitionDuration = 400;
  @property({ attribute: false }) bounceDirection: BounceDirection = null;
  @property({ attribute: false }) overlays: Overlay[] = [];
  @property({ attribute: false }) hass?: HomeAssistant;

  private get _aspectRatio(): string {
    const parts = this.viewbox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n)) || parts[3] === 0) {
      return '16 / 9';
    }
    return `${parts[2]} / ${parts[3]}`;
  }

  protected override render() {
    return html`
      <div
        class="stack"
        style=${styleMap({
          'aspect-ratio': this._aspectRatio,
          '--fn-transition-duration': `${this.transitionDuration}ms`,
        })}
      >
        ${this.floors.map((floor, i) => {
          const classes: Record<string, boolean> = {
            'floor-wrapper': true,
            [`fn-transition-${this.transition}`]: true,
            'fn-floor-active': i === this.currentIndex,
            'fn-floor-prev': i < this.currentIndex,
            'fn-floor-next': i > this.currentIndex,
          };
          if (this.bounceDirection && i === this.currentIndex) {
            classes[`fn-bouncing-${this.bounceDirection}`] = true;
          }
          return html`
            <div class=${classMap(classes)} data-floor-id=${floor.id} id="fn-floor-${floor.id}">
              <fn-floor
                .viewbox=${this.viewbox}
                .floor=${floor}
                .overlays=${this.overlays}
                .hass=${this.hass}
              ></fn-floor>
            </div>
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
    .stack {
      position: relative;
      width: 100%;
      overflow: hidden;
    }
    .floor-wrapper {
      position: absolute;
      inset: 0;
    }

    /* --- Crossfade transition --- */
    .fn-transition-crossfade {
      transition: opacity var(--fn-transition-duration, 400ms) ease-in-out;
    }
    .fn-transition-crossfade.fn-floor-active {
      opacity: 1;
      z-index: 2;
    }
    .fn-transition-crossfade.fn-floor-prev,
    .fn-transition-crossfade.fn-floor-next {
      opacity: 0;
      z-index: 1;
      pointer-events: none;
    }

    /* --- Slide transition: vertical translateY --- */
    .fn-transition-slide {
      transition: transform var(--fn-transition-duration, 400ms) ease-in-out;
    }
    .fn-transition-slide.fn-floor-active {
      transform: translateY(0);
      z-index: 2;
    }
    .fn-transition-slide.fn-floor-prev {
      transform: translateY(-100%);
      z-index: 1;
      pointer-events: none;
    }
    .fn-transition-slide.fn-floor-next {
      transform: translateY(100%);
      z-index: 1;
      pointer-events: none;
    }

    /* --- Slide-scale transition: slide + slight zoom-out + dim on inactive --- */
    .fn-transition-slide-scale {
      transition:
        transform var(--fn-transition-duration, 400ms) ease-in-out,
        opacity var(--fn-transition-duration, 400ms) ease-in-out;
    }
    .fn-transition-slide-scale.fn-floor-active {
      transform: translateY(0) scale(1);
      opacity: 1;
      z-index: 2;
    }
    .fn-transition-slide-scale.fn-floor-prev {
      transform: translateY(-100%) scale(0.92);
      opacity: 0.4;
      z-index: 1;
      pointer-events: none;
    }
    .fn-transition-slide-scale.fn-floor-next {
      transform: translateY(100%) scale(0.92);
      opacity: 0.4;
      z-index: 1;
      pointer-events: none;
    }

    /* --- Bounce animation at edges (SPEC §4.6.3) --- */
    .fn-bouncing-top {
      animation: fn-bounce-top 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .fn-bouncing-bottom {
      animation: fn-bounce-bottom 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes fn-bounce-top {
      0%   { transform: translateY(0); }
      50%  { transform: translateY(-20px); }
      100% { transform: translateY(0); }
    }
    @keyframes fn-bounce-bottom {
      0%   { transform: translateY(0); }
      50%  { transform: translateY(20px); }
      100% { transform: translateY(0); }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-floor-stack': FnFloorStack;
  }
}
