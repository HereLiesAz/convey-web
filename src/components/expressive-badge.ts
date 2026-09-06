import { ConveyExpressiveShape } from '../tokens/expressive-shape.js'
import { applyShape } from '../tokens/shape.js'
import { step, applyExpressiveType } from '../tokens/expressive-type.js'
import { containerFor, contentFor } from '../tokens/color.js'
import type { ConveyWeight } from '../weight.js'

/**
 * Web ports of `conveyance-expressive`'s own `Templates.kt` composable gamut, the same
 * re-parametrization convey's own `ConveyExpressiveBadge.kt` applies: `weight`/`ConveyColor`
 * instead of that library's `rank`/`ExpressiveRole` string vocabulary, plain HTML
 * attributes/properties instead of its `ComposableRequest` object.
 *
 * `<convey-expressive-badge>` — `ShapeBadge` (`expressive.badge.shape`): a static
 * `ConveyExpressiveShape`-clipped badge. Attributes: `label`, `shape` (a name
 * `ConveyExpressiveShape` resolves), `weight` (default `secondary`), `size` (CSS length,
 * default `64px`).
 */
export class ConveyExpressiveBadgeElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'shape', 'weight', 'size']
  }

  #shadow: ShadowRoot
  #box: HTMLElement
  #label: HTMLElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .box {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="box" part="box"><span class="label" part="label"></span></div>
    `
    this.#box = this.#shadow.querySelector('.box')!
    this.#label = this.#shadow.querySelector('.label')!
  }

  connectedCallback(): void {
    void this.#render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.#render()
  }

  async #render(): Promise<void> {
    await ConveyExpressiveShape.ensureLoaded()
    const weight = (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
    const size = this.getAttribute('size') ?? '64px'
    const shapeName = this.getAttribute('shape') ?? 'circle'

    this.#box.style.width = size
    this.#box.style.height = size
    this.#box.style.backgroundColor = containerFor(weight)
    applyShape(this.#box, ConveyExpressiveShape.shapeOfIn(this.#shadow, shapeName))

    this.#label.textContent = this.getAttribute('label') ?? ''
    this.#label.style.color = contentFor(weight)
    applyExpressiveType(this.#label, step('labelLarge'))
  }
}

// The accent's own top-left, chosen so its *center* lands on the primary shape's bottom-right
// corner: half of it sits under the primary (the "peeking from behind" read), half genuinely
// extends past the primary's own footprint -- ported unchanged from convey's own
// ConveyExpressiveCompoundBadge / conveyance-expressive's own CompoundBadge geometry.
const PRIMARY_SIZE_PX = 64
const ACCENT_SIZE_PX = 40
const ACCENT_OFFSET_PX = PRIMARY_SIZE_PX - ACCENT_SIZE_PX / 2
const COMPOUND_SIZE_PX = ACCENT_OFFSET_PX + ACCENT_SIZE_PX

/** The weight a compound badge's accent shape borrows its color from -- a true 3-cycle over
 *  hero/primary/secondary, so the accent's resolved container always differs from the
 *  primary's own. Ghost has no distinct container of its own to cycle into, so it shares
 *  hero's slot -- same rule as convey's own `accentWeightFor` in `ConveyExpressiveBadge.kt`. */
export function accentWeightFor(weight: ConveyWeight): ConveyWeight {
  switch (weight) {
    case 'hero':
      return 'primary'
    case 'primary':
      return 'secondary'
    case 'secondary':
    case 'ghost':
      return 'hero'
  }
}

/**
 * `<convey-expressive-compound-badge>` — `CompoundBadge` (`expressive.badge.compound`): a
 * smaller accent `ConveyExpressiveShape` polygon peeking from behind the primary shape, in a
 * different weight's container than the primary's own. The accent is always `burst` (or
 * `spark` when the primary shape *is* `burst`, so the two are never identical) -- a fixed
 * choice, matching the original. Attributes: `label`, `shape`, `weight` (default `secondary`).
 */
export class ConveyExpressiveCompoundBadgeElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'shape', 'weight']
  }

  #shadow: ShadowRoot
  #accent: HTMLElement
  #primary: HTMLElement
  #label: HTMLElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; position: relative; width: ${COMPOUND_SIZE_PX}px; height: ${COMPOUND_SIZE_PX}px; }
        .accent {
          position: absolute;
          top: ${ACCENT_OFFSET_PX}px;
          left: ${ACCENT_OFFSET_PX}px;
          width: ${ACCENT_SIZE_PX}px;
          height: ${ACCENT_SIZE_PX}px;
          box-sizing: border-box;
        }
        .primary {
          position: absolute;
          top: 0;
          left: 0;
          width: ${PRIMARY_SIZE_PX}px;
          height: ${PRIMARY_SIZE_PX}px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="accent" part="accent"></div>
      <div class="primary" part="primary"><span class="label" part="label"></span></div>
    `
    this.#accent = this.#shadow.querySelector('.accent')!
    this.#primary = this.#shadow.querySelector('.primary')!
    this.#label = this.#shadow.querySelector('.label')!
  }

  connectedCallback(): void {
    void this.#render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.#render()
  }

  async #render(): Promise<void> {
    await ConveyExpressiveShape.ensureLoaded()
    const weight = (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
    const shapeName = this.getAttribute('shape') ?? 'circle'
    const accentName = shapeName === 'burst' ? 'spark' : 'burst'
    const accentWeight = accentWeightFor(weight)

    applyShape(this.#primary, ConveyExpressiveShape.shapeOfIn(this.#shadow, shapeName))
    this.#primary.style.backgroundColor = containerFor(weight)
    applyShape(this.#accent, ConveyExpressiveShape.shapeOfIn(this.#shadow, accentName))
    this.#accent.style.backgroundColor = containerFor(accentWeight)

    this.#label.textContent = this.getAttribute('label') ?? ''
    this.#label.style.color = contentFor(weight)
    applyExpressiveType(this.#label, step('labelLarge'))
  }
}

/**
 * `<convey-expressive-tile>` — `TitleTile` (`expressive.tile.title`): a rectangular
 * `ConveyExpressiveShape`-clipped tile with a title and optional subtitle beneath it.
 * Attributes: `label`, `shape`, `subtitle` (optional), `weight` (default `secondary`).
 */
export class ConveyExpressiveTileElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'shape', 'subtitle', 'weight']
  }

  #shadow: ShadowRoot
  #box: HTMLElement
  #title: HTMLElement
  #subtitle: HTMLElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .box {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: 14px 20px;
        }
      </style>
      <div class="box" part="box">
        <span class="title" part="title"></span>
        <span class="subtitle" part="subtitle"></span>
      </div>
    `
    this.#box = this.#shadow.querySelector('.box')!
    this.#title = this.#shadow.querySelector('.title')!
    this.#subtitle = this.#shadow.querySelector('.subtitle')!
  }

  connectedCallback(): void {
    void this.#render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.#render()
  }

  async #render(): Promise<void> {
    await ConveyExpressiveShape.ensureLoaded()
    const weight = (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
    const shapeName = this.getAttribute('shape') ?? 'circle'
    const content = contentFor(weight)

    applyShape(this.#box, ConveyExpressiveShape.shapeOfIn(this.#shadow, shapeName))
    this.#box.style.backgroundColor = containerFor(weight)

    this.#title.textContent = this.getAttribute('label') ?? ''
    this.#title.style.color = content
    applyExpressiveType(this.#title, step('titleMedium'))

    const subtitle = this.getAttribute('subtitle')
    this.#subtitle.textContent = subtitle ?? ''
    this.#subtitle.style.display = subtitle ? '' : 'none'
    this.#subtitle.style.color = content
    applyExpressiveType(this.#subtitle, step('bodyMedium'))
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('convey-expressive-badge')) customElements.define('convey-expressive-badge', ConveyExpressiveBadgeElement)
  if (!customElements.get('convey-expressive-compound-badge')) {
    customElements.define('convey-expressive-compound-badge', ConveyExpressiveCompoundBadgeElement)
  }
  if (!customElements.get('convey-expressive-tile')) customElements.define('convey-expressive-tile', ConveyExpressiveTileElement)
}
