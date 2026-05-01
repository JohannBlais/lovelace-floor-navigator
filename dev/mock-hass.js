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
      const icon = (this.getAttribute('icon') || '').replace(/^mdi:/, '');
      // Just the first 4 letters of the icon name as a glyph proxy. The
      // pastille (parent of ha-icon in fn-element-icon) provides the colored
      // disc; this stub only stands in for the actual MDI glyph.
      this.textContent = icon.slice(0, 4);
      Object.assign(this.style, {
        display: 'block',
        fontSize: '10px',
        fontFamily: 'monospace',
        textAlign: 'center',
        lineHeight: '1',
        color: 'inherit', // inherits --fn-color-icon-foreground = white
      });
    }
  }
  customElements.define('ha-icon', HaIconStub);
}
