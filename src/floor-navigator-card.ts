import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import './components/fn-navigation-controller.js';
import { cardVariables } from './styles/card-styles.js';
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
      return html`<div class="placeholder">Floor Navigator: no config loaded.</div>`;
    }
    const settings = this._config.settings ?? {};
    return html`
      <ha-card>
        <fn-navigation-controller
          .floors=${this._config.floors}
          .viewbox=${this._config.viewbox}
          .transition=${settings.transition ?? 'crossfade'}
          .transitionDuration=${settings.transition_duration ?? 400}
          .edgeBehavior=${settings.edge_behavior ?? 'bounce'}
          .navigationMode=${settings.navigation_mode ?? 'both'}
          .startFloor=${settings.start_floor}
          .showFloorIndicator=${settings.show_floor_indicator ?? true}
        ></fn-navigation-controller>
      </ha-card>
    `;
  }

  static override styles = [
    cardVariables,
    css`
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
      }
      .placeholder {
        padding: 12px;
        color: var(--secondary-text-color, #888);
        font-family: monospace;
        font-size: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'floor-navigator-card': FloorNavigatorCard;
  }
}
