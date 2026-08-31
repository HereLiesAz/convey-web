import { ConveyColor } from '../tokens/color.js'
import { ConveySize } from '../tokens/size.js'
import { ConveyWeightRegistry, nearestWeightRegistry, type ConveyWeight } from '../weight.js'

/**
 * Structural chrome for a screen's top edge — the web port of convey's `ConveyTopBar`: a
 * leading slot (typically back/menu), a weight-declared title, and a trailing action row.
 * Deliberately thin — this is layout and hierarchy, not a new interaction pattern; the
 * leading/action controls inside it should be ordinary content, not something this
 * component invents its own version of.
 *
 * ```html
 * <convey-top-bar>
 *   <button slot="leading">☰</button>
 *   <span slot="title">Inbox</span>
 *   <button slot="actions">🔍</button>
 * </convey-top-bar>
 * ```
 *
 * Attributes:
 * - `title-weight` — the title's position in the visual hierarchy. Defaults to `primary` — a
 *   screen's title is rarely its Hero. The title region registers itself into the nearest
 *   ancestor `ConveyWeightRegistry`, the same as `<convey-list-item>`/`<convey-card>`.
 * - `height` / `color` / `content-color` — CSS length/color overrides.
 *
 * Slots: `leading`, `title`, `actions` (any number of trailing action elements).
 */
export class ConveyTopBarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['title-weight', 'height', 'color', 'content-color']
  }

  #shadow: ShadowRoot
  #bar: HTMLElement
  #titleRegion: HTMLElement
  #registry: ConveyWeightRegistry | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .bar {
          display: flex;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          padding: 0 ${ConveySize.Small};
        }
        .title {
          flex: 1;
          padding: 0 ${ConveySize.Small};
          min-width: 0;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: ${ConveySize.XSmall};
        }
      </style>
      <div class="bar" part="bar">
        <slot name="leading"></slot>
        <div class="title" part="title"><slot name="title"></slot></div>
        <div class="actions" part="actions"><slot name="actions"></slot></div>
      </div>
    `
    this.#bar = this.#shadow.querySelector('.bar')!
    this.#titleRegion = this.#shadow.querySelector('.title')!
  }

  connectedCallback(): void {
    this.#applyStyle()
    this.#registry = nearestWeightRegistry(this)
    this.#registry?.register(this.#titleRegion, this.#titleWeight())
  }

  disconnectedCallback(): void {
    this.#registry?.unregister(this.#titleRegion)
    this.#registry = undefined
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'title-weight') this.#registry?.register(this.#titleRegion, this.#titleWeight())
    else this.#applyStyle()
  }

  #titleWeight(): ConveyWeight {
    return (this.getAttribute('title-weight') as ConveyWeight | null) ?? 'primary'
  }

  #applyStyle(): void {
    this.#bar.style.height = this.getAttribute('height') ?? ConveySize.Component.TopAppBar
    this.#bar.style.backgroundColor = this.getAttribute('color') ?? ConveyColor.Surface
    this.#bar.style.color = this.getAttribute('content-color') ?? ConveyColor.OnSurface
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-top-bar')) {
  customElements.define('convey-top-bar', ConveyTopBarElement)
}
