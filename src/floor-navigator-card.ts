import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './components/fn-navigation-controller.js';
import { cardVariables } from './styles/card-styles.js';
import { resolveTheme, type ThemeMode } from './utils/theme-resolver.js';
import type {
  CardConfig,
  FullscreenButtonPosition,
  FullscreenButtonVisibility,
  Overlay,
  OverlayElement,
  OverlaySizeUnit,
} from './types/config.js';
import type { HomeAssistant } from './types/ha.js';

const DEFAULT_MIN_ICON_PX = 24;
const DEFAULT_MIN_TEXT_PX = 14;
const DEFAULT_ZOOM_MIN = 1;
const DEFAULT_ZOOM_MAX = 4;
const DEFAULT_ZOOM_STEP = 0.1;
const DEFAULT_DOUBLE_TAP_SCALE = 2;

// Bump in lockstep with package.json on every release. Surfaced via
// console.info on bundle load so we can verify in HA's DevTools that
// Lovelace is serving the version we expect (cache busting check).
const CARD_VERSION = '0.2.0';

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description?: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}

console.info(
  `%c FLOOR-NAVIGATOR-CARD %c v${CARD_VERSION} `,
  'color: #fff; background: #4a90e2; font-weight: 700; padding: 2px 6px; border-radius: 3px 0 0 3px;',
  'color: #4a90e2; background: #fff; font-weight: 700; padding: 2px 6px; border-radius: 0 3px 3px 0; border: 1px solid #4a90e2;',
);

// Register with HACS card picker. Guard against double-registration on
// hot reload (the bundle may be evaluated twice in dev mode).
window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === 'floor-navigator-card')) {
  window.customCards.push({
    type: 'floor-navigator-card',
    name: 'Floor Navigator',
    description: 'Multi-level interactive floor plans with entity overlays.',
    preview: false,
    documentationURL: 'https://github.com/JohannBlais/lovelace-floor-navigator',
  });
}

@customElement('floor-navigator-card')
export class FloorNavigatorCard extends LitElement {
  /** HA hass object — set by Lovelace at every state tick. */
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CardConfig;
  /**
   * Set of overlay ids currently visible. Initialised from each overlay's
   * `default_visible` (specs/features/overlays-toggle.md — local
   * non-persisted state). Mutated by `<fn-overlay-buttons>` at step 7.
   */
  @state() private _visibleOverlayIds: Set<string> = new Set();
  /**
   * v0.1.1 — Current theme mode resolved from the cascade
   * `settings.dark_mode` > `hass.themes.darkMode` > `prefers-color-scheme`.
   * Recomputed in `willUpdate` whenever `hass` or `_config` changes, and
   * by the matchMedia listener when the OS-level preference toggles.
   */
  @state() private _currentTheme: ThemeMode = 'light';

  /**
   * v0.2.0 — viewBoxWidth / cardWidthPx, the single source of truth shared
   * with overlay-readability sizing and (later) pan-zoom transform. Defaults
   * to 1 so that on the very first paint (before ResizeObserver fires) sizes
   * fall back to no compensation, matching v0.1.x behaviour. See
   * specs/features/overlay-readability.md §"Reactive recomputation".
   */
  @state() private _viewBoxToScreenRatio = 1;
  /**
   * v0.2.0 — Mobile fullscreen mode (specs/features/mobile-fullscreen-mode.md).
   * Toggled by the expand button. Drives:
   * - the `fn-fullscreen` class on the host (CSS position: fixed; inset: 0;
   *   z-index: 9999) and the layout reflow inside the controller,
   * - the body scroll lock,
   * - the history-state push (browser-back exits fullscreen),
   * - the Escape key listener (desktop exit).
   */
  @state() private _isFullscreen = false;

