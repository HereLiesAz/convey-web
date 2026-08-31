import { ConveyColor } from '../tokens/color.js'
import { ConveySize } from '../tokens/size.js'
import { ConveyWeightRegistry, nearestWeightRegistry, type ConveyWeight } from '../weight.js'

/**
 * A single row: the most common visual object in any product — the web port of convey's
 * `ConveyListItem`. One element carrying a leading slot (icon/avatar), a title, an optional
 * subtitle, and a trailing slot (icon/action/value) — weight-aware, rather than a bare flex
 * row a product has to re-assemble by hand on every screen.
 *
 * ```html
 * <convey-list-item weight="secondary" clickable>
 *   <convey-avatar slot="leading" name="Acme Co"></convey-avatar>
 *   <span slot="title">Invoice #4021</span>
 *   <span slot="subtitle">Due in 3 days</span>
 *   <span slot="trailing">$412.00</span>
 * </convey-list-item>
 * ```
 *
 * Attributes:
 * - `weight` — this row's position in the visual hierarchy (`hero`/`primary`/`secondary`/
 *   `ghost`, default `secondary`). Registers itself into the nearest ancestor
 *   `ConveyWeightRegistry` on connect, the same enforcement `<convey-weight>` provides,
 *   because this component IS the weighted element rather than wrapping one.
 * - `clickable` — presence makes the row dispatch a `convey-click` event on click/Enter/Space.
 * - `min-height` — CSS length, defaults to `ConveySize.Component.ListItem`.
 *
 * Slots: `leading`, `title` (required), `subtitle`, `trailing`.
 */
export class ConveyListItemElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['weight', 'min-height']
  }

  #shadow: ShadowRoot
  #row: HTMLElement
  #registry: ConveyWeightRegistry | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .row {
          display: flex;
          align-items: center;
          gap: ${ConveySize.Medium};
          width: 100%;
          box-sizing: border-box;
          padding: ${ConveySize.Small} ${ConveySize.Medium};
        }
        :host([clickable]) .row { cursor: pointer; }
        .text { flex: 1; display: flex; flex-direction: column; gap: ${ConveySize.XSmall}; min-width: 0; }
        ::slotted([slot="title"]) { color: ${ConveyColor.OnSurface}; }
        ::slotted([slot="subtitle"]) { color: ${ConveyColor.OnSurfaceVariant}; }
      </style>
      <div class="row" part="row" tabindex="-1">
        <slot name="leading"></slot>
        <div class="text">
          <slot name="title"></slot>
          <slot name="subtitle"></slot>
        </div>
        <slot name="trailing"></slot>
      </div>
    `
    this.#row = this.#shadow.querySelector('.row')!
    this.#row.addEventListener('click', () => this.#handleActivate())
    this.#row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.#handleActivate()
      }
    })
  }

  connectedCallback(): void {
    this.#row.style.minHeight = this.getAttribute('min-height') ?? ConveySize.Component.ListItem
    this.#syncClickable()
    this.#registry = nearestWeightRegistry(this)
    this.#registry?.register(this, this.#weight())
  }

  disconnectedCallback(): void {
    this.#registry?.unregister(this)
    this.#registry = undefined
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'weight') this.#registry?.register(this, this.#weight())
    if (name === 'min-height') this.#row.style.minHeight = this.getAttribute('min-height') ?? ConveySize.Component.ListItem
  }

  #weight(): ConveyWeight {
    return (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
  }

  #syncClickable(): void {
    if (!this.hasAttribute('clickable')) return
    this.#row.setAttribute('role', 'button')
    this.#row.setAttribute('tabindex', '0')
  }

  #handleActivate(): void {
    if (!this.hasAttribute('clickable')) return
    this.dispatchEvent(new CustomEvent('convey-click'))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-list-item')) {
  customElements.define('convey-list-item', ConveyListItemElement)
}
