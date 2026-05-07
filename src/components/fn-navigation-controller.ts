import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './fn-floor-indicator.js';
import './fn-floor-stack.js';
import './fn-overlay-buttons.js';
import type { BounceDirection } from './fn-floor-stack.js';
import type { ThemeMode } from '../utils/theme-resolver.js';
import {
  IDENTITY,
  applyZoomAnchor,
  centroid,
  clampPan,
  clampScale,
  distance,
  screenToViewBox,
  screenToViewBoxUnits,
  transformsEqual,
  type Point,
  type Transform,
} from '../utils/transform.js';
import type {
  DarkModeSetting,
  EdgeBehavior,
  Floor,
  NavigationMode,
  Overlay,
  OverlayButtonsPosition,
  OverlaySizeUnit,
  TransitionMode,
} from '../types/config.js';
import type { HomeAssistant } from '../types/ha.js';

const NAV_THROTTLE_MS = 400;
const SWIPE_THRESHOLD_PX = 50;
const SWIPE_MIN_VELOCITY = 0.3; // px/ms
const BOUNCE_DURATION_MS = 150;

// v0.2.0 — gesture state machine constants
const TAP_MOVEMENT_THRESHOLD_PX = 10;
const DOUBLE_TAP_WINDOW_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 30;
const RESET_ANIM_MS = 200;

type GestureState = 'idle' | 'tap' | 'swipe' | 'pan' | 'pinch';

interface PointerInfo {
  id: number;
  startScreen: Point; // relative to gesture target's top-left
  startTime: number;
  currentScreen: Point;
  // Last position used to compute incremental deltas. Updated each
  // pointermove so single-finger pan and pinch can integrate moves.
  prevScreen: Point;
  // True when the original pointerdown target was inside an overlay
  // element (icon / text). Suppresses double-tap zoom on these targets,
  // per specs/features/pan-zoom-interactions.md ("and not on an
  // overlay element").
  startedOnElement: boolean;
  // The overlay element host (fn-element-icon / fn-element-text) the
  // pointerdown started on, if any. We hold a direct reference here so
  // we can dispatch a synthetic click on it from `_handleTapRelease`
  // — relying on the browser's compatibility click event doesn't
  // work reliably in Chromium WebView (HA companion app) when the
  // target sits inside <foreignObject> under a CSS-transformed parent
  // and pointer capture is set on the gesture-area.
  elementTarget: HTMLElement | null;
}

interface PinchInitial {
  /** Initial distance between the two pointers, in screen pixels. */
  d0: number;
  /** Initial centroid in viewBox coordinates (anchor for zoom-around-point). */
  c0Vb: Point;
  /** Initial centroid in viewBox-units offset (for the screen anchor). */
  c0ScreenVb: Point;
  /** Initial transform when pinch started. */
  t0: Transform;
}

