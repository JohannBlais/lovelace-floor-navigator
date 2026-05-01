// Mock HASS object + minimal <ha-icon> stub for the standalone dev sandbox.
//
// In Lovelace, the card receives a real `hass` object set by HA on every state
// tick, and `<ha-icon>` is registered globally by the HA frontend. Outside HA
// (i.e. when serving dev/index.html with `npx serve`), neither exists. This
// module provides:
//
//   - `mockHass`  : a minimal hass-like object exposing `states[entity_id]`
//                   for ~5 lights with varied states (on / off / unavailable).
//   - <ha-icon>   : a small custom element that renders the icon name as text
//                   inside a colored rectangle, so we can visually verify
//                   icon placement and color resolution in dev mode.
//
// JS rather than TS so it can be loaded straight from index.html without a
// build step. The card's `hass` property accepts any compatible object shape.

// ─── mock states ────────────────────────────────────────────────────────────

function makeState(entityId, state, attributes = {}) {
  return {
    entity_id: entityId,
    state,
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    attributes: { friendly_name: entityId, ...attributes },
    context: { id: 'mock', parent_id: null, user_id: null },
  };
}

export const mockStates = {
  // L0 — Rez-de-chaussée
  'light.salon': makeState('light.salon', 'on'),
  'light.cuisine': makeState('light.cuisine', 'on'),
  'light.entree': makeState('light.entree', 'off'),
  'light.terrasse': makeState('light.terrasse', 'off'),
  // L1 — Étage 1
  'light.chambre_alice': makeState('light.chambre_alice', 'unavailable'),
};

export const mockHass = {
  states: mockStates,
  callService: async (...args) => {
    console.log('[mock-hass] callService', ...args);
  },
};

// ─── <ha-icon> stub ─────────────────────────────────────────────────────────

if (!customElements.get('ha-icon')) {
  class HaIconStub extends HTMLElement {
    static get observedAttributes() {
      return ['icon'];
    }
    connectedCallback() {
      this._update();
    }
    attributeChangedCallback() {
      this._update();
    }
    _update() {
      const icon = this.getAttribute('icon') || '';
      const label = icon.replace(/^mdi:/, '');
      this.textContent = label;
      Object.assign(this.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: '10px',
        fontFamily: 'monospace',
        background: 'currentColor',
        color: 'inherit',
        borderRadius: '4px',
        padding: '2px',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      });
      // Fade the text against the colored chip background by mixing in white.
      // We use mix-blend-mode rather than inverting color so we don't fight
      // the user's --fn-color-… custom properties.
      this.style.mixBlendMode = 'difference';
    }
  }
  customElements.define('ha-icon', HaIconStub);
}
