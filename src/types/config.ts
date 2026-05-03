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
   * v0.1.1 — Pilote l'affichage des dark variants.
   * - `auto` (défaut) : suit `hass.themes.darkMode` puis `prefers-color-scheme`
   * - `on`            : force le dark mode
   * - `off`           : force le light mode + n'émet PAS les <image> dark dans le DOM
   */
  dark_mode?: DarkModeSetting;
}

export type TransitionMode = 'crossfade' | 'slide' | 'slide-scale';
export type NavigationMode = 'wheel' | 'swipe' | 'both' | 'none';
export type EdgeBehavior = 'bounce' | 'none' | 'loop';
export type OverlayButtonsPosition = 'top' | 'bottom' | 'none';
export type DarkModeSetting = 'auto' | 'on' | 'off';

/**
 * v0.1.1 — Forme étendue des images de fond d'un floor.
 *
 * `default` est l'image par défaut (mode light + fallback universel).
 * `dark` est l'image alternative en mode dark, optionnelle.
 *
 * La signature index ouvre la porte à des modes futurs
 * (high-contrast, sepia, ambient...) sans breaking change. Toute clé
 * autre que `default` / `dark` est ignorée silencieusement en v0.1.1.
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
   * Forme courte v0.1.0 (compat backward).
   * Au moins l'un de `background` ou `backgrounds.default` doit être
   * présent. Si les deux sont posés, `backgrounds` gagne, `background`
   * est ignoré silencieusement.
   */
  background?: string;
  /**
   * Forme étendue v0.1.1+ — permet de fournir des variants par mode.
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
