// Configuration types for floor-navigator-card.
// Mirrors SPEC.md §3 — keep aligned when the spec evolves.

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
}

export type TransitionMode = 'crossfade' | 'slide' | 'slide-scale';
export type NavigationMode = 'wheel' | 'swipe' | 'both' | 'none';
export type EdgeBehavior = 'bounce' | 'none' | 'loop';
export type OverlayButtonsPosition = 'top' | 'bottom' | 'none';

export interface Floor {
  id: string;
  name: string;
  background: string;
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
