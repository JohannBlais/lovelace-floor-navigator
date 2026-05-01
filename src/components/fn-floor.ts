import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Renders a single floor: an SVG with the configured viewBox and a background
 * image covering it. Overlays will be added in step 5.
 *
 * The SVG uses `preserveAspectRatio="xMidYMid meet"` so the floor keeps its
 * aspect ratio (derived from the viewBox) and is centered if the host element
 * is sized differently.
 *
 * GOTCHA — DO NOT split the SVG body into nested html`` templates. lit-html
 * parses each template as HTML in isolation; nested templates inside <svg>
 * are parsed without an SVG ancestor and the HTML parser auto-corrects
 * <image> into <img> (which has no `href` attribute → image never loads).
 * Keep the whole <svg>...</svg> in a single html`` template, or use the
 * `svg` tagged template if you genuinely need to split. setConfig guarantees
 * `background` is non-empty so we can render <image> unconditionally.
 */
@customElement('fn-floor')
export class FnFloor extends LitElement {
  /** SVG viewBox string, e.g. "0 0 1920 1080". */
  @property({ type: String }) viewbox = '';

  /** Path/URL of the background image (PNG, JPG, SVG). */
  @property({ type: String }) background = '';

  /** Parses the viewBox string into [minX, minY, width, height]. */
  private get viewBoxRect(): { width: number; height: number } | null {
    const parts = this.viewbox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return null;
    }
    return { width: parts[2], height: parts[3] };
  }

  protected override render() {
    const rect = this.viewBoxRect;
    if (!rect) {
      return html`<div class="error">Invalid viewBox: "${this.viewbox}"</div>`;
    }
    return html`
      <svg
        viewBox=${this.viewbox}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <image
          href=${this.background}
          x="0"
          y="0"
          width=${rect.width}
          height=${rect.height}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      max-width: 100%;
    }
    .error {
      padding: 12px;
      color: var(--error-color, #c33);
      font-family: monospace;
      font-size: 12px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'fn-floor': FnFloor;
  }
}
