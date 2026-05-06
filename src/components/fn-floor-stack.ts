import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import './fn-floor.js';
import type { ThemeMode } from '../utils/theme-resolver.js';
import { IDENTITY, type Transform } from '../utils/transform.js';
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
  /**
   * v0.2.0 — Pan-zoom transform applied as a CSS `translate` + `scale` on
   * the `.stack` wrapper. The viewBox stays the canonical coordinate
   * system; this transform is purely visual. See
   * specs/features/pan-zoom-interactions.md.
   *
   * `gestureLive` toggles the CSS transition off while a pan / pinch is
   * in flight (per-frame updates), and back on for animated reset on
   * floor change or double-tap.
   */
  @property({ attribute: false }) transform: Transform = IDENTITY;
  @property({ type: Boolean, attribute: false }) gestureLive = false;
  /**
   * v0.2.0 — Fullscreen flag forwarded from the controller. Switches
   * `.stack` from "width:100% × aspect-ratio height" (which can overflow
   * a height-constrained parent in landscape mobile) to a fit-within-
   * parent layout that preserves the aspect ratio. See
   * specs/features/mobile-fullscreen-mode.md and the parent fullscreen
   * CSS in fn-navigation-controller.
   */
  @property({ type: Boolean, attribute: false }) fullscreen = false;

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('fullscreen')) {
      this.classList.toggle('fullscreen', this.fullscreen);
    }
  }

  private get _aspectRatio(): string {
    const parts = this.viewbox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n)) || parts[3] === 0) {
      return '16 / 9';
    }
    return `${parts[2]} / ${parts[3]}`;
  }

  /** Convert pan offset from viewBox units to screen pixels for CSS. */
  private get _translatePx(): { x: number; y: number } {
    const ratio = this.viewBoxToScreenRatio || 1;
    if (!Number.isFinite(ratio) || ratio === 0) return { x: 0, y: 0 };
    // viewBox unit → screen px = viewBoxValue / ratio
    return {
      x: this.transform.x / ratio,
      y: this.transform.y / ratio,
    };
  }

  protected override render() {
    const { x, y } = this._translatePx;
    const cssTransform = `translate(${x}px, ${y}px) scale(${this.transform.scale})`;
    return html`
      <div
        class=${classMap({ stack: true, 'gesture-live': this.gestureLive })}
        style=${styleMap({
          'aspect-ratio': this._aspectRatio,
          '--fn-transition-duration': `${this.transitionDuration}ms`,
          transform: cssTransform,
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
      /* v0.2.0 — clip the CSS-transformed .stack to the host's box.
         Without this, scale > 1 makes .stack visually overflow into
         sibling elements (overlay-buttons bar, surrounding card chrome).
         The .stack's own overflow: hidden clips its descendants but is
         itself transformed, so the clip area scales along with the
         content — useless. The clip has to live on a non-transformed
         ancestor, which is :host here. */
      overflow: hidden;
    }
    .stack {
      position: relative;
      width: 100%;
      overflow: hidden;
      /* v0.2.0 — pan-zoom: animate transform on programmatic changes
         (floor reset, double-tap toggle, slider release). Disabled
         while a live gesture is in flight via .gesture-live below. */
      transform-origin: 0 0;
      transition: transform 200ms ease-out;
    }
    .stack.gesture-live {
      transition: none;
    }
    .floor-wrapper {
      position: absolute;
      inset: 0;
    }

    /* ────────── v0.2.0 — fullscreen aspect-fit ──────────
       In fullscreen the parent (.gesture-area) gives this host a
       definite size (1080x2290 on a portrait phone, etc.). The host
       is a grid container whose only purpose is to centre .stack in
       both axes; .stack itself uses the canonical object-fit:contain
       pattern: width:auto, height:auto, max-width/max-height:100%,
       and the inline aspect-ratio attribute. Browsers compute the
       largest dimensions that respect all three constraints (both
       max-*, plus the aspect ratio).

       This replaces an earlier width:auto + height:100% form which
       was ambiguous on Chromium WebViews (HA companion app): the
       cross-axis sizing in flex-row created a circular dependency
       between host width and .stack width via aspect-ratio, leaving
       the actual rendered .stack height non-deterministic across
       browsers. The bug surfaced as a too-narrow vertical pan range
       in fullscreen portrait. See open-question 2026-05-06 for
       resolution details. */
    :host(.fullscreen) {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
    }
    :host(.fullscreen) .stack {
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      /* aspect-ratio inherited from the inline style on .stack */
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
