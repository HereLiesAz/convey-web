import { safeAnimate, toCss } from '../tokens/motion.js'
import { ConveyColor } from '../tokens/color.js'
import { ConveyShape } from '../tokens/shape.js'
import { ConveySize } from '../tokens/size.js'
import { grammarOf } from '../system.js'

/**
 * Selection among a small, fixed set of options via one persistent, sliding indicator,
 * instead of separately highlighting/unhighlighting each option in place — the web port of
 * convey's `ConveySegmentedControl`. The indicator IS the selection, the same "one element
 * across states" principle used throughout convey, applied to "which of these" rather than
 * "what state is this."
 *
 * Segments are equal-width; for options whose natural widths differ a lot, consider
 * `<convey-chip selected>`s instead — this component's sliding indicator assumes uniform
 * segments (it positions itself with pure `%`-based CSS, not per-item measurement).
 *
 * ```html
 * <convey-segmented-control selected="week">
 *   <button value="day">Day</button>
 *   <button value="week">Week</button>
 *   <button value="month">Month</button>
 * </convey-segmented-control>
 * ```
 *
 * Each direct child is a segment: its `value` attribute (falling back to its index as a
 * string) is what `selected` compares against and what a `convey-select` event's
 * `detail.value` carries. Does not self-mutate `selected` — the caller owns the source of
 * truth, listening for `convey-select` the same way `<convey-switch>`'s `convey-change` works.
 */
export class ConveySegmentedControlElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['selected']
  }

  #shadow: ShadowRoot
  #track: HTMLElement
  #indicator: HTMLElement
  #slot: HTMLSlotElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .track {
          position: relative;
          display: flex;
          background: ${ConveyColor.SurfaceContainerHigh};
          border-radius: ${ConveyShape.Circle.borderRadius};
          padding: ${ConveySize.XSmall};
          box-sizing: border-box;
        }
        .indicator {
          position: absolute;
          top: ${ConveySize.XSmall};
          bottom: ${ConveySize.XSmall};
          left: ${ConveySize.XSmall};
          background: ${ConveyColor.Primary};
          border-radius: ${ConveyShape.Circle.borderRadius};
          z-index: 0;
        }
        ::slotted(*) {
          flex: 1;
          position: relative;
          z-index: 1;
          text-align: center;
          background: transparent;
          border: none;
          font: inherit;
          cursor: pointer;
          padding: ${ConveySize.Small} 0;
        }
      </style>
      <div class="track" part="track">
        <div class="indicator" part="indicator"></div>
        <slot></slot>
      </div>
    `
    this.#track = this.#shadow.querySelector('.track')!
    this.#indicator = this.#shadow.querySelector('.indicator')!
    this.#slot = this.#shadow.querySelector('slot')!
    this.#slot.addEventListener('slotchange', () => this.#syncSegments())
    this.#track.addEventListener('click', (e) => this.#handleClick(e))
  }

  connectedCallback(): void {
    this.#syncSegments()
    this.#positionIndicator(false)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'selected') this.#positionIndicator(true)
  }

  #segments(): Element[] {
    return this.#slot.assignedElements({ flatten: true })
  }

  #valueOf(el: Element, index: number): string {
    return el.getAttribute('value') ?? String(index)
  }

  #selectedIndex(): number {
    const selected = this.getAttribute('selected')
    const segments = this.#segments()
    if (selected === null) return 0
    const idx = segments.findIndex((el, i) => this.#valueOf(el, i) === selected)
    return idx < 0 ? 0 : idx
  }

  #syncSegments(): void {
    const segments = this.#segments()
    this.#track.style.setProperty('--convey-segment-count', String(Math.max(segments.length, 1)))
    this.#indicator.style.width = `calc((100% - ${ConveySize.XSmall} * 2) / ${Math.max(segments.length, 1)})`
    this.#positionIndicator(false)
  }

  #positionIndicator(animate: boolean): void {
    const segments = this.#segments()
    if (segments.length === 0) return
    const index = this.#selectedIndex()
    const target = `translateX(${index * 100}%)`

    if (animate) {
      const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
      const from = this.#indicator.style.transform || 'translateX(0%)'
      safeAnimate(this.#indicator, [{ transform: from }, { transform: target }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
    } else {
      this.#indicator.style.transform = target
    }
  }

  #handleClick(e: MouseEvent): void {
    // composedPath(), not e.target: a listener inside the same shadow tree as the <slot>
    // sees the true originating element for slotted (light DOM) content, but relying on
    // that retargeting subtlety is fragile — composedPath() is the unambiguous way to find
    // which segment the click actually occurred within, click-target-retargeting aside.
    const segments = this.#segments()
    const path = e.composedPath()
    const index = segments.findIndex((el) => path.includes(el))
    if (index < 0) return
    const value = this.#valueOf(segments[index]!, index)
    this.dispatchEvent(new CustomEvent('convey-select', { detail: { value } }))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-segmented-control')) {
  customElements.define('convey-segmented-control', ConveySegmentedControlElement)
}
