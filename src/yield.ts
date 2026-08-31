import { safeAnimate } from './tokens/motion.js'

/**
 * The framework's replacement for spinners, progress bars, loading skeletons, and "please
 * wait" — the web port of convey's `ConveyYield`.
 *
 * The engaged element deforms under load, in place, instead of a separate progress object
 * appearing beside it. A separate object severs the link between what a person touched and
 * what is happening — precisely the link they are trying to learn. `<convey-yield>` keeps
 * that link by having the same pixels the person touched fill and compress as the work
 * proceeds.
 *
 * `state="determinate"` deforms proportionally to `progress`. `state="indeterminate"`
 * deforms rhythmically, looping every `period` ms until `state` changes away from it — there
 * is no separate "how long is this" question for the person to ask, because the element
 * visibly keeps working until it stops.
 *
 * ```html
 * <convey-yield state="idle">
 *   <button>Submit</button>
 * </convey-yield>
 * <script>
 *   const y = document.querySelector('convey-yield')
 *   y.setAttribute('state', 'indeterminate')
 *   await submit()
 *   y.setAttribute('state', 'idle')
 * </script>
 * ```
 *
 * Attributes:
 * - `state` — `idle` (default) / `determinate` / `indeterminate`.
 * - `progress` — `0`–`1`, used when `state="determinate"`. Coerced into range.
 * - `period` — loop period in ms when `state="indeterminate"` (default `1100`).
 * - `fill-color` — the deformation's fill color, any CSS color. Defaults to a low-alpha
 *   overlay so it reads against any content color without callers needing to match their
 *   own palette.
 */
export class ConveyYieldElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['state', 'progress', 'period', 'fill-color']
  }

  #shadow: ShadowRoot
  #wrapper: HTMLElement
  #fill: HTMLElement
  #loop: Animation | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .wrapper { position: relative; overflow: hidden; }
        .fill { position: absolute; inset: 0 auto 0 0; width: 0; pointer-events: none; }
      </style>
      <div class="wrapper" part="wrapper">
        <slot></slot>
        <div class="fill" part="fill"></div>
      </div>
    `
    this.#wrapper = this.#shadow.querySelector('.wrapper')!
    this.#fill = this.#shadow.querySelector('.fill')!
  }

  connectedCallback(): void {
    this.#fill.style.backgroundColor = this.getAttribute('fill-color') ?? 'rgba(0, 0, 0, 0.12)'
    this.#apply()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'fill-color') {
      this.#fill.style.backgroundColor = this.getAttribute('fill-color') ?? 'rgba(0, 0, 0, 0.12)'
      return
    }
    this.#apply()
  }

  #state(): 'idle' | 'determinate' | 'indeterminate' {
    const raw = this.getAttribute('state')
    return raw === 'determinate' || raw === 'indeterminate' ? raw : 'idle'
  }

  #progress(): number {
    const raw = this.getAttribute('progress')
    const n = raw === null ? NaN : Number.parseFloat(raw)
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
  }

  #period(): number {
    const raw = this.getAttribute('period')
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : 1100
  }

  #apply(): void {
    this.#loop?.cancel()
    this.#loop = undefined

    const state = this.#state()

    if (state === 'idle') {
      safeAnimate(this.#wrapper, [{ transform: this.#wrapper.style.transform || 'scale(1)' }, { transform: 'scale(1)' }], {
        duration: 150,
        easing: 'ease-out',
        fill: 'forwards',
      })
      this.#fill.style.width = '0px'
      return
    }

    safeAnimate(this.#wrapper, [{ transform: this.#wrapper.style.transform || 'scale(1)' }, { transform: 'scale(0.97)' }], {
      duration: 150,
      easing: 'ease-out',
      fill: 'forwards',
    })

    if (state === 'determinate') {
      const target = `${this.#progress() * 100}%`
      safeAnimate(this.#fill, [{ width: this.#fill.style.width || '0%' }, { width: target }], {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards',
      })
      return
    }

    // Indeterminate: a WAAPI keyframe loop (0% -> 100% -> 0%, alternating, infinite) does the
    // rhythmic fill/unfill directly -- no manual while-true animate-then-await loop needed the
    // way Compose's coroutine-based Animatable required.
    const halfPeriod = Math.max(1, Math.floor(this.#period() / 2))
    this.#loop = safeAnimate(this.#fill, [{ width: '0%' }, { width: '100%' }], {
      duration: halfPeriod,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      iterations: Infinity,
      direction: 'alternate',
      fill: 'forwards',
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-yield')) {
  customElements.define('convey-yield', ConveyYieldElement)
}
