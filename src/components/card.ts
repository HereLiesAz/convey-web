import { ConveyColor } from '../tokens/color.js'
import { ConveyShape, applyShape } from '../tokens/shape.js'
import { ConveySize } from '../tokens/size.js'
import { ConveyWeightRegistry, nearestWeightRegistry, type ConveyWeight } from '../weight.js'

/**
 * A weight-aware container surface — the web port of convey's `ConveyCard`.
 *
 * Per the channel table (Part IV of the framework spec), elevation is not a taste choice
 * here — it carries a specific meaning: "things that float can be dismissed; things that
 * are flush cannot." `elevation` should say something true about this card, not just look
 * nice: a card the person can swipe away or that sits above a modal-free flow floats; a
 * card that's a fixed, permanent part of the layout (a settings section, a form group)
 * sits flush at `ConveySize.Elevation.None`.
 *
 * ```html
 * <convey-card elevation="3px" clickable>
 *   <convey-list-item>...</convey-list-item>
 * </convey-card>
 * ```
 *
 * Attributes:
 * - `weight` — this card's position in the visual hierarchy, same as `<convey-list-item>`.
 * - `elevation` — a CSS length for the shadow's blur radius. Use `ConveySize.Elevation`'s
 *   tokens, not an arbitrary value — see the doc above for what it actually communicates.
 * - `min-height` — defaults to `ConveySize.Component.CardMinHeight`.
 * - `clickable` — presence makes the card dispatch a `convey-click` event on click/Enter/Space.
 */
export class ConveyCardElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['weight', 'elevation', 'min-height', 'color']
  }

  #shadow: ShadowRoot
  #surface: HTMLElement
  #registry: ConveyWeightRegistry | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .surface {
          box-sizing: border-box;
          padding: ${ConveySize.Medium};
        }
        :host([clickable]) .surface { cursor: pointer; }
      </style>
      <div class="surface" part="surface" tabindex="-1">
        <slot></slot>
      </div>
    `
    this.#surface = this.#shadow.querySelector('.surface')!
    applyShape(this.#surface, ConveyShape.Medium)
    this.#surface.addEventListener('click', () => this.#handleActivate())
    this.#surface.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.#handleActivate()
      }
    })
  }

  connectedCallback(): void {
    this.#applyStyle()
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
    else this.#applyStyle()
  }

  #weight(): ConveyWeight {
    return (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
  }

  #applyStyle(): void {
    const elevation = this.getAttribute('elevation') ?? ConveySize.Elevation.XSmall
    const color = this.getAttribute('color') ?? ConveyColor.SurfaceContainer
    const minHeight = this.getAttribute('min-height') ?? ConveySize.Component.CardMinHeight
    this.#surface.style.backgroundColor = color
    this.#surface.style.minHeight = minHeight
    this.#surface.style.boxShadow = elevation === '0px' || elevation === '0' ? 'none' : `0 ${elevation} ${elevation} rgba(0, 0, 0, 0.3)`
  }

  #syncClickable(): void {
    if (!this.hasAttribute('clickable')) return
    this.#surface.setAttribute('role', 'button')
    this.#surface.setAttribute('tabindex', '0')
  }

  #handleActivate(): void {
    if (!this.hasAttribute('clickable')) return
    this.dispatchEvent(new CustomEvent('convey-click'))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-card')) {
  customElements.define('convey-card', ConveyCardElement)
}
