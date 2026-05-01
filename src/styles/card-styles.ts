import { css } from 'lit';

/**
 * CSS custom properties exposed on the card root (`floor-navigator-card`).
 * Mirrors SPEC §3.4. Users can override any of these via `card-mod` or via
 * the Lovelace theme.
 *
 * Custom properties cascade across shadow DOM boundaries (down only), so
 * descendant components (`fn-floor-indicator`, `fn-overlay-buttons`,
 * `fn-element-icon`, …) reference these via `var(--fn-…)` and get the
 * configured value.
 */
export const cardVariables = css`
  :host {
    /* ─── Generic states (fallback when no domain-specific override) ─── */
    --fn-color-on: rgb(255, 193, 7);
    --fn-color-off: rgb(120, 120, 120);
    --fn-color-unavailable: rgb(180, 80, 80);

    /* ─── Domain-specific colors (override generic when applicable) ─── */
    --fn-color-light-on: rgb(255, 193, 7);
    --fn-color-light-off: rgb(120, 120, 120);
    --fn-color-switch-on: rgb(76, 175, 80);
    --fn-color-switch-off: rgb(120, 120, 120);
    --fn-color-binary_sensor-on: rgb(33, 150, 243);
    --fn-color-binary_sensor-off: rgb(120, 120, 120);

    /* ─── Text overlay (type "text") ─── */
    --fn-color-text: rgb(255, 255, 255);
    --fn-text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);

    /* ─── UI chrome ─── */
    --fn-floor-indicator-bg: rgba(0, 0, 0, 0.6);
    --fn-floor-indicator-color: white;
    --fn-overlay-button-bg: rgba(0, 0, 0, 0.5);
    --fn-overlay-button-active-bg: rgba(255, 193, 7, 0.8);
  }
`;
