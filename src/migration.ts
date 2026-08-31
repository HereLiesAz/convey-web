import { safeAnimate, toCss } from './tokens/motion.js'
import { grammarOf } from './system.js'

/**
 * The framework's replacement for empty-state illustrations and their explanatory
 * paragraphs — the web port of convey's `ConveyMigration`.
 *
 * An empty collection does not display a message about being empty. It displays its
 * creation control, at full size, in the center of the space the collection will occupy.
 * When the first subject is created, that control travels to the corner position where it
 * will live from now on, and shrinks into it.
 *
 * In one motion, with no words, a person learns: what this space is for, how to fill it, and
 * where the button will be for the rest of their life with this product. One element does
 * the job of an illustration, a paragraph, and a FAB — because it is the same element
 * throughout, not three things swapped for each other.
 *
 * ```html
 * <convey-migration corner="bottom-end" full-size="96px" compact-size="56px">
 *   <div slot="content"><!-- the collection, shown once non-empty --></div>
 *   <button slot="creation-control">+</button>
 * </convey-migration>
 * <script>
 *   document.querySelector('convey-migration').toggleAttribute('empty', notes.length === 0)
 * </script>
 * ```
 *
 * Attributes:
 * - `empty` — presence keeps the creation control centered and full-size; absence relocates
 *   it to `corner` at `compact-size` and shows the `content` slot.
 * - `corner` — where the creation control lives once non-empty: `bottom-end` (default,
 *   the common FAB spot), `bottom-start`, `top-end`, `top-start`, `top`, `bottom`, `start`,
 *   `end`, or `center`.
 * - `full-size` / `compact-size` — CSS length for the creation control's box while empty /
 *   once relocated (defaults `96px` / `56px`). The slotted creation control stretches to
 *   fill this box via `::slotted`.
 * - `content-padding` — inset from the corner (default `16px`).
 *
 * Uses the `navigate` grammar meaning for the relocation — it IS a move to a new place —
 * and `morph` for the size change, same as the Kotlin original.
 */
export class ConveyMigrationElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['empty', 'corner', 'full-size', 'compact-size', 'content-padding']
  }

  #shadow: ShadowRoot
  #contentSlotWrap: HTMLElement
  #controlBox: HTMLElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; position: relative; width: 100%; height: 100%; }
        .content-wrap { position: absolute; inset: 0; }
        .control-box {
          position: absolute;
          box-sizing: border-box;
        }
        ::slotted([slot="creation-control"]) { width: 100%; height: 100%; }
      </style>
      <div class="content-wrap" part="content"><slot name="content"></slot></div>
      <div class="control-box" part="control-box"><slot name="creation-control"></slot></div>
    `
    this.#contentSlotWrap = this.#shadow.querySelector('.content-wrap')!
    this.#controlBox = this.#shadow.querySelector('.control-box')!
  }

  connectedCallback(): void {
    this.#apply(false)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    this.#apply(name === 'empty' || name === 'corner')
  }

  #isEmpty(): boolean {
    return this.hasAttribute('empty')
  }

  #bias(): [number, number] {
    switch (this.getAttribute('corner')) {
      case 'top-start':
        return [-1, -1]
      case 'top-end':
        return [1, -1]
      case 'bottom-start':
        return [-1, 1]
      case 'top':
        return [0, -1]
      case 'bottom':
        return [0, 1]
      case 'start':
        return [-1, 0]
      case 'end':
        return [1, 0]
      case 'center':
        return [0, 0]
      case 'bottom-end':
      default:
        return [1, 1]
    }
  }

  #fullSize(): string {
    return this.getAttribute('full-size') ?? '96px'
  }

  #compactSize(): string {
    return this.getAttribute('compact-size') ?? '56px'
  }

  #padding(): string {
    return this.getAttribute('content-padding') ?? '16px'
  }

  #apply(animate: boolean): void {
    const empty = this.#isEmpty()
    this.#contentSlotWrap.style.display = empty ? 'none' : ''

    const [hBias, vBias] = empty ? [0, 0] : this.#bias()
    const leftPercent = ((1 + hBias) / 2) * 100
    const topPercent = ((1 + vBias) / 2) * 100
    const size = empty ? this.#fullSize() : this.#compactSize()
    const padding = this.#padding()

    // Matches BiasAlignment's own math: the control box's *center* sits at
    // ((1+bias)/2) of the container along each axis, so translate(-50%, -50%) always
    // recenters the box on that computed point regardless of the box's own size. `padding`
    // then insets that point away from whichever edge `bias` leans toward (none at center).
    const inset = (percent: number, bias: number) =>
      bias < 0 ? `calc(${percent}% + ${padding})` : bias > 0 ? `calc(${percent}% - ${padding})` : `${percent}%`
    const targetLeft = inset(leftPercent, hBias)
    const targetTop = inset(topPercent, vBias)

    if (!animate) {
      this.#controlBox.style.left = targetLeft
      this.#controlBox.style.top = targetTop
      this.#controlBox.style.width = size
      this.#controlBox.style.height = size
      this.#controlBox.style.transform = 'translate(-50%, -50%)'
      return
    }

    const navigate = toCss(grammarOf(this).get('navigate'))
    const morph = toCss(grammarOf(this).get('morph'))
    const fromLeft = this.#controlBox.style.left || targetLeft
    const fromTop = this.#controlBox.style.top || targetTop
    const fromSize = this.#controlBox.style.width || size

    safeAnimate(this.#controlBox, [{ left: fromLeft, top: fromTop }, { left: targetLeft, top: targetTop }], {
      duration: navigate.durationMs,
      easing: navigate.easing,
      fill: 'forwards',
    })
    safeAnimate(this.#controlBox, [{ width: fromSize, height: fromSize }, { width: size, height: size }], {
      duration: morph.durationMs,
      easing: morph.easing,
      fill: 'forwards',
    })
    this.#controlBox.style.transform = 'translate(-50%, -50%)'
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-migration')) {
  customElements.define('convey-migration', ConveyMigrationElement)
}
