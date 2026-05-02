// Mock HASS object + minimal <ha-icon> stub for the standalone dev sandbox.
//
// In Lovelace, the card receives a real `hass` object set by HA on every state
// tick, and `<ha-icon>` is registered globally by the HA frontend. Outside HA
// (i.e. when serving dev/index.html with `npx serve`), neither exists. This
// module provides:
//
//   - `mockHass`  : a minimal hass-like object exposing `states[entity_id]`
//                   for ~5 lights with varied states (on / off / unavailable),
//                   plus a `callService` that actually mutates state for
//                   turn_on / turn_off / toggle and notifies subscribers.
//   - <ha-icon>   : a small custom element that renders the icon name as text
//                   so we can visually verify icon placement and color
//                   resolution in dev mode.
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

function initialStates() {
  return {
    // L0 — Rez-de-chaussée
    'light.salon': makeState('light.salon', 'on'),
    'light.cuisine': makeState('light.cuisine', 'on'),
    'light.entree': makeState('light.entree', 'off'),
    'light.terrasse': makeState('light.terrasse', 'off'),
    // L1 — Étage 1
    'light.chambre_alice': makeState('light.chambre_alice', 'unavailable'),
  };
}

// Subscribers notified after state mutations. Used by index.html to push a
// fresh hass reference onto the card and trigger a Lit re-render.
const subscribers = new Set();

function notify() {
  for (const fn of subscribers) fn();
}

export const mockHass = {
  states: initialStates(),
  // handleActionConfig() reads `hass.user.id` when a confirmation dialog is
  // configured. Provide a stub user so confirmations don't crash.
  user: { id: 'dev-mock-user', name: 'Dev', is_admin: true },
  /**
   * Subscribe to state mutations. Returns an unsubscribe function.
   */
  subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  },
  /**
   * Mock implementation of the HA callService API. Only handles the
   * subset of services we route to from custom-card-helpers' tap actions :
   *   - turn_on / turn_off / toggle  → mutate light/switch/etc state
   * For unhandled domains+services, just logs (no-op).
   */
  async callService(domain, service, data /* , target */) {
    const entityId = data && data.entity_id;
    console.log('[mock-hass] callService', domain, service, data);
    if (!entityId || !mockHass.states[entityId]) return;

    let nextState;
    if (service === 'turn_on') nextState = 'on';
    else if (service === 'turn_off') nextState = 'off';
    else if (service === 'toggle') {
      const cur = mockHass.states[entityId].state;
      nextState = cur === 'on' ? 'off' : 'on';
    } else if (service === 'unlock') nextState = 'unlocked';
    else if (service === 'lock') nextState = 'locked';

    if (nextState === undefined) return;

    // CRITICAL : fn-element-icon's shouldUpdate uses identity comparison
    // on hass.states[entity]. Allocate a NEW state object (and a new
    // states map) so the identity check fires.
    const old = mockHass.states[entityId];
    mockHass.states = {
      ...mockHass.states,
      [entityId]: {
        ...old,
        state: nextState,
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    };
    notify();
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