  /**
   * Saved value of `document.body.style.overflow` before fullscreen entry,
   * restored on exit. Per-instance so multiple cards don't trample each
   * other (last-out wins on overlapping fullscreens, see spec edge case).
   */
  private _previousBodyOverflow = '';
  /** True if the current entry pushed a history state we still own. */
  private _ownsHistoryState = false;
  private _onPopState = (e: PopStateEvent): void => {
    void e;
    // Browser back / forward while we own the state → exit fullscreen.
    if (this._isFullscreen) {
      this._exitFullscreen({ fromPopState: true });
    }
  };
  private _onKeyDownEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._isFullscreen) {
      e.preventDefault();
      this._exitFullscreen();
    }
  };

  /** Browser-level dark-mode preference watcher, populated in connectedCallback. */
  private _matchMedia?: MediaQueryList;
  private _matchMediaListener = (): void => {
    this._recomputeTheme();
  };

  /**
   * v0.2.0 — Watches the host's box. Recomputes `_viewBoxToScreenRatio`
   * whenever the card resizes (sidebar toggle, fullscreen entry, viewport
   * rotation...). Single ResizeObserver shared with future pan-zoom code.
   */
  private _resizeObserver?: ResizeObserver;
  /** Last known card width in CSS pixels (0 → not yet measured / hidden). */
  private _cardWidthPx = 0;
  /**
   * Fallback path for browsers without ResizeObserver (very old). The
   * `window.resize` listener is only registered when the observer is
   * unavailable.
   */
  private _windowResizeListener = (): void => {
    this._measureAndUpdateRatio();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this._matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
      this._matchMedia.addEventListener('change', this._matchMediaListener);
    }
    this._recomputeTheme();

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        // contentBoxSize is the modern shape; fall back to contentRect for
        // older Safari that supports ResizeObserver but not the new array.
        let width = 0;
        const boxes = entry.contentBoxSize as
          | ReadonlyArray<ResizeObserverSize>
          | undefined;
        if (boxes && boxes.length > 0) {
          width = boxes[0].inlineSize;
        } else {
          width = entry.contentRect.width;
        }
        this._applyMeasuredWidth(width);
      });
      this._resizeObserver.observe(this);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._windowResizeListener);
      // Defer one frame so the host has a layout box.
      requestAnimationFrame(() => this._measureAndUpdateRatio());
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._matchMedia) {
      this._matchMedia.removeEventListener('change', this._matchMediaListener);
      this._matchMedia = undefined;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._windowResizeListener);
    }
    // v0.2.0 — clean up fullscreen side effects if torn down mid-flight
    // (e.g., the user navigates away from the dashboard while fullscreen).
    if (this._isFullscreen) {
      this._exitFullscreen({ skipHistoryBack: true });
    }
  }

  // ────────────────────── fullscreen ──────────────────────
  // v0.2.0 — see specs/features/mobile-fullscreen-mode.md.

  private _toggleFullscreen = (): void => {
    if (this._isFullscreen) {
      this._exitFullscreen();
    } else {
      this._enterFullscreen();
    }
  };

  private _enterFullscreen(): void {
    if (this._isFullscreen) return;
    this._isFullscreen = true;
    this.classList.add('fn-fullscreen');
    // Body scroll lock — saved + restored on exit.
    if (typeof document !== 'undefined' && document.body) {
      this._previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    // History state push so Android/iOS back-gesture exits fullscreen
    // rather than leaving the dashboard. Pattern shared with HA's
    // more-info dialog and Mushroom popups.
    if (typeof history !== 'undefined') {
      try {
        history.pushState({ fnFullscreen: true }, '');
        this._ownsHistoryState = true;
      } catch {
        this._ownsHistoryState = false;
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this._onPopState);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._onKeyDownEscape);
    }
  }

  private _exitFullscreen(opts: { fromPopState?: boolean; skipHistoryBack?: boolean } = {}): void {
    if (!this._isFullscreen) return;
    this._isFullscreen = false;
    this.classList.remove('fn-fullscreen');
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = this._previousBodyOverflow;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this._onPopState);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onKeyDownEscape);
    }
    // Pop our history entry if we still own it AND the exit did not come
    // from the popstate event itself (which already consumed the state).
    if (
      this._ownsHistoryState &&
      !opts.fromPopState &&
      !opts.skipHistoryBack &&
      typeof history !== 'undefined'
    ) {
      try {
        history.back();
      } catch {
        /* ignore */
      }
    }
    this._ownsHistoryState = false;
  }

  private _measureAndUpdateRatio(): void {
    const rect = this.getBoundingClientRect();
    this._applyMeasuredWidth(rect.width);
  }

  private _applyMeasuredWidth(width: number): void {
    // Skip when hidden by parent layout (display:none, visibility:hidden,
    // detached). Avoids division by zero and keeps the last known good
    // ratio. Per spec §"Card width === 0".
    if (!Number.isFinite(width) || width <= 0) return;
    this._cardWidthPx = width;
    this._recomputeRatio();
  }

  private _recomputeRatio(): void {
    const vbWidth = this._viewBoxWidth;
    if (this._cardWidthPx <= 0 || vbWidth <= 0) return;
    const next = vbWidth / this._cardWidthPx;
    if (next !== this._viewBoxToScreenRatio) {
      this._viewBoxToScreenRatio = next;
    }
  }

  private get _viewBoxWidth(): number {
    return this._parsedViewBox?.width ?? 0;
  }

  private get _viewBoxHeight(): number {
    return this._parsedViewBox?.height ?? 0;
  }

  /** Parses the viewBox string once per render of this getter. Cheap
   * (small string), and avoids stashing a state field. */
  private get _parsedViewBox(): { width: number; height: number } | null {
    if (!this._config?.viewbox) return null;
    const parts = this._config.viewbox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
    return { width: parts[2], height: parts[3] };
  }

  protected override willUpdate(changed: PropertyValues): void {
    // Drop the `<this>` generic — Lit's strict overload of `Map.has()` for
    // PropertyValueMap<T> filters keyof T to public properties, so private
    // @state fields like `_config` aren't recognized. Falling back to the
    // generic-less `PropertyValues` (alias for Map<PropertyKey, unknown>)
    // allows any string key.
    if (changed.has('hass') || changed.has('_config')) {
      this._recomputeTheme();
    }
    if (changed.has('_config')) {
      // viewBox may have changed → recompute ratio with the new viewBoxWidth.
      this._recomputeRatio();
    }
  }

  private _recomputeTheme(): void {
    const setting = this._config?.settings?.dark_mode;
    const next = resolveTheme(this.hass, setting);
    if (next !== this._currentTheme) {
      this._currentTheme = next;
    }
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: a config object is required');
    }
    if (!config.viewbox || typeof config.viewbox !== 'string') {
      throw new Error('Invalid configuration: `viewbox` is required (e.g. "0 0 1920 1080")');
    }
    if (!Array.isArray(config.floors) || config.floors.length === 0) {
      throw new Error('Invalid configuration: at least one floor is required in `floors`');
    }
    const floorIds = new Set<string>();
    for (const floor of config.floors) {
      if (!floor || typeof floor !== 'object' || !floor.id || !floor.name) {
        throw new Error(
          `Invalid floor: \`id\` and \`name\` are required (got ${JSON.stringify(floor)})`,
        );
      }
      // v0.1.1 — at least one of `background` (short form) or
      // `backgrounds.default` (extended form) must be present.
      if (!floor.background && !floor.backgrounds) {
        throw new Error(
          `Floor "${floor.id}" requires either 'background' or 'backgrounds.default'`,
        );
      }
      if (floor.backgrounds) {
        if (typeof floor.backgrounds !== 'object' || !floor.backgrounds.default) {
          throw new Error(
            `Floor "${floor.id}" has 'backgrounds' but no 'backgrounds.default'`,
          );
        }
      }
      floorIds.add(floor.id);
    }

    if (config.overlays !== undefined) {
      if (!Array.isArray(config.overlays)) {
        throw new Error('Invalid configuration: `overlays` must be an array');
      }
      for (const overlay of config.overlays) {
        validateOverlay(overlay, floorIds);
      }
    }

    // v0.2.0 — soft-validate the new sizing fields. Bad values warn and
    // fall back to defaults; we do not throw, to keep YAML mistakes from
    // bricking the card.
    const sizeUnit = config.settings?.overlay_size_unit;
    if (sizeUnit !== undefined && sizeUnit !== 'viewbox' && sizeUnit !== 'px') {
      console.warn(
        `[floor-navigator-card] settings.overlay_size_unit "${String(sizeUnit)}" is not "viewbox" | "px"; falling back to "viewbox".`,
      );
    }
    const minIcon = config.settings?.min_icon_px;
    if (minIcon !== undefined && (typeof minIcon !== 'number' || minIcon < 0)) {
      console.warn(
        `[floor-navigator-card] settings.min_icon_px must be a non-negative number; falling back to ${DEFAULT_MIN_ICON_PX}.`,
      );
    }
    const minText = config.settings?.min_text_px;
    if (minText !== undefined && (typeof minText !== 'number' || minText < 0)) {
      console.warn(
        `[floor-navigator-card] settings.min_text_px must be a non-negative number; falling back to ${DEFAULT_MIN_TEXT_PX}.`,
      );
    }
    // v0.2.0 — pan-zoom settings.
    const zMin = config.settings?.zoom_min;
    const zMax = config.settings?.zoom_max;
    if (zMin !== undefined && (typeof zMin !== 'number' || zMin <= 0)) {
      console.warn(
        `[floor-navigator-card] settings.zoom_min must be a positive number; falling back to ${DEFAULT_ZOOM_MIN}.`,
      );
    }
    if (zMax !== undefined && (typeof zMax !== 'number' || zMax <= 0)) {
      console.warn(
        `[floor-navigator-card] settings.zoom_max must be a positive number; falling back to ${DEFAULT_ZOOM_MAX}.`,
      );
    }
    if (
      typeof zMin === 'number' &&
      typeof zMax === 'number' &&
      zMin > 0 &&
      zMax > 0 &&
      zMin >= zMax
    ) {
      console.warn(
        `[floor-navigator-card] settings.zoom_min (${zMin}) must be < zoom_max (${zMax}); falling back to defaults.`,
      );
    }
    const zStep = config.settings?.zoom_step;
    if (zStep !== undefined && (typeof zStep !== 'number' || zStep <= 0)) {
      console.warn(
        `[floor-navigator-card] settings.zoom_step must be a positive number; falling back to ${DEFAULT_ZOOM_STEP}.`,
      );
    }
    const zDt = config.settings?.zoom_double_tap_scale;
    if (zDt !== undefined && (typeof zDt !== 'number' || zDt <= 0)) {
      console.warn(
        `[floor-navigator-card] settings.zoom_double_tap_scale must be a positive number; falling back to ${DEFAULT_DOUBLE_TAP_SCALE}.`,
      );
    }
    // v0.2.0 — fullscreen mode settings.
    const fsButton = config.settings?.fullscreen_button;
    if (
      fsButton !== undefined &&
      fsButton !== 'auto' &&
      fsButton !== 'always' &&
      fsButton !== 'never'
    ) {
      console.warn(
        `[floor-navigator-card] settings.fullscreen_button "${String(fsButton)}" is not "auto" | "always" | "never"; falling back to "auto".`,
      );
    }
    const fsPos = config.settings?.fullscreen_button_position;
    const fsValid = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
    if (fsPos !== undefined && !fsValid.includes(fsPos)) {
      console.warn(
        `[floor-navigator-card] settings.fullscreen_button_position "${String(fsPos)}" is not one of ${fsValid.join(', ')}; falling back to "top-right".`,
      );
    }

    this._config = config;
    this._visibleOverlayIds = new Set(
      (config.overlays ?? []).filter((o) => o.default_visible).map((o) => o.id),
    );
  }

  public getCardSize(): number {
    return 8;
  }

  private _onOverlayToggle = (e: CustomEvent<{ id: string }>): void => {
    const id = e.detail?.id;
    if (!id) return;
    // Allocate a new Set so Lit detects the @state change.
    const next = new Set(this._visibleOverlayIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._visibleOverlayIds = next;
  };

  protected override render() {
    if (!this._config) {
      return html`<div class="placeholder">Floor Navigator: no config loaded.</div>`;
    }
    const settings = this._config.settings ?? {};
    const allOverlays = this._config.overlays ?? [];
    const visibleOverlays = allOverlays.filter((o) => this._visibleOverlayIds.has(o.id));
    const sizeUnit: OverlaySizeUnit =
      settings.overlay_size_unit === 'px' ? 'px' : 'viewbox';
    const minIconPx =
      typeof settings.min_icon_px === 'number' && settings.min_icon_px >= 0
        ? settings.min_icon_px
        : DEFAULT_MIN_ICON_PX;
    const minTextPx =
      typeof settings.min_text_px === 'number' && settings.min_text_px >= 0
        ? settings.min_text_px
        : DEFAULT_MIN_TEXT_PX;
    // v0.2.0 — pan-zoom settings, with cross-validated min/max fallback.
    let zoomMin =
      typeof settings.zoom_min === 'number' && settings.zoom_min > 0
        ? settings.zoom_min
        : DEFAULT_ZOOM_MIN;
    let zoomMax =
      typeof settings.zoom_max === 'number' && settings.zoom_max > 0
        ? settings.zoom_max
        : DEFAULT_ZOOM_MAX;
    if (zoomMin >= zoomMax) {
      zoomMin = DEFAULT_ZOOM_MIN;
      zoomMax = DEFAULT_ZOOM_MAX;
    }
    const zoomStep =
      typeof settings.zoom_step === 'number' && settings.zoom_step > 0
        ? settings.zoom_step
        : DEFAULT_ZOOM_STEP;
    const zoomDoubleTapScale =
      typeof settings.zoom_double_tap_scale === 'number' &&
      settings.zoom_double_tap_scale > 0
        ? settings.zoom_double_tap_scale
        : DEFAULT_DOUBLE_TAP_SCALE;
    const fullscreenVisibility: FullscreenButtonVisibility =
      settings.fullscreen_button === 'never' || settings.fullscreen_button === 'always'
        ? settings.fullscreen_button
        : 'auto';
    const fullscreenPosition: FullscreenButtonPosition =
      settings.fullscreen_button_position === 'top-left' ||
      settings.fullscreen_button_position === 'bottom-right' ||
      settings.fullscreen_button_position === 'bottom-left'
        ? settings.fullscreen_button_position
        : 'top-right';
    const showFullscreenButton = fullscreenVisibility !== 'never';
    return html`
      <ha-card>
        <fn-navigation-controller
          .floors=${this._config.floors}
          .viewbox=${this._config.viewbox}
          .viewBoxWidth=${this._viewBoxWidth}
          .viewBoxHeight=${this._viewBoxHeight}
          .viewBoxToScreenRatio=${this._viewBoxToScreenRatio}
          .sizeUnit=${sizeUnit}
          .minIconPx=${minIconPx}
          .minTextPx=${minTextPx}
          .zoomMin=${zoomMin}
          .zoomMax=${zoomMax}
          .zoomStep=${zoomStep}
          .zoomDoubleTapScale=${zoomDoubleTapScale}
          .transition=${settings.transition ?? 'crossfade'}
          .transitionDuration=${settings.transition_duration ?? 400}
          .edgeBehavior=${settings.edge_behavior ?? 'bounce'}
          .navigationMode=${settings.navigation_mode ?? 'both'}
          .startFloor=${settings.start_floor}
          .showFloorIndicator=${settings.show_floor_indicator ?? true}
          .overlayButtonsPosition=${settings.overlay_buttons_position ?? 'bottom'}
          .overlays=${visibleOverlays}
          .allOverlays=${allOverlays}
          .visibleOverlayIds=${this._visibleOverlayIds}
          .hass=${this.hass}
          .currentTheme=${this._currentTheme}
          .darkModeSetting=${settings.dark_mode ?? 'auto'}
          .fullscreen=${this._isFullscreen}
          @overlay-toggle=${this._onOverlayToggle}
        ></fn-navigation-controller>
        ${showFullscreenButton
          ? html`<button
              type="button"
              class="fn-fullscreen-button pos-${fullscreenPosition}"
              aria-label=${this._isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title=${this._isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              @click=${this._toggleFullscreen}
            >
              <ha-icon
                icon=${this._isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}
              ></ha-icon>
            </button>`
          : ''}
      </ha-card>
    `;
  }

  static override styles = [
    cardVariables,
    css`
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
        position: relative; /* anchor for the fullscreen button overlay */
      }
      .placeholder {
        padding: 12px;
        color: var(--secondary-text-color, #888);
        font-family: monospace;
        font-size: 12px;
      }

      /* ────────── v0.2.0 — fullscreen button (always rendered when not "never") ────────── */
      .fn-fullscreen-button {
        position: absolute;
        z-index: 10;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--fn-overlay-button-bg, rgba(0, 0, 0, 0.5));
        color: white;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.4),
          0 2px 6px rgba(0, 0, 0, 0.4);
        transition:
          background 200ms ease,
          transform 100ms ease;
      }
      .fn-fullscreen-button:active {
        transform: scale(0.92);
      }
      .fn-fullscreen-button.pos-top-right {
        top: 12px;
        right: 12px;
      }
      .fn-fullscreen-button.pos-top-left {
        top: 12px;
        left: 12px;
      }
      .fn-fullscreen-button.pos-bottom-right {
        bottom: 12px;
        right: 12px;
      }
      .fn-fullscreen-button.pos-bottom-left {
        bottom: 12px;
        left: 12px;
      }
      .fn-fullscreen-button ha-icon {
        --mdc-icon-size: 22px;
        width: 22px;
        height: 22px;
        display: block;
      }

      /* ────────── v0.2.0 — fullscreen mode CSS ────────── */
      :host(.fn-fullscreen) {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: var(--card-background-color, #1e1e1e);
        display: flex;
        flex-direction: column;
      }
      :host(.fn-fullscreen) ha-card {
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        flex: 1;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    `,
  ];
}

function validateOverlay(overlay: Overlay, floorIds: Set<string>): void {
  if (!overlay || typeof overlay !== 'object' || !overlay.id || !overlay.name) {
    throw new Error(
      `Invalid overlay: \`id\` and \`name\` are required (got ${JSON.stringify(overlay)})`,
    );
  }
  if (!Array.isArray(overlay.elements)) {
    throw new Error(`Invalid overlay \`${overlay.id}\`: \`elements\` must be an array`);
  }
  for (const el of overlay.elements) {
    validateElement(el, overlay.id, floorIds);
  }
}

function validateElement(
  el: OverlayElement,
  overlayId: string,
  floorIds: Set<string>,
): void {
  if (!el || typeof el !== 'object') {
    throw new Error(`Invalid element in overlay \`${overlayId}\`: not an object`);
  }
  if (!el.floor || !floorIds.has(el.floor)) {
    throw new Error(
      `Invalid element in overlay \`${overlayId}\`: \`floor\` must reference a declared floor id (got "${el.floor}")`,
    );
  }
  if (!el.entity || typeof el.entity !== 'string') {
    throw new Error(`Invalid element in overlay \`${overlayId}\`: \`entity\` is required`);
  }
  if (
    !el.position ||
    typeof el.position !== 'object' ||
    typeof el.position.x !== 'number' ||
    typeof el.position.y !== 'number'
  ) {
    throw new Error(
      `Invalid element \`${el.entity}\` in overlay \`${overlayId}\`: \`position\` must be { x: number, y: number }`,
    );
  }
  // Cast to unknown when reading `type`: the static union excludes any
  // other value, but at runtime YAML can still pass us garbage.
  const elType: unknown = (el as { type: unknown }).type;
  if (elType !== 'icon' && elType !== 'text') {
    throw new Error(
      `Invalid element \`${el.entity}\` in overlay \`${overlayId}\`: \`type\` must be "icon" or "text" (got "${String(elType)}")`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'floor-navigator-card': FloorNavigatorCard;
  }
}
