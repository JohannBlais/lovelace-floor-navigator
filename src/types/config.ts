// Configuration types for floor-navigator-card.
// Mirrors specs/features/data-model.md and specs/features/dark-mode.md.

export interface CardConfig {
  type: string;
  viewbox: string;
  settings?: CardSettings;
  floors: Floor[];
  overlays?: Overlay[];
}

export interface CardSettings {
  transition?: TransitionMode;
  transition_duration?: number;
  start_floor?: string;
  navigation_mode?: NavigationMode;
  edge_behavior?: EdgeBehavior;
  show_floor_indicator?: boolean;
  overlay_buttons_position?: OverlayButtonsPosition;
  /**
   * v0.1.1 — Drives the display of dark variants.
   * - `auto` (default): follows `hass.themes.darkMode`, then `prefers-color-scheme`
   * - `on`:             forces dark mode
   * - `off`:            forces light mode + does NOT emit the dark <image> in the DOM
   */
  dark_mode?: DarkModeSetting;
  /**
   * v0.2.0 — Sizing semantics for overlay icons and text. See
   * specs/features/overlay-readability.md.
   * - `viewbox` (default): `size` / `font_size` are viewBox units; defaults
   *   derived from viewBox dimensions (viewBoxWidth/40 for icons,
   *   viewBoxWidth/80 for text). Backward-compatible with v0.1.x.
   * - `px`: `size` / `font_size` are screen pixels; inverse-compensated
   *   against the viewBox-to-screen ratio and (eventually) pan-zoom scale.
   */
  overlay_size_unit?: OverlaySizeUnit;
  /**
   * v0.2.0 — Minimum rendered icon size in screen pixels. Acts as a clamp:
   * if the rendered size would otherwise fall below this floor, the SVG
   * size is bumped up to meet it. Default 24.
   */
  min_icon_px?: number;
  /**
   * v0.2.0 — Same idea as `min_icon_px` for text font size. Default 14.
   */
  min_text_px?: number;
  /**
   * v0.2.0 — Pan-zoom limits. See specs/features/pan-zoom-interactions.md.
   * - `zoom_min`: minimum scale factor (default 1; ≥ 0.5 recommended)
   * - `zoom_max`: maximum scale factor (default 4; ≤ 8 recommended)
   * - `zoom_step`: scale increment per Ctrl+wheel notch (default 0.1)
   * - `zoom_double_tap_scale`: target scale for double-tap toggle (default 2)
   * - `zoom_slider`: vertical slider position (`right` default | `left` | `none`)
   */
  zoom_min?: number;
  zoom_max?: number;
  zoom_step?: number;
  zoom_double_tap_scale?: number;
  zoom_slider?: ZoomSliderPosition;
}

export type TransitionMode = 'crossfade' | 'slide' | 'slide-scale';
export type NavigationMode = 'wheel' | 'swipe' | 'both' | 'none';
export type EdgeBehavior = 'bounce' | 'none' | 'loop';
export type OverlayButtonsPosition = 'top' | 'bottom' | 'none';
export type DarkModeSetting = 'auto' | 'on' | 'off';
export type OverlaySizeUnit = 'viewbox' | 'px';
export type ZoomSliderPosition = 'right' | 'left' | 'none';

/**
 * v0.1.1 — Extended form for a floor's background images.
 *
 * `default` is the fallback image (light mode + universal fallback).
 * `dark` is the optional alternative in dark mode.
 *
 * The index signature leaves room for future modes (high-contrast,
 * sepia, ambient...) without breaking change. Any key other than
 * `default` / `dark` is silently ignored in v0.1.1.
 */
export interface Backgrounds {
  default: string;
  dark?: string;
  [key: string]: string | undefined;
}

export interface Floor {
  id: string;
  name: string;
  /**
   * Short form v0.1.0 (backward-compatible).
   * At least one of `background` or `backgrounds.default` must be
   * present. If both are set, `backgrounds` wins and `background` is
   * silently ignored.
   */
  background?: string;
  /**
   * Extended form v0.1.1+ — allows per-mode variants.
   */
  backgrounds?: Backgrounds;
}

export interface Overlay {
  id: string;
  name: string;
  icon?: string;
  default_visible?: boolean;
  elements: OverlayElement[];
}

export interface Position {
  x: number;
  y: number;
}

export type OverlayElement = IconElement | TextElement;

interface BaseElement {
  floor: string;
  entity: string;
  position: Position;
  tap_action?: TapAction;
}

export interface IconElement extends BaseElement {
  type: 'icon';
  icon?: string;
  size?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  unit?: string;
  precision?: number;
  font_size?: number;
}

export type TapAction = TapActionShorthand | TapActionObject;

export type TapActionShorthand = 'toggle' | 'more-info' | 'none';

export type TapActionObject =
  | { action: 'toggle' }
  | { action: 'more-info' }
  | { action: 'none' }
  | { action: 'navigate'; navigation_path: string }
  | { action: 'call-service'; service: string; service_data?: Record<string, unknown> }
  | { action: 'url'; url_path: string };
