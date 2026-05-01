/**
 * Resolves the CSS color value for an entity based on its domain and state.
 * Returns a `var(...)` chain that prefers domain-specific overrides and
 * falls back to the generic on/off/unavailable variables (SPEC §3.4.1).
 */

/**
 * State values considered "active" / "on" across HA domains.
 * Anything outside this set (and not unavailable) is treated as "off".
 */
const ON_STATES = new Set<string>([
  'on',
  'home',
  'open',
  'unlocked',
  'playing',
  'active',
  'heat',
  'cool',
  'auto',
  'heat_cool',
  'fan_only',
  'dry',
  'cleaning',
]);

const UNAVAILABLE_STATES = new Set<string>(['unavailable', 'unknown']);

/**
 * Returns a CSS color value (using `var()` chain) for an entity in a given state.
 *
 *   resolveColorVar('light.salon', 'on')      // → 'var(--fn-color-light-on, var(--fn-color-on))'
 *   resolveColorVar('switch.x', 'off')        // → 'var(--fn-color-switch-off, var(--fn-color-off))'
 *   resolveColorVar('any.entity', 'unknown')  // → 'var(--fn-color-unavailable)'
 *
 * The fallback chain is necessary because `var(--undef)` resolves to its
 * fallback only — there's no "use the variable if defined, else…" CSS-side.
 */
export function resolveColorVar(entityId: string, state: string | undefined): string {
  if (!state || UNAVAILABLE_STATES.has(state)) {
    return 'var(--fn-color-unavailable)';
  }
  const domain = entityId.split('.', 1)[0];
  const suffix = ON_STATES.has(state) ? 'on' : 'off';
  return `var(--fn-color-${domain}-${suffix}, var(--fn-color-${suffix}))`;
}
