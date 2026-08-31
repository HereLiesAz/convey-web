import { safeAnimate, toCss } from '../tokens/motion.js'
import { ConveyColor } from '../tokens/color.js'
import { grammarOf } from '../system.js'

/**
 * A small status indicator anchored to its slotted content's top-end corner — the web port
 * of convey's `ConveyBadge`. A bare dot when `count` is unset, a count pill otherwise.
 * Appearing/disappearing scales in and out (the "morph" meaning); a genuine count change
 * gets a brief confirm bounce, so a new notification reads as an event, not a silent
 * number swap.
 *
 * ```html
 * <convey-badge count="3">
 *   <button>🔔</button>
 * </convey-badge>
 * ```
 *
 * Attributes:
 * - `count` — omit for a bare dot. `0` or absent-and-empty hides the badge entirely.
 *   A positive count renders as text, capped at `max-count` (shown as `"${maxCount}+"`).
 * - `color` / `content-color` — CSS color values. Default to `ConveyColor.Error`/`OnError`.
 * - `max-count` — defaults to `99`.
 */
export class ConveyBadgeElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['count', 'color', 'content-color', 'max-count']
  }

  #shadow: ShadowRoot
  #badge: HTMLElement
  #label: HTMLElement
  #currentScale = 0
  #initialized = false

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { position: relative; display: inline-block; }
        ::slotted(*) { display: block; }
        .badge {
          position: absolute;
          top: 0;
          right: 0;
          transform: translate(50%, -50%) scale(0);
          transform-origin: center;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          min-height: 16px;
          padding: 0 4px;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          box-sizing: border-box;
        }
        .badge.dot { min-width: 8px; min-height: 8px; padding: 0; }
      </style>
      <slot></slot>
      <div class="badge" part="badge"><span class="label"></span></div>
    `
    this.#badge = this.#shadow.querySelector('.badge')!
    this.#label = this.#shadow.querySelector('.label')!
  }

  connectedCallback(): void {
    this.#render(true)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    this.#render(name === 'color' || name === 'content-color' || name === 'max-count')
  }

  #count(): number | null {
    const raw = this.getAttribute('count')
    if (raw === null) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }

  #maxCount(): number {
    const raw = this.getAttribute('max-count')
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 99
  }

  #render(stylesOnly: boolean): void {
    const color = this.getAttribute('color') ?? ConveyColor.Error
    const contentColor = this.getAttribute('content-color') ?? ConveyColor.OnError
    this.#badge.style.backgroundColor = color
    this.#label.style.color = contentColor

    const count = this.#count()
    const visible = count === null || count > 0
    this.#badge.classList.toggle('dot', count === null)

    if (count !== null) {
      const maxCount = this.#maxCount()
      this.#label.textContent = count > maxCount ? `${maxCount}+` : String(count)
    } else {
      this.#label.textContent = ''
    }

    if (stylesOnly && this.#initialized) return

    const wasVisible = this.#currentScale > 0.01
    this.#initialized = true

    if (visible !== wasVisible) {
      this.#animateTo(visible ? 1 : 0, 'morph')
    } else if (visible && count !== null) {
      // A genuine count change while already visible: brief confirm bounce.
      void this.#bounce()
    } else if (visible) {
      this.#setScale(1)
    } else {
      this.#setScale(0)
    }
  }

  #setScale(scale: number): void {
    this.#currentScale = scale
    this.#badge.style.transform = `translate(50%, -50%) scale(${scale})`
  }

  #animateTo(target: number, meaning: string): void {
    const grammar = grammarOf(this)
    const { durationMs, easing } = toCss(grammar.get(meaning))
    const from = this.#currentScale
    this.#currentScale = target
    safeAnimate(
      this.#badge,
      [{ transform: `translate(50%, -50%) scale(${from})` }, { transform: `translate(50%, -50%) scale(${target})` }],
      { duration: durationMs, easing, fill: 'forwards' },
    )
  }

  async #bounce(): Promise<void> {
    const grammar = grammarOf(this)
    const { durationMs, easing } = toCss(grammar.get('confirm'))
    const up = safeAnimate(
      this.#badge,
      [{ transform: 'translate(50%, -50%) scale(1)' }, { transform: 'translate(50%, -50%) scale(1.25)' }],
      { duration: durationMs, easing, fill: 'forwards' },
    )
    await up?.finished
    const down = safeAnimate(
      this.#badge,
      [{ transform: 'translate(50%, -50%) scale(1.25)' }, { transform: 'translate(50%, -50%) scale(1)' }],
      { duration: durationMs, easing, fill: 'forwards' },
    )
    await down?.finished
    this.#currentScale = 1
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-badge')) {
  customElements.define('convey-badge', ConveyBadgeElement)
}
