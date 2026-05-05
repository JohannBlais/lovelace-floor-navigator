import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import './fn-floor.js';
import type { ThemeMode } from '../utils/theme-resolver.js';
import type {
  DarkModeSetting,
  Floor,
  Overlay,
  OverlaySizeUnit,
  TransitionMode,
} from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Stacks all floors in the same coordinate space (CSS strategy 3 from
 * specs/architecture/rendering-strategy.md).
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
  /** v0.1.1 — forwarded to each fn-floor for the dark-mode crossfade. */
  @property({ type: String, attribute: false }) currentTheme: ThemeMode = 'light';
  @property({ type: String, attribute: false }) darkModeSetting: DarkModeSetting = 'auto';
  /** v0.2.0 — overlay-readability sizing context. Pass-through to fn-floor. */
  @property({ type: Number, attribute: false }) viewBoxWidth = 0;
  @property({ type: Number, attribute: false }) viewBoxToScreenRatio = 1;
  @property({ type: Number, attribute: false }) zoomScale = 1;
  @property({ type: String, attribute: false }) sizeUnit: OverlaySizeUnit = 'viewbox';
  @property({ type: Number, attribute: false }) minIconPx = 24;
  @property({ type: Number, attribute: false }) minTextPx = 14;

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
                .currentTheme=${this.currentTheme}
                .darkModeSetting=${this.darkModeSetting}
                .viewBoxWidth=${this.viewBoxWidth}
                .viewBoxToScreenRatio=${this.viewBoxToScreenRatio}
                .zoomScale=${this.zoomScale}
                .sizeUnit=${this.sizeUnit}
                .minIconPx=${this.minIconPx}
                .minTextPx=${this.minTextPx}
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

    /* --- Bounce animation at edges (specs/architecture/navigation.md) --- */
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
