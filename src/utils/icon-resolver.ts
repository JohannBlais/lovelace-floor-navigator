/**
 * Default MDI icon for an entity, derived from its domain.
 * v0.1.0 keeps it simple — domain-only, no device_class lookup yet.
 */

const DOMAIN_ICONS: Record<string, string> = {
  light: 'mdi:lightbulb',
  switch: 'mdi:toggle-switch',
  sensor: 'mdi:gauge',
  binary_sensor: 'mdi:checkbox-marked-circle',
  climate: 'mdi:thermostat',
  cover: 'mdi:window-shutter',
  fan: 'mdi:fan',
  lock: 'mdi:lock',
  media_player: 'mdi:cast',
  person: 'mdi:account',
  device_tracker: 'mdi:account-circle',
  camera: 'mdi:camera',
  vacuum: 'mdi:robot-vacuum',
  scene: 'mdi:palette',
  script: 'mdi:script-text',
  automation: 'mdi:robot',
  input_boolean: 'mdi:toggle-switch',
  zone: 'mdi:map-marker',
  weather: 'mdi:weather-cloudy',
  sun: 'mdi:white-balance-sunny',
};

const FALLBACK_ICON = 'mdi:eye';

/**
 * Returns the MDI icon name for an entity_id based on its domain.
 * If the domain is unknown, returns a generic fallback.
 */
export function resolveIcon(entityId: string): string {
  const domain = entityId.split('.', 1)[0];
  return DOMAIN_ICONS[domain] ?? FALLBACK_ICON;
}
