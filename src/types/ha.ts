// Re-export the Home Assistant types we consume so imports stay stable
// across the codebase even if we swap the underlying source later.
//
// custom-card-helpers re-exports `HomeAssistant` but NOT the `HassEntity` /
// `HassEntities` aliases (they're imported transitively from
// `home-assistant-js-websocket`). We derive them from `HomeAssistant['states']`
// instead of pulling in another dependency.
import type { HomeAssistant } from 'custom-card-helpers';

export type { HomeAssistant };

/** Map of `entity_id → state object`. */
export type HassEntities = HomeAssistant['states'];

/** Single entity state object as exposed via `hass.states[entity_id]`. */
export type HassEntity = HassEntities[string];
