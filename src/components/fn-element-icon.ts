import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { handleAction, hasAction, type ActionConfig } from 'custom-card-helpers';

import { resolveColorVar } from '../utils/color-resolver.js';
import { resolveIcon } from '../utils/icon-resolver.js';
import type { IconElement, TapAction } from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

/**
 * Renders a single icon element. Used inside an SVG `<foreignObject>` placed
 * by `fn-overlay-layer`, so HTML rendering is reliable while position lives
 * in viewBox coordinates.
 *
 * Visual = circular pastille (state color) + white halo + centered glyph.
 *
 * Reactive granularity (SPEC §4.4 approche B) : `shouldUpdate` short-circuits
 * re-renders to entities whose state actually changed.
 *
 * Tap actions (SPEC §3.3.8) : delegated to `handleAction` from
 * custom-card-helpers, which covers toggle / more-info / navigate /
 * call-service / url / none. The lib defaults to "more-info" when no
 * tap_action is configured. We normalize the YAML short form
 * (`tap_action: toggle`) into the object form (`{ action: 'toggle' }`) the
 * lib expects.
 */
@customElement('fn-element-icon')
export class FnElementIcon extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) element!: IconElement;
  /**
   * Icon name configured at the parent overlay level. Used as fallback
   * when the element doesn't override it explicitly. Resolution chain :
   *   element.icon → overlayIcon → resolveIcon(entity domain)
   * This way an overlay like "Prises" with `icon: mdi:power-socket` can
   * propagate that icon to all its switch elements without needing to
   * repeat it on every element.
   */
  @property({ attribute: false }) overlayIcon?: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (changed.has('element')) return true;
    if (changed.has('hass')) {
      const oldHass = changed.get('hass') as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states?.[this.element.entity];
      const newStateObj = this.hass?.states?.[this.element.entity];
      // Same reference = nothing changed for this entity. HA reuses state
      // objects when nothing changed, so identity check is reliable.
      return oldStateObj !== newStateObj;
    }
    return false;
  }

  /**
   * Coerces the SPEC §3.3.8 short form (`tap_action: 'toggle'`) into the
   * object form (`{ action: 'toggle' }`) expected by `handleAction`.
   * Returns `undefined` when no tap_action was set — `handleAction` will
   * fall back to its built-in `{ action: 'more-info' }` default in that case.
   */
  private _normalizedTapAction(): ActionConfig | undefined {
    const ta: TapAction | undefined = this.element.tap_action;
    if (ta === undefined) return undefined;
    if (typeof ta === 'string') return { action: ta } as ActionConfig;
    return ta as unknown as ActionConfig;
  }

  /** True when the element should respond to taps (i.e. action ≠ 'none'). */
  private _isInteractive(): boolean {
    // Default (no tap_action) is more-info → interactive.
    if (this.element.tap_action === undefined) return true;
    return hasAction(this._normalizedTapAction());
  }

  private _onClick = (e: Event): void => {
    if (!this.hass) return;
    if (!this._isInteractive()) return;
    // Stop propagation defensively. fn-navigation-controller doesn't listen
    // for click today, but a hold/dbl-click implementation tomorrow might
    // — keep tap events scoped to the element they hit.
    e.stopPropagation();
    handleAction(
      this,
      this.hass,
      { entity: this.element.entity, tap_action: this._normalizedTapAction() },
      'tap',
    );
  };

  protected override render() {
    const stateObj = this.hass?.states?.[this.element.entity];
    const state = stateObj?.state;
    const icon =
      this.element.icon ?? this.overlayIcon ?? resolveIcon(this.element.entity);
    const color = resolveColorVar(this.element.entity, state);
    // Inside foreignObject CSS lengths are interpreted in user (viewBox)
    // units, so a 48-unit element gets a ~31-unit glyph. Proportional to
    // the user-configured `size`.
    const size = this.element.size ?? 48;
    const iconSizePx = size * 0.65;
    const interactive = this._isInteractive();

    return html`
      <div
        class=${classMap({ pastille: true, interactive })}
        data-entity=${this.element.entity}
        data-state=${state ?? 'unavailable'}
        style="background: ${color};"
      >
        <ha-icon
          icon=${icon}
          style="--mdc-icon-size: ${iconSizePx}px;"
        ></ha-icon>
      </div>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      /* Halo + drop-shadow extend outside the pastille; allow them through. */
      overflow: visible;
      /* Reset text-flow inherited from the surrounding <foreignObject> body
         so it can't push the absolutely-positioned glyph by a baseline. */
      line-height: 0;
      font-size: 0;
    }
    .pastille {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow:
        0 0 0 2px var(--fn-pastille-halo, rgba(255, 255, 255, 0.85)),
        0 2px 6px rgba(0, 0, 0, 0.45);
      transition:
        background 200ms ease,
        transform 100ms ease;
    }
    .pastille.interactive {
      cursor: pointer;
    }
    /* Tactile-feel feedback when pressed. Independent of the floor-level
       bounce animation since it targets a deeper element. */
    .pastille.interactive:active {
      transform: scale(0.92);
    }
    /* Bulletproof centering : we don't rely on flexbox / text baseline
       alignment because <ha-icon>'s default :host display can carry a
       sub-pixel vertical-align offset. Absolute + translate(-50%, -50%)
       depends only on the element's own width / height, which we pin
       explicitly to --mdc-icon-size. */
    ha-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--mdc-icon-size, 24px);
      height: var(--mdc-icon-size, 24px);
      transform: translate(-50%, -50%);
      color: var(--fn-color-icon-foreground, #fff);
      display: block;
      margin: 0;
      padding: 0;
      line-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-element-icon': FnElementIcon;
  }
}
