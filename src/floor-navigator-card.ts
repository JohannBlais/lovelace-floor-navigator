import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import type { CardConfig } from './types/config.js';

@customElement('floor-navigator-card')
export class FloorNavigatorCard extends LitElement {
  @state() private _config?: CardConfig;

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: a config object is required');
    }
    if (!config.viewbox || typeof config.viewbox !== 'string') {
      throw new Error('Invalid configuration: `viewbox` is required (e.g. "0 0 1920 1080")');
    }
    if (!Array.isArray(config.floors) || config.floors.length === 0) {
      throw new Error('Invalid configuration: at least one floor is required in `floors`');
    }
    for (const floor of config.floors) {
      if (!floor || typeof floor !== 'object' || !floor.id || !floor.name || !floor.background) {
        throw new Error(
          `Invalid floor: \`id\`, \`name\` and \`background\` are required (got ${JSON.stringify(floor)})`,
        );
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 8;
  }

  protected override render() {
    if (!this._config) {
      return html`<div>Floor Navigator: no config loaded.</div>`;
    }
    return html`<div class="debug"><pre>${JSON.stringify(this._config, null, 2)}</pre></div>`;
  }

  static override styles = css`
    :host {
      display: block;
      padding: 12px;
    }
    .debug {
      background: var(--card-background-color, #1a1a1a);
      color: var(--primary-text-color, #fff);
      border-radius: var(--ha-card-border-radius, 8px);
      padding: 8px;
      overflow-x: auto;
    }
    pre {
      margin: 0;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `;
}
