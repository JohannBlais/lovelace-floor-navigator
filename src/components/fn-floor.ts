import { LitElement, css, html, svg, type PropertyValues, type SVGTemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { renderOverlayLayer } from './fn-overlay-layer.js';
import { backgroundCrossfade } from '../styles/card-styles.js';
import { resolveBackgrounds, type ResolvedBackgrounds } from '../utils/background-resolver.js';
import type { ThemeMode } from '../utils/theme-resolver.js';
import type { DarkModeSetting, Floor, Overlay } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders a single floor: an SVG with the configured viewBox, one or
 * two background `<image>` elements (depending on whether a dark
 * variant is configured), and one `<g class="fn-overlay-layer">` per
 * overlay (filtered to the elements that live on this floor).
 *
 * Dark-mode rendering (specs/features/dark-mode.md):
 * - Two stacked `<image>` elements if the floor has a dark variant
 *   AND `darkModeSetting !== 'off'`. Classes `fn-bg-default` +
 *   `fn-bg-dark`, the opacity toggle is driven by the
 *   `fn-theme-{light|dark}` class on the `<svg>` and the
 *   `backgroundCrossfade` CSS rules.
 * - Otherwise a single `<image>` without an `fn-bg-*` class, so it
 *   stays fully visible regardless of theme (= graceful fallback).
 *
 * GOTCHA — DO NOT split the SVG body into nested html`` templates.
 * lit-html parses each template as HTML in isolation; nested
 * templates inside `<svg>` are parsed without an SVG ancestor and the
 * HTML parser auto-corrects `<image>` into `<img>` (which has no
 * `href` attribute → image never loads). Use the `svg` tagged
 * template for any conditional sub-fragment, like
 * `_renderBackgrounds()` below.
 */
@customElement('fn-floor')
export class FnFloor extends LitElement {
  /** SVG viewBox string, e.g. "0 0 1920 1080". */
  @property({ type: String }) viewbox = '';

  /** The floor object — used for the SVG group id `fn-floor-{id}`
   * (see specs/architecture/component-tree.md). */
  @property({ attribute: false }) floor!: Floor;

  /** Overlays the user has configured (already filtered by visibility). */
  @property({ attribute: false }) overlays: Overlay[] = [];

  /** HA hass object, forwarded to each `<fn-element-icon>`. */
  @property({ attribute: false }) hass?: HomeAssistant;

  /**
   * v0.1.1 — Current theme mode resolved at the card root.
   * Drives which `<image>` is visible via the `fn-theme-*` class on `<svg>`.
   */
  @property({ type: String, attribute: false }) currentTheme: ThemeMode = 'light';

  /**
   * v0.1.1 — `settings.dark_mode` value, forwarded for the emit-decision.
   * When `'off'`, the dark `<image>` is NOT rendered in the DOM at all
   * (no inert image to download / hold in memory).
   */
  @property({ type: String, attribute: false }) darkModeSetting: DarkModeSetting = 'auto';

  /**
   * Set the first time we warn about a missing dark variant for this
   * floor instance. Prevents spamming the console on every re-render.
   */
  private _hasWarnedNoDarkVariant = false;

  /** Parses the viewBox string into [minX, minY, width, height]. */
  private get viewBoxRect(): { width: number; height: number } | null {
    const parts = this.viewbox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return null;
    }
    return { width: parts[2], height: parts[3] };
  }

  protected override updated(_changed: PropertyValues<this>): void {
    // Warn once per instance when the current theme is dark but we have
    // no dark variant for this floor. See specs/features/dark-mode.md
    // §"Floor without dark variant in dark mode".
    if (this._hasWarnedNoDarkVariant) return;
    if (this.currentTheme !== 'dark') return;
    const bg = resolveBackgrounds(this.floor);
    if (bg.dark) return;
    console.warn(
      `[floor-navigator-card] Floor "${this.floor?.id ?? '?'}" has no dark variant. ` +
        `Falling back to default image in dark mode.`,
    );
    this._hasWarnedNoDarkVariant = true;
  }

  protected override render() {
    const rect = this.viewBoxRect;
    if (!rect) {
      return html`<div class="error">Invalid viewBox: "${this.viewbox}"</div>`;
    }
    const floorId = this.floor?.id ?? '';
    const bg = resolveBackgrounds(this.floor);
    const emitDark = !!bg.dark && this.darkModeSetting !== 'off';

    return html`
      <svg
        viewBox=${this.viewbox}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        class=${classMap({ [`fn-theme-${this.currentTheme}`]: true })}
      >
        ${this._renderBackgrounds(floorId, bg, rect, emitDark)}
        ${this.overlays.map((overlay) => renderOverlayLayer(overlay, floorId, this.hass))}
      </svg>
    `;
  }

  private _renderBackgrounds(
    floorId: string,
    bg: ResolvedBackgrounds,
    rect: { width: number; height: number },
    emitDark: boolean,
  ): SVGTemplateResult {
    if (emitDark) {
      // Two images stacked in the DOM, opacity-toggled via the
      // backgroundCrossfade rules + `fn-theme-{light|dark}` on the <svg>.
      return svg`
        <image
          id="fn-floor-${floorId}-bg-default"
          class="fn-bg-default"
          href=${bg.default}
          x="0"
          y="0"
          width=${rect.width}
          height=${rect.height}
          preserveAspectRatio="xMidYMid meet"
        />
        <image
          id="fn-floor-${floorId}-bg-dark"
          class="fn-bg-dark"
          href=${bg.dark ?? ''}
          x="0"
          y="0"
          width=${rect.width}
          height=${rect.height}
          preserveAspectRatio="xMidYMid meet"
        />
      `;
    }
    // Single image without an `fn-bg-*` class → no opacity rule
    // applies, the image stays fully visible regardless of
    // `fn-theme-*`. This is the graceful fallback for floors in
    // short form or when `dark_mode === 'off'`.
    return svg`
      <image
        id="fn-floor-${floorId}-bg"
        href=${bg.default}
        x="0"
        y="0"
        width=${rect.width}
        height=${rect.height}
        preserveAspectRatio="xMidYMid meet"
      />
    `;
  }

  static override styles = [
    backgroundCrossfade,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: 100%;
      }
      .error {
        padding: 12px;
        color: var(--error-color, #c33);
        font-family: monospace;
        font-size: 12px;
      }
      /* Text overlay elements (specs/features/data-model.md §"Element type text"
         + specs/features/color-scheme.md §"Texte").
         Stroke painted first then fill on top, giving the value a high-contrast
         outline against any background. stroke-width is set per-element in
         renderTextElement so it scales with font-size. */
      svg .fn-element-text {
        fill: var(--fn-color-text, #fff);
        stroke: rgba(0, 0, 0, 0.7);
        paint-order: stroke fill;
        stroke-linejoin: round;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
        font-weight: 600;
        text-anchor: middle;
        dominant-baseline: central;
        pointer-events: none;
        user-select: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-floor': FnFloor;
  }
}
