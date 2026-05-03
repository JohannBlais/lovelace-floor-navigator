// Resolves the background image paths for a floor.
// Mirrors specs/features/dark-mode.md §"Image-path resolution algorithm".

import type { Floor } from '../types/config.js';

export interface ResolvedBackgrounds {
  /** Default image (light mode + universal fallback). Always defined. */
  default: string;
  /** Variant for dark mode, optional. */
  dark?: string;
}

/**
 * Returns the resolved `{ default, dark? }` paths for a floor.
 *
 * - If `floor.backgrounds` is defined, it takes priority (v0.1.1).
 * - Otherwise we fall back to the short form `floor.background`
 *   (v0.1.0 backward compat) — `default` = `background`, no `dark`.
 * - If both are present, `backgrounds` wins, `background` is silently
 *   ignored (acceptable transitory migration state).
 *
 * Assumption: `setConfig` has already validated that at least one of
 * the two fields is present. If both are absent (inconsistent), we
 * return an empty string rather than crash — the browser will display
 * a broken image, which is easy to diagnose visually.
 */
export function resolveBackgrounds(floor: Floor): ResolvedBackgrounds {
  if (floor.backgrounds) {
    const result: ResolvedBackgrounds = { default: floor.backgrounds.default };
    if (floor.backgrounds.dark) {
      result.dark = floor.backgrounds.dark;
    }
    return result;
  }
  if (floor.background) {
    return { default: floor.background };
  }
  return { default: '' };
}
