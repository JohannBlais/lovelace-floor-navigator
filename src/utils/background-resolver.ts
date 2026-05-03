// Resolves the background image paths for a floor.
// Mirrors specs/features/dark-mode.md §"Algorithme de résolution du path d'image".

import type { Floor } from '../types/config.js';

export interface ResolvedBackgrounds {
  /** Image par défaut (mode light + fallback universel). Toujours définie. */
  default: string;
  /** Variant pour le mode dark, optionnel. */
  dark?: string;
}

/**
 * Returns the resolved `{ default, dark? }` paths for a floor.
 *
 * - Si `floor.backgrounds` est défini, il prend la priorité (v0.1.1).
 * - Sinon on retombe sur la forme courte `floor.background` (v0.1.0
 *   compat backward) — `default` = `background`, pas de `dark`.
 * - Si les deux sont présents, `backgrounds` gagne, `background` est
 *   ignoré silencieusement (situation transitoire de migration).
 *
 * Hypothèse : `setConfig` a déjà validé qu'au moins l'un des deux
 * champs est présent. En cas d'incohérence (les deux absents), on
 * retourne une chaîne vide pour ne pas crasher — le browser affichera
 * une image cassée, ce qui est diagnosticable visuellement.
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
