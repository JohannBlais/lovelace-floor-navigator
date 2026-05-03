// Resolves the current theme mode (light/dark) for the card.
// Mirrors specs/features/dark-mode.md §"Source de la décision (cascade)".

import type { DarkModeSetting } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

export type ThemeMode = 'light' | 'dark';

/**
 * Resolves the current theme by walking the SPEC cascade in order :
 *
 *   1. Setting `dark_mode` (when explicit `on` / `off`) — highest priority.
 *   2. `hass.themes.darkMode` — official HA signal, follows the active theme.
 *   3. `window.matchMedia('(prefers-color-scheme: dark)')` — browser fallback.
 *
 * In `auto` mode (or when the setting is not set), the cascade falls through
 * to (2) then (3). When neither HA nor the browser provides a signal, default
 * to `'light'`.
 */
export function resolveTheme(
  hass: HomeAssistant | undefined,
  setting: DarkModeSetting | undefined,
): ThemeMode {
  // (1) Explicit setting — short-circuit
  if (setting === 'on') return 'dark';
  if (setting === 'off') return 'light';

  // (2) HA signal — read defensively : older HA frontends don't expose
  //     `darkMode` on `themes`. We coerce the unknown shape to a typed read.
  const haDarkMode = (hass?.themes as { darkMode?: boolean } | undefined)?.darkMode;
  if (typeof haDarkMode === 'boolean') {
    return haDarkMode ? 'dark' : 'light';
  }

  // (3) Browser fallback
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}
