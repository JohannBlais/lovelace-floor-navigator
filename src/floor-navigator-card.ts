import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './components/fn-navigation-controller.js';
import { cardVariables } from './styles/card-styles.js';
import { resolveTheme, type ThemeMode } from './utils/theme-resolver.js';
import type { CardConfig, Overlay, OverlayElement } from './types/config.js';
import type { HomeAssistant } from './types/ha.js';

// Bump in lockstep with package.json on every release. Surfaced via
// console.info on bundle load so we can verify in HA's DevTools that
// Lovelace is serving the version we expect (cache busting check).
const CARD_VERSION = '0.1.0';

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
   * Set of overlay ids currently visible. Initialized from each overlay's
   * `default_visible` (SPEC §4.5 mécanisme A — local state, non-persisted).
   * Will be mutated by `<fn-overlay-buttons>` at step 7.
   */
  @state() private _visibleOverlayIds: Set<string> = new Set();
  /**
   * v0.1.1 — Current theme mode resolved from the cascade
   * `settings.dark_mode` > `hass.themes.darkMode` > `prefers-color-scheme`.
   * Recomputed in `willUpdate` whenever `hass` or `_config` changes, and
   * by the matchMedia listener when the OS-level preference toggles.
   */
  @state() private _currentTheme: ThemeMode = 'light';

  /** Browser-level dark-mode preference watcher, populated in connectedCallback. */
  private _matchMedia?: MediaQueryList;
  private _matchMediaListener = (): void => {
    this._recomputeTheme();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this._matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
      this._matchMedia.addEventListener('change', this._matchMediaListener);
    }
    this._recomputeTheme();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._matchMedia) {
      this._matchMedia.removeEventListener('change', this._matchMediaListener);
      this._matchMedia = undefined;
    }
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
      // v0.1.1 — au moins l'un de `background` (forme courte) ou
      // `backgrounds.default` (forme étendue) doit être présent.
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
    return html`
      <ha-card>
        <fn-navigation-controller
          .floors=${this._config.floors}
          .viewbox=${this._config.viewbox}
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
          @overlay-toggle=${this._onOverlayToggle}
        ></fn-navigation-controller>
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
      }
      .placeholder {
        padding: 12px;
        color: var(--secondary-text-color, #888);
        font-family: monospace;
        font-size: 12px;
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
