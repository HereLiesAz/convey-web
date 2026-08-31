import { safeAnimate, toCss } from '../tokens/motion.js'
import { ConveyColor } from '../tokens/color.js'
import { ConveyShape } from '../tokens/shape.js'
import { ConveySize } from '../tokens/size.js'
import { grammarOf } from '../system.js'

/**
 * Bottom (or rail) navigation among a small, fixed set of destinations — the web port of
 * convey's `ConveyNavigationBar`, with the same sliding-indicator principle as
 * `<convey-segmented-control>`: which destination is current is shown by one persistent
 * pill moving to sit behind the selected icon, not by separately recoloring each
 * destination in place.
 *
 * ```html
 * <convey-navigation-bar selected="home">
 *   <button value="home">🏠<br>Home</button>
 *   <button value="search">🔍<br>Search</button>
 *   <button value="profile">👤<br>Profile</button>
 * </convey-navigation-bar>
 * ```
 *
 * Each direct child is a destination: its `value` attribute (falling back to its index as a
 * string) is what `selected` compares against and what a `convey-select` event's
 * `detail.value` carries — same contract as `<convey-segmented-control>`. Does not
 * self-mutate `selected`; the caller owns the source of truth.
 */
export class ConveyNavigationBarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['selected', 'height', 'color']
  }

  #shadow: ShadowRoot
  #bar: HTMLElement
  #indicatorTrack: HTMLElement
  #pill: HTMLElement
  #slot: HTMLSlotElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .bar {
          position: relative;
          display: flex;
          width: 100%;
          box-sizing: border-box;
        }
        .indicator-track {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: ${ConveySize.Small};
          box-sizing: border-box;
          z-index: 0;
        }
        .pill {
          width: 60%;
          height: 32px;
          border-radius: ${ConveyShape.Circle.borderRadius};
          background: ${ConveyColor.SecondaryContainer};
        }
        ::slotted(*) {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          font: inherit;
          cursor: pointer;
        }
      </style>
      <div class="bar" part="bar">
        <div class="indicator-track" part="indicator-track"><div class="pill" part="pill"></div></div>
        <slot></slot>
      </div>
    `
    this.#bar = this.#shadow.querySelector('.bar')!
    this.#indicatorTrack = this.#shadow.querySelector('.indicator-track')!
    this.#pill = this.#shadow.querySelector('.pill')!
    this.#slot = this.#shadow.querySelector('slot')!
    this.#slot.addEventListener('slotchange', () => this.#syncDestinations())
    this.#bar.addEventListener('click', (e) => this.#handleClick(e))
  }

  connectedCallback(): void {
    this.#applyStyle()
    this.#syncDestinations()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'selected') this.#positionIndicator(true)
    else this.#applyStyle()
  }

  #applyStyle(): void {
    this.#bar.style.height = this.getAttribute('height') ?? ConveySize.Component.NavigationBar
    this.#bar.style.backgroundColor = this.getAttribute('color') ?? ConveyColor.SurfaceContainer
  }

  #destinations(): Element[] {
    return this.#slot.assignedElements({ flatten: true })
  }

  #valueOf(el: Element, index: number): string {
    return el.getAttribute('value') ?? String(index)
  }

  #selectedIndex(): number {
    const selected = this.getAttribute('selected')
    const destinations = this.#destinations()
    if (selected === null) return 0
    const idx = destinations.findIndex((el, i) => this.#valueOf(el, i) === selected)
    return idx < 0 ? 0 : idx
  }

  #syncDestinations(): void {
    const count = Math.max(this.#destinations().length, 1)
    this.#indicatorTrack.style.width = `calc(100% / ${count})`
    this.#positionIndicator(false)
  }

  #positionIndicator(animate: boolean): void {
    if (this.#destinations().length === 0) return
    const index = this.#selectedIndex()
    const target = `translateX(${index * 100}%)`

    if (animate) {
      const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
      const from = this.#indicatorTrack.style.transform || 'translateX(0%)'
      safeAnimate(this.#indicatorTrack, [{ transform: from }, { transform: target }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
    } else {
      this.#indicatorTrack.style.transform = target
    }
  }

  #handleClick(e: MouseEvent): void {
    const destinations = this.#destinations()
    const path = e.composedPath()
    const index = destinations.findIndex((el) => path.includes(el))
    if (index < 0) return
    const value = this.#valueOf(destinations[index]!, index)
    this.dispatchEvent(new CustomEvent('convey-select', { detail: { value } }))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-navigation-bar')) {
  customElements.define('convey-navigation-bar', ConveyNavigationBarElement)
}
