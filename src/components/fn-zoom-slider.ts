import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

import type { ZoomSliderPosition } from '../types/config.js';

/**
 * Vertical zoom slider, always visible (per ADR-006 arbitration #2 and
 * specs/features/pan-zoom-interactions.md).
 *
 * Renders absolutely-positioned on the side of the floor area (12px
 * margin from the configured edge, 70% of card height, vertically
 * centred). Two interactive parts:
 *
 * - Thumb: a 24×24 circular handle the user drags to set the scale.
 *   Position reflects current scale on a linear `[zoomMin, zoomMax]`
 *   mapping. Bidirectional: external scale changes (pinch, Ctrl+wheel,
 *   double-tap) move the thumb.
 *
 * - Reset button: a small `mdi:fit-to-page-outline` icon at the bottom
 *   that resets the transform to identity.
 *
 * Communication with the controller via three CustomEvents:
 *
 * - `slider-scale` (`{ scale }`)  — emitted on drag (per pointermove)
 * - `slider-release`              — emitted on drag end
 * - `slider-reset`                — emitted on reset-button tap
 *
 * The controller does the clamping and the centre-of-card anchor
 * computation; this component is a dumb input.
 */
@customElement('fn-zoom-slider')
export class FnZoomSlider extends LitElement {
  /** Current scale, drives the thumb position. */
  @property({ type: Number, attribute: false }) scale = 1;
  @property({ type: Number, attribute: false }) zoomMin = 1;
  @property({ type: Number, attribute: false }) zoomMax = 4;
  /** Edge to anchor the slider against. `none` is filtered upstream. */
  @property({ type: String, attribute: false }) position: ZoomSliderPosition = 'right';

  @state() private _dragging = false;

  private _trackRect?: DOMRect;
  private _capturedPointerId?: number;

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('position')) {
      // Pin the host to the configured edge. Done via inline style on
      // the host because `:host()` selectors can't read property values
      // directly without an attribute reflection.
      if (this.position === 'left') {
        this.style.left = '12px';
        this.style.right = '';
      } else {
        this.style.right = '12px';
        this.style.left = '';
      }
    }
  }

  /** Position the thumb on a linear `[zoomMin, zoomMax]` → `[100%, 0%]`
   * mapping (top of the track = max zoom, bottom = min). */
  private get _thumbTopPercent(): number {
    const range = Math.max(this.zoomMax - this.zoomMin, 1e-6);
    const clamped = Math.min(this.zoomMax, Math.max(this.zoomMin, this.scale));
    const ratio = (clamped - this.zoomMin) / range;
    // ratio 0 → bottom (100%), ratio 1 → top (0%)
    return (1 - ratio) * 100;
  }

  private _onTrackPointerDown = (e: PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);
    this._capturedPointerId = e.pointerId;
    this._trackRect = target.getBoundingClientRect();
    this._dragging = true;
    this._updateScaleFromPointer(e.clientY);
  };

  private _onTrackPointerMove = (e: PointerEvent): void => {
    if (!this._dragging || e.pointerId !== this._capturedPointerId) return;
    e.stopPropagation();
    this._updateScaleFromPointer(e.clientY);
  };

  private _onTrackPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this._capturedPointerId) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture?.(e.pointerId);
    this._dragging = false;
    this._capturedPointerId = undefined;
    this._trackRect = undefined;
    this.dispatchEvent(
      new CustomEvent('slider-release', { bubbles: true, composed: true }),
    );
  };

  private _updateScaleFromPointer(clientY: number): void {
    if (!this._trackRect) return;
    const { top, height } = this._trackRect;
    if (height <= 0) return;
    // y → ratio. Top of track = scale max, bottom = scale min.
    const y = clientY - top;
    const clampedY = Math.min(height, Math.max(0, y));
    const ratio = 1 - clampedY / height;
    const scale = this.zoomMin + ratio * (this.zoomMax - this.zoomMin);
    this.dispatchEvent(
      new CustomEvent<{ scale: number }>('slider-scale', {
        detail: { scale },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onResetClick = (e: Event): void => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('slider-reset', { bubbles: true, composed: true }),
    );
  };

  protected override render() {
    return html`
      <div
        class=${classMap({
          slider: true,
          [`pos-${this.position}`]: true,
          dragging: this._dragging,
        })}
      >
        <div
          class="track"
          @pointerdown=${this._onTrackPointerDown}
          @pointermove=${this._onTrackPointerMove}
          @pointerup=${this._onTrackPointerUp}
          @pointercancel=${this._onTrackPointerUp}
        >
          <div
            class="thumb"
            style=${styleMap({ top: `${this._thumbTopPercent}%` })}
            aria-label="Zoom level"
            role="slider"
            aria-valuemin=${this.zoomMin}
            aria-valuemax=${this.zoomMax}
            aria-valuenow=${this.scale}
          ></div>
        </div>
        <button
          type="button"
          class="reset"
          aria-label="Reset zoom"
          title="Reset zoom"
          @click=${this._onResetClick}
          @pointerdown=${(e: Event) => e.stopPropagation()}
        >
          <ha-icon icon="mdi:fit-to-page-outline"></ha-icon>
        </button>
      </div>
    `;
  }

  static override styles = css`
    :host {
      /* Absolute overlay on the parent's gesture-area. The parent is
         already position: relative. */
      position: absolute;
      top: 15%;
      bottom: 15%;
      width: 32px;
      pointer-events: none; /* children re-enable selectively */
      z-index: 5;
    }
    .slider {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
    }
    /* Edge anchoring (left/right: 12px) is set as an inline style on
       the host in updated() based on the position property. The pos-*
       class on .slider is a hook for future variant tweaks. */
    .track {
      position: relative;
      flex: 1;
      width: 6px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      cursor: pointer;
      pointer-events: auto;
      touch-action: none;
    }
    .thumb {
      position: absolute;
      left: 50%;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--fn-overlay-button-bg, rgba(0, 0, 0, 0.6));
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.4),
        0 2px 6px rgba(0, 0, 0, 0.4);
      transform: translate(-50%, -50%);
      transition:
        width 120ms ease,
        height 120ms ease,
        background 120ms ease;
      cursor: grab;
      pointer-events: none;
    }
    .slider.dragging .thumb {
      width: 32px;
      height: 32px;
      cursor: grabbing;
    }
    .reset {
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--fn-overlay-button-bg, rgba(0, 0, 0, 0.6));
      color: white;
      cursor: pointer;
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.4),
        0 2px 6px rgba(0, 0, 0, 0.4);
    }
    .reset:active {
      transform: scale(0.92);
    }
    .reset ha-icon {
      --mdc-icon-size: 18px;
      width: 18px;
      height: 18px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-zoom-slider': FnZoomSlider;
  }
}