/**
 * Owns navigation state (current floor index) AND the unified pan-zoom
 * transform engine.
 *
 * v0.2.0 — see specs/features/pan-zoom-interactions.md.
 *
 * Architecture (from the implementation plan):
 *
 * - Single `Transform` state (`{ scale, x, y }` in viewBox units) lives
 *   here as `@state _transform`. Floor-stack reads it to apply CSS
 *   `transform: translate(...) scale(...)`. Overlay elements consume
 *   `_transform.scale` (forwarded to fn-element-icon / fn-element-text)
 *   for size compensation in `px` mode (specs/features/overlay-readability.md).
 *
 * - Inputs unified across pinch / Ctrl+wheel / double-tap / slider →
 *   all converge to the same Transform via `applyZoomAnchor` + `clampPan`.
 *
 * - Floor navigation preserved: wheel without Ctrl, single-finger swipe
 *   when scale === 1. At scale > 1, single-finger drag becomes pan.
 *
 * - PointerEvents replace `touchstart/move/end` from v0.1.x. The state
 *   machine in `_gestureState` tracks the active interpretation:
 *
 *   IDLE → tap (1 pointer down) → swipe (1 pointer, scale=1, > threshold)
 *                              → pan   (1 pointer, scale>1, > threshold)
 *                              → pinch (2 pointers down)
 *
 *   Transitions from pinch back to pan when one pointer is lifted while
 *   scale > 1; or back to idle when scale === 1 / both lifted.
 *
 * - Reset to identity on floor change (animated 200ms via CSS transition
 *   on the floor-stack `.stack` element).
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
  /** Visible overlays only — passed down to `<fn-floor-stack>` for rendering. */
  @property({ attribute: false }) overlays: Overlay[] = [];
  /** All declared overlays (incl. hidden) — passed to `<fn-overlay-buttons>`. */
  @property({ attribute: false }) allOverlays: Overlay[] = [];
  /** Set of overlay ids currently visible — for the active button styling. */
  @property({ attribute: false }) visibleOverlayIds: Set<string> = new Set();
  @property({ type: String, attribute: false }) overlayButtonsPosition: OverlayButtonsPosition = 'bottom';
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ type: String, attribute: false }) currentTheme: ThemeMode = 'light';
  @property({ type: String, attribute: false }) darkModeSetting: DarkModeSetting = 'auto';
  /** v0.2.0 — sizing context (overlay-readability), passed through. */
  @property({ type: Number, attribute: false }) viewBoxWidth = 0;
  @property({ type: Number, attribute: false }) viewBoxHeight = 0;
  @property({ type: Number, attribute: false }) viewBoxToScreenRatio = 1;
  @property({ type: String, attribute: false }) sizeUnit: OverlaySizeUnit = 'viewbox';
  @property({ type: Number, attribute: false }) minIconPx = 24;
  @property({ type: Number, attribute: false }) minTextPx = 14;
  /** v0.2.0 — pan-zoom limits (specs/features/pan-zoom-interactions.md). */
  @property({ type: Number, attribute: false }) zoomMin = 1;
  @property({ type: Number, attribute: false }) zoomMax = 4;
  @property({ type: Number, attribute: false }) zoomStep = 0.1;
  @property({ type: Number, attribute: false }) zoomDoubleTapScale = 2;
  /**
   * v0.2.0 — Fullscreen flag forwarded from the card root. Toggles a
   * `fullscreen` class on the host (in `updated()`) so CSS can switch
   * the layout to a flex column (gesture-area flex:1, aspect-fit
   * floor stack). See specs/features/mobile-fullscreen-mode.md.
   */
  @property({ type: Boolean, attribute: false }) fullscreen = false;

  @state() private _currentIndex = 0;
  @state() private _bounceDirection: BounceDirection = null;
  /**
   * v0.2.0 — Single source of truth for the pan-zoom transform.
   * Default = identity = no visible change. Mutated by gesture handlers
   * and the slider. Floor-stack applies it via CSS transform.
   */
  @state() private _transform: Transform = IDENTITY;
  /**
   * True while a live gesture (pan / pinch) is updating `_transform`
   * every frame — disables the CSS transition on the floor stack to
   * avoid lag. Re-enabled on gesture end and on floor-change reset.
   */
  @state() private _gestureLive = false;

  private _lastNavTime = 0;
  private _bounceTimer?: number;
  private _resetAnimTimer?: number;
  private _startFloorResolved = false;
  private _lastFloorIndex = 0;

  // PointerEvents bookkeeping
  private _pointers = new Map<number, PointerInfo>();
  private _gestureState: GestureState = 'idle';
  private _pinchInitial?: PinchInitial;
  private _lastTapTime = 0;
  private _lastTapPos: Point = { x: 0, y: 0 };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('wheel', this._onWheel as EventListener, { passive: false });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('wheel', this._onWheel as EventListener);
    if (this._bounceTimer !== undefined) {
      window.clearTimeout(this._bounceTimer);
      this._bounceTimer = undefined;
    }
    if (this._resetAnimTimer !== undefined) {
      window.clearTimeout(this._resetAnimTimer);
      this._resetAnimTimer = undefined;
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
      this._lastFloorIndex = this._currentIndex;
    }
    // Clamp if floors shrank.
    if (changed.has('floors') && this._currentIndex >= this.floors.length) {
      this._currentIndex = Math.max(0, this.floors.length - 1);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    // v0.2.0 — Sync the `fullscreen` class on the host so CSS sees the
    // current state. `:host(.fullscreen)` selectors gate the fullscreen
    // layout (flex column, gesture-area flex:1, aspect-fit floor-stack).
    if (changed.has('fullscreen')) {
      this.classList.toggle('fullscreen', this.fullscreen);
    }
    // v0.2.0 — Reset transform to identity (animated) on floor change.
    // The CSS `transition: transform 200ms` on the floor-stack's `.stack`
    // handles the animation; we just write a new transform value.
    if (this._currentIndex !== this._lastFloorIndex) {
      this._lastFloorIndex = this._currentIndex;
      if (!transformsEqual(this._transform, IDENTITY)) {
        this._gestureLive = false; // ensure transition is ON
        this._transform = IDENTITY;
        if (this._resetAnimTimer !== undefined) {
          window.clearTimeout(this._resetAnimTimer);
        }
        this._resetAnimTimer = window.setTimeout(() => {
          this._resetAnimTimer = undefined;
        }, RESET_ANIM_MS);
      }
    }
  }

  private get _wheelEnabled(): boolean {
    return this.navigationMode === 'wheel' || this.navigationMode === 'both';
  }

  private get _swipeEnabled(): boolean {
    return this.navigationMode === 'swipe' || this.navigationMode === 'both';
  }

  /** Bounding-box of the gesture target (`.gesture-area`), used to
   * convert clientX/clientY into target-relative pixels. Falls back to
   * the host's bounding box if the inner div hasn't rendered yet. */
  private _gestureRect(): DOMRect {
    const inner = this.renderRoot?.querySelector?.('.gesture-area') as HTMLElement | null;
    return (inner ?? this).getBoundingClientRect();
  }

  // ────────────────────── wheel ──────────────────────

  private _onWheel = (e: WheelEvent): void => {
    if (Math.abs(e.deltaY) < 1) return;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+wheel / Cmd+wheel → zoom around cursor.
      e.preventDefault();
      this._handleCtrlWheel(e);
      return;
    }
    if (!this._wheelEnabled) return;
    e.preventDefault();
    this._tryNavigate(e.deltaY > 0 ? 1 : -1);
  };

  private _handleCtrlWheel(e: WheelEvent): void {
    const factor = e.deltaY < 0 ? 1 + this.zoomStep : 1 - this.zoomStep;
    const newScale = clampScale(this._transform.scale * factor, this.zoomMin, this.zoomMax);
    if (newScale === this._transform.scale) return;
    this._zoomAroundClient(newScale, e.clientX, e.clientY);
  }

  // ────────────────────── pointer events ──────────────────────

  private _onPointerDown = (e: PointerEvent): void => {
    // The slider and overlay buttons stopPropagation in their own
    // pointer handlers (slider) or sit outside the gesture-area
    // (overlay-buttons), so we never see those events here.
    const path = e.composedPath();
    const elementTarget =
      (path.find(
        (n): n is HTMLElement =>
          n instanceof HTMLElement &&
          (n.tagName === 'FN-ELEMENT-ICON' || n.tagName === 'FN-ELEMENT-TEXT'),
      ) as HTMLElement | undefined) ?? null;
    const startedOnElement = elementTarget !== null;

    const rect = this._gestureRect();
    const screen: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const info: PointerInfo = {
      id: e.pointerId,
      startScreen: screen,
      startTime: e.timeStamp,
      currentScreen: { ...screen },
      prevScreen: { ...screen },
      startedOnElement,
      elementTarget,
    };
    this._pointers.set(e.pointerId, info);

    // Attempt pointer capture for drift-out handling. Capture on the
    // gesture-area (the listener's currentTarget), NOT on `e.target` —
    // when the tap starts on an overlay element, `e.target` is a deep
    // node inside the icon's shadow DOM (under <foreignObject>), and
    // capturing there disrupts the synthesized `click` event so the
    // icon's tap_action never fires. Capturing on the gesture-area
    // routes pan/pinch events correctly while leaving click semantics
    // on the inner icon untouched.
    const captureTarget = e.currentTarget as Element | null;
    try {
      captureTarget?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    if (this._pointers.size === 1) {
      this._gestureState = 'tap';
    } else if (this._pointers.size === 2) {
      this._enterPinch();
    }
  };

  private _onPointerMove = (e: PointerEvent): void => {
    const info = this._pointers.get(e.pointerId);
    if (!info) return;
    const rect = this._gestureRect();
    info.prevScreen = { ...info.currentScreen };
    info.currentScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    switch (this._gestureState) {
      case 'tap':
        this._maybeEscalateFromTap(info);
        break;
      case 'swipe':
        // No live transform update: swipe is settled on pointerup.
        break;
      case 'pan':
        this._handlePanMove(info);
        break;
      case 'pinch':
        this._handlePinchMove();
        break;
      default:
        break;
    }
  };

  private _onPointerUp = (e: PointerEvent): void => {
    const info = this._pointers.get(e.pointerId);
    if (!info) return;
    this._pointers.delete(e.pointerId);

    const captureTarget = e.currentTarget as Element | null;
    try {
      captureTarget?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    // End-of-gesture dispatch by current state.
    if (this._gestureState === 'tap') {
      this._handleTapRelease(info, e.timeStamp);
    } else if (this._gestureState === 'swipe') {
      this._handleSwipeRelease(info, e.timeStamp);
    } else if (this._gestureState === 'pan') {
      // Pan continues with remaining pointer if any, else end.
      if (this._pointers.size === 0) this._endGesture();
    } else if (this._gestureState === 'pinch') {
      this._handlePinchRelease();
    }

    if (this._pointers.size === 0) {
      this._gestureState = 'idle';
      this._gestureLive = false;
    }
  };

  private _onPointerCancel = (e: PointerEvent): void => {
    this._pointers.delete(e.pointerId);
    if (this._pointers.size === 0) {
      this._endGesture();
    } else if (this._gestureState === 'pinch' && this._pointers.size === 1) {
      // Degrade pinch → pan / idle on cancel mid-gesture.
      this._degradePinchToSingle();
    }
  };

  // ────────────────────── tap / double-tap ──────────────────────

  private _maybeEscalateFromTap(info: PointerInfo): void {
    const dx = info.currentScreen.x - info.startScreen.x;
    const dy = info.currentScreen.y - info.startScreen.y;
    if (Math.hypot(dx, dy) < TAP_MOVEMENT_THRESHOLD_PX) return;
    // Movement crossed the tap threshold → escalate.
    if (this._transform.scale > 1) {
      this._gestureState = 'pan';
      this._gestureLive = true;
    } else {
      this._gestureState = 'swipe';
    }
  }

  private _handleTapRelease(info: PointerInfo, timeStamp: number): void {
    const dt = timeStamp - info.startTime;
    if (dt > 600) {
      // Long press without movement → ignore, reset double-tap timer.
      this._lastTapTime = 0;
      return;
    }
    // Per spec: double-tap zoom triggers only when both taps are NOT
    // on an overlay element. If the tap started on an icon/text,
    // dispatch a click manually on the element host so its tap_action
    // handler runs (entity toggle / more-info / call-service / …), and
    // reset the double-tap chain so the next tap on empty space starts
    // a fresh count. We dispatch ourselves rather than relying on the
    // browser's synthesized click event because pointer capture on the
    // gesture-area + foreignObject inside a CSS-transformed parent
    // suppresses that synthesized click in Chromium WebView (HA
    // companion app), so the tap_action never fires.
    if (info.startedOnElement) {
      info.elementTarget?.click();
      this._lastTapTime = 0;
      return;
    }
    const now = timeStamp;
    const dx = info.currentScreen.x - this._lastTapPos.x;
    const dy = info.currentScreen.y - this._lastTapPos.y;
    if (
      now - this._lastTapTime < DOUBLE_TAP_WINDOW_MS &&
      Math.hypot(dx, dy) < DOUBLE_TAP_DISTANCE_PX
    ) {
      // Second tap of a double-tap → toggle zoom.
      this._handleDoubleTap(info.currentScreen);
      this._lastTapTime = 0;
    } else {
      this._lastTapTime = now;
      this._lastTapPos = { ...info.currentScreen };
    }
  }

  private _handleDoubleTap(screenPx: Point): void {
    if (this._transform.scale > 1) {
      // Reset to identity (animated).
      this._gestureLive = false;
      this._transform = IDENTITY;
      return;
    }
    // Zoom in to zoom_double_tap_scale around the tap point.
    const target = clampScale(this.zoomDoubleTapScale, this.zoomMin, this.zoomMax);
    if (target === this._transform.scale) return;
    this._gestureLive = false;
    this._zoomAroundLocal(target, screenPx);
  }

  // ────────────────────── swipe ──────────────────────

  private _handleSwipeRelease(info: PointerInfo, timeStamp: number): void {
    if (!this._swipeEnabled) return;
    const dy = info.startScreen.y - info.currentScreen.y;
    const dt = timeStamp - info.startTime;
    if (Math.abs(dy) < SWIPE_THRESHOLD_PX) return;
    const velocity = Math.abs(dy) / Math.max(dt, 1);
    if (velocity < SWIPE_MIN_VELOCITY) return;
    this._tryNavigate(dy > 0 ? 1 : -1);
  }

  // ────────────────────── pan ──────────────────────

  private _handlePanMove(info: PointerInfo): void {
    const dxScreen = info.currentScreen.x - info.prevScreen.x;
    const dyScreen = info.currentScreen.y - info.prevScreen.y;
    // Convert screen delta to viewBox-units delta (no transform inverse —
    // we translate the transform itself, which is in viewBox units).
    const ratio = this.viewBoxToScreenRatio || 1;
    const dxVb = dxScreen * ratio;
    const dyVb = dyScreen * ratio;
    this._gestureLive = true;
    this._setTransform({
      scale: this._transform.scale,
      x: this._transform.x + dxVb,
      y: this._transform.y + dyVb,
    });
  }

  // ────────────────────── pinch ──────────────────────

  private _enterPinch(): void {
    const pts = Array.from(this._pointers.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const d0 = distance(a.currentScreen, b.currentScreen);
    if (d0 <= 0) return;
    const c0 = centroid(a.currentScreen, b.currentScreen);
    const cardSize = this._gestureRect();
    const vb = { width: this.viewBoxWidth, height: this.viewBoxHeight };
    const c0Vb = screenToViewBox(c0, cardSize, vb, this._transform);
    const c0ScreenVb = screenToViewBoxUnits(c0, cardSize, vb);
    this._pinchInitial = { d0, c0Vb, c0ScreenVb, t0: { ...this._transform } };
    this._gestureState = 'pinch';
    this._gestureLive = true;
  }

  private _handlePinchMove(): void {
    if (!this._pinchInitial) return;
    const pts = Array.from(this._pointers.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const d = distance(a.currentScreen, b.currentScreen);
    if (d <= 0) return;
    const c = centroid(a.currentScreen, b.currentScreen);
    const { d0, c0Vb, c0ScreenVb, t0 } = this._pinchInitial;
    const rawScale = t0.scale * (d / d0);
    const newScale = clampScale(rawScale, this.zoomMin, this.zoomMax);
    // Anchor: the viewBox point initially under the centroid stays under
    // the current centroid. Convert current screen centroid to viewBox-
    // units offset.
    const cardSize = this._gestureRect();
    const vb = { width: this.viewBoxWidth, height: this.viewBoxHeight };
    const cScreenVb = screenToViewBoxUnits(c, cardSize, vb);
    // Centroid drift = c - c0 in viewBox-units.
    const drift: Point = {
      x: cScreenVb.x - c0ScreenVb.x,
      y: cScreenVb.y - c0ScreenVb.y,
    };
    // t0 is unused by applyZoomAnchor — the anchor is given in viewBox
    // units directly (c0Vb), which already encodes the original transform.
    void t0;
    const anchored = applyZoomAnchor(newScale, c0Vb, c0ScreenVb);
    this._setTransform({
      scale: newScale,
      x: anchored.x + drift.x,
      y: anchored.y + drift.y,
    });
  }

  private _handlePinchRelease(): void {
    // Either degrade to single-finger pan or end the gesture.
    if (this._pointers.size === 1) {
      this._degradePinchToSingle();
    } else {
      this._endGesture();
    }
  }

  private _degradePinchToSingle(): void {
    this._pinchInitial = undefined;
    if (this._transform.scale > 1) {
      // Continue with the remaining pointer as a pan.
      this._gestureState = 'pan';
      // Resync prev = current to avoid a jump on the next move.
      const remaining = Array.from(this._pointers.values())[0];
      if (remaining) remaining.prevScreen = { ...remaining.currentScreen };
      this._gestureLive = true;
    } else {
      // No zoom left → idle until the user lifts the last finger.
      this._gestureState = 'tap'; // accept a tap or escalate to swipe
      const remaining = Array.from(this._pointers.values())[0];
      if (remaining) {
        remaining.startScreen = { ...remaining.currentScreen };
        remaining.startTime = performance.now();
      }
    }
  }

  private _endGesture(): void {
    this._gestureState = 'idle';
    this._gestureLive = false;
    this._pinchInitial = undefined;
  }

  // ────────────────────── transform helpers ──────────────────────

  /** Set transform after pan-clamping. Uses identity-equality short-
   * circuit to skip useless re-renders. */
  private _setTransform(next: Transform): void {
    const clamped = clampPan(next, this.viewBoxWidth, this.viewBoxHeight);
    if (transformsEqual(clamped, this._transform)) return;
    this._transform = clamped;
  }

  /**
   * Zoom to `newScale` around a point given in client (viewport) px.
   * Used by Ctrl+wheel.
   */
  private _zoomAroundClient(newScale: number, clientX: number, clientY: number): void {
    const rect = this._gestureRect();
    this._zoomAroundLocal(newScale, {
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  /**
   * Zoom to `newScale` around a point given in gesture-target-local px
   * (i.e. offset from the gesture-area's top-left). Generic helper used
   * by Ctrl+wheel, slider, and double-tap.
   */
  private _zoomAroundLocal(newScale: number, anchorPx: Point): void {
    const rect = this._gestureRect();
    const vb = { width: this.viewBoxWidth, height: this.viewBoxHeight };
    if (rect.width <= 0 || rect.height <= 0 || vb.width <= 0 || vb.height <= 0) {
      return;
    }
    const anchorVb = screenToViewBox(anchorPx, rect, vb, this._transform);
    const anchorScreenVb = screenToViewBoxUnits(anchorPx, rect, vb);
    const next = applyZoomAnchor(newScale, anchorVb, anchorScreenVb);
    this._setTransform(next);
  }

  // ────────────────────── floor navigation (preserved) ──────────────────────

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

  // ────────────────────── render ──────────────────────

  protected override render() {
    const currentFloor = this.floors[this._currentIndex];
    const showButtons =
      (this.overlayButtonsPosition === 'top' || this.overlayButtonsPosition === 'bottom') &&
      this.allOverlays.length > 0;
    const buttons = showButtons
      ? html`
          <fn-overlay-buttons
            .overlays=${this.allOverlays}
            .visibleOverlayIds=${this.visibleOverlayIds}
            .fullscreen=${this.fullscreen}
          ></fn-overlay-buttons>
        `
      : nothing;

    return html`
      ${this.overlayButtonsPosition === 'top' ? buttons : nothing}
      <div
        class="gesture-area"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
        @pointerleave=${this._onPointerCancel}
      >
        <fn-floor-stack
          .floors=${this.floors}
          .viewbox=${this.viewbox}
          .currentIndex=${this._currentIndex}
          .transition=${this.transition}
          .transitionDuration=${this.transitionDuration}
          .bounceDirection=${this._bounceDirection}
          .overlays=${this.overlays}
          .hass=${this.hass}
          .currentTheme=${this.currentTheme}
          .darkModeSetting=${this.darkModeSetting}
          .viewBoxWidth=${this.viewBoxWidth}
          .viewBoxToScreenRatio=${this.viewBoxToScreenRatio}
          .zoomScale=${this._transform.scale}
          .sizeUnit=${this.sizeUnit}
          .minIconPx=${this.minIconPx}
          .minTextPx=${this.minTextPx}
          .transform=${this._transform}
          .gestureLive=${this._gestureLive}
          .fullscreen=${this.fullscreen}
        ></fn-floor-stack>
        ${this.showFloorIndicator && currentFloor
          ? html`<fn-floor-indicator .floor=${currentFloor}></fn-floor-indicator>`
          : nothing}
      </div>
      ${this.overlayButtonsPosition === 'bottom' ? buttons : nothing}
    `;
  }

  static override styles = css`
    :host {
      display: block;
      /* Capture all gestures: prevents page scroll/pinch hijacking our
         own PointerEvent handling. Buttons inside still receive clicks. */
      touch-action: none;
      user-select: none;
    }
    .gesture-area {
      /* Anchor for the absolutely-positioned <fn-floor-indicator>
         overlay so it stays inside the floor area and never overlaps
         the buttons bar. */
      position: relative;
    }

    /* ────────── v0.2.0 — fullscreen layout ──────────
       Card root applies position:fixed/inset:0; here we reflow to a
       flex column so buttons stay at the viewport edges and the
       gesture-area takes the remaining height. The floor-stack inside
       switches to aspect-fit (see fn-floor-stack :host(.fullscreen)). */
    :host(.fullscreen) {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      min-height: 0;
    }
    :host(.fullscreen) .gesture-area {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      /* The slider and the indicator are absolutely positioned against
         this box; flex layout doesn't break absolute positioning. */
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-navigation-controller': FnNavigationController;
  }
}
