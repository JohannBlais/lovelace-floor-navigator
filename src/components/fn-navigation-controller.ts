import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './fn-floor-indicator.js';
import './fn-floor-stack.js';
import type { BounceDirection } from './fn-floor-stack.js';
import type {
  EdgeBehavior,
  Floor,
  NavigationMode,
  Overlay,
  TransitionMode,
} from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

const NAV_THROTTLE_MS = 400;
const SWIPE_THRESHOLD_PX = 50;
const SWIPE_MIN_VELOCITY = 0.3; // px/ms
const BOUNCE_DURATION_MS = 150;

/**
 * Owns the navigation state (current floor index) and gesture handlers.
 *
 * SPEC §4.6 :
 * - Wheel : `deltaY > 0` → next floor, throttle 400ms.
 * - Touch swipe : 50px threshold, 0.3px/ms minimum velocity, scroll-aligned
 *   convention (finger moves up → next floor, like the wheel).
 * - Edge behavior : `bounce` (animation) | `none` (no-op) | `loop` (wrap).
 *
 * Listeners are attached on the host (not the rendered child) to ensure they
 * survive re-renders. Wheel uses a non-passive listener so we can
 * `preventDefault` to stop the page from scrolling underneath the card.
 */
@customElement('fn-navigation-controller')
export class FnNavigationController extends LitElement {
  @property({ attribute: false }) floors: Floor[] = [];
  @property({ type: String }) viewbox = '';
  @property({ type: String }) transition: TransitionMode = 'crossfade';
  @property({ type: Number, attribute: false }) transitionDuration = 400;
  @property({ type: String, attribute: false }) edgeBehavior: EdgeBehavior = 'bounce';
  @property({ type: String, attribute: false }) navigationMode: NavigationMode = 'both';
  @property({ type: String, attribute: false }) startFloor?: string;
  @property({ type: Boolean, attribute: false }) showFloorIndicator = true;
  @property({ attribute: false }) overlays: Overlay[] = [];
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _currentIndex = 0;
  @state() private _bounceDirection: BounceDirection = null;

  private _lastNavTime = 0;
  private _touchStartY = 0;
  private _touchStartTime = 0;
  private _bounceTimer?: number;
  private _startFloorResolved = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('wheel', this._onWheel as EventListener, { passive: false });
    this.addEventListener('touchstart', this._onTouchStart as EventListener, { passive: true });
    this.addEventListener('touchmove', this._onTouchMove as EventListener, { passive: false });
    this.addEventListener('touchend', this._onTouchEnd as EventListener, { passive: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('wheel', this._onWheel as EventListener);
    this.removeEventListener('touchstart', this._onTouchStart as EventListener);
    this.removeEventListener('touchmove', this._onTouchMove as EventListener);
    this.removeEventListener('touchend', this._onTouchEnd as EventListener);
    if (this._bounceTimer !== undefined) {
      window.clearTimeout(this._bounceTimer);
      this._bounceTimer = undefined;
    }
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // Resolve start_floor → index, once when floors arrive.
    if (!this._startFloorResolved && this.floors.length > 0) {
      if (this.startFloor) {
        const idx = this.floors.findIndex((f) => f.id === this.startFloor);
        this._currentIndex = idx >= 0 ? idx : 0;
      }
      this._startFloorResolved = true;
    }
    // Clamp if floors shrank.
    if (changed.has('floors') && this._currentIndex >= this.floors.length) {
      this._currentIndex = Math.max(0, this.floors.length - 1);
    }
  }

  private get _wheelEnabled(): boolean {
    return this.navigationMode === 'wheel' || this.navigationMode === 'both';
  }

  private get _swipeEnabled(): boolean {
    return this.navigationMode === 'swipe' || this.navigationMode === 'both';
  }

  private _onWheel = (e: WheelEvent): void => {
    if (!this._wheelEnabled) return;
    if (Math.abs(e.deltaY) < 1) return; // ignore micro-scrolls
    e.preventDefault();
    this._tryNavigate(e.deltaY > 0 ? 1 : -1);
  };

  private _onTouchStart = (e: TouchEvent): void => {
    if (!this._swipeEnabled || e.touches.length === 0) return;
    this._touchStartY = e.touches[0].clientY;
    this._touchStartTime = e.timeStamp;
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (!this._swipeEnabled) return;
    // Prevent the page from scrolling while the user swipes inside the card.
    e.preventDefault();
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    if (!this._swipeEnabled || e.changedTouches.length === 0) return;
    // Scroll-aligned: finger moves UP → next floor (matches wheel deltaY > 0).
    const dy = this._touchStartY - e.changedTouches[0].clientY;
    const dt = e.timeStamp - this._touchStartTime;
    if (Math.abs(dy) < SWIPE_THRESHOLD_PX) return;
    const velocity = Math.abs(dy) / Math.max(dt, 1);
    if (velocity < SWIPE_MIN_VELOCITY) return;
    this._tryNavigate(dy > 0 ? 1 : -1);
  };

  private _tryNavigate(direction: 1 | -1): void {
    const now = performance.now();
    if (now - this._lastNavTime < NAV_THROTTLE_MS) return;

    const next = this._currentIndex + direction;
    const atEdge = next < 0 || next >= this.floors.length;

    if (atEdge) {
      this._lastNavTime = now;
      switch (this.edgeBehavior) {
        case 'bounce':
          this._triggerBounce(direction === -1 ? 'top' : 'bottom');
          break;
        case 'loop':
          this._currentIndex = direction > 0 ? 0 : this.floors.length - 1;
          break;
        case 'none':
        default:
          // do nothing
          break;
      }
      return;
    }

    this._lastNavTime = now;
    this._currentIndex = next;
  }

  private _triggerBounce(direction: 'top' | 'bottom'): void {
    this._bounceDirection = direction;
    if (this._bounceTimer !== undefined) {
      window.clearTimeout(this._bounceTimer);
    }
    this._bounceTimer = window.setTimeout(() => {
      this._bounceDirection = null;
      this._bounceTimer = undefined;
    }, BOUNCE_DURATION_MS);
  }

  protected override render() {
    const currentFloor = this.floors[this._currentIndex];
    return html`
      <fn-floor-stack
        .floors=${this.floors}
        .viewbox=${this.viewbox}
        .currentIndex=${this._currentIndex}
        .transition=${this.transition}
        .transitionDuration=${this.transitionDuration}
        .bounceDirection=${this._bounceDirection}
        .overlays=${this.overlays}
        .hass=${this.hass}
      ></fn-floor-stack>
      ${this.showFloorIndicator && currentFloor
        ? html`<fn-floor-indicator .floor=${currentFloor}></fn-floor-indicator>`
        : nothing}
    `;
  }

  static override styles = css`
    :host {
      display: block;
      position: relative; /* Anchor for the absolutely-positioned indicator. */
      /* Capture all gestures: prevents page scroll/pinch hijacking our swipes. */
      touch-action: none;
      user-select: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-navigation-controller': FnNavigationController;
  }
}
