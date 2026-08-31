import { safeAnimate, toCss } from '../tokens/motion.js'
import { ConveyColor } from '../tokens/color.js'
import { grammarOf } from '../system.js'

/**
 * A toggle — the web port of convey's `ConveySwitch`. The thumb is one persistent element
 * that slides between positions and morphs color — it is never replaced with a different
 * drawable for on vs. off, the same "one element is one thing across all its states"
 * principle used throughout convey.
 *
 * ```html
 * <convey-switch checked></convey-switch>
 * ```
 *
 * Attributes: `checked`, `disabled`, `track-width`/`track-height`/`thumb-size` (CSS length
 * strings, default `52px`/`32px`/`24px`).
 *
 * Fires a `convey-change` event with `detail: { checked: boolean }` on toggle — does not
 * mutate its own `checked` attribute for you, the same way a controlled input works: listen
 * for `convey-change` and set `checked` yourself, keeping one source of truth for the state.
 */
export class ConveySwitchElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'track-width', 'track-height', 'thumb-size']
  }

  #shadow: ShadowRoot
  #track: HTMLElement
  #thumb: HTMLElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
        .track {
          box-sizing: border-box;
          border-radius: 999px;
          display: flex;
          align-items: center;
          cursor: pointer;
          border: none;
          padding: 0;
        }
        .thumb { border-radius: 50%; }
      </style>
      <button class="track" part="track" type="button" role="switch">
        <span class="thumb" part="thumb"></span>
      </button>
    `
    this.#track = this.#shadow.querySelector('.track')!
    this.#thumb = this.#shadow.querySelector('.thumb')!
    this.#track.addEventListener('click', () => this.#toggle())
  }

  connectedCallback(): void {
    this.#applyGeometry()
    this.#applyState(false)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'checked') this.#applyState(true)
    else this.#applyGeometry()
  }

  get checked(): boolean {
    return this.hasAttribute('checked')
  }

  #dims() {
    const trackWidth = this.getAttribute('track-width') ?? '52px'
    const trackHeight = this.getAttribute('track-height') ?? '32px'
    const thumbSize = this.getAttribute('thumb-size') ?? '24px'
    return { trackWidth, trackHeight, thumbSize }
  }

  #applyGeometry(): void {
    const { trackWidth, trackHeight, thumbSize } = this.#dims()
    this.#track.style.width = trackWidth
    this.#track.style.height = trackHeight
    this.#thumb.style.width = thumbSize
    this.#thumb.style.height = thumbSize
    this.#track.setAttribute('aria-checked', String(this.checked))
    this.#applyState(false)
  }

  #travel(): number {
    const { trackWidth, trackHeight, thumbSize } = this.#dims()
    const px = (v: string) => Number.parseFloat(v)
    const padding = (px(trackHeight) - px(thumbSize)) / 2
    return px(trackWidth) - px(thumbSize) - padding * 2
  }

  #applyState(animate: boolean): void {
    const checked = this.checked
    this.#track.setAttribute('aria-checked', String(checked))
    const trackColor = checked ? ConveyColor.Primary : ConveyColor.SurfaceContainerHighest
    const thumbColor = checked ? ConveyColor.OnPrimary : ConveyColor.OnSurfaceVariant
    const { trackHeight, thumbSize } = this.#dims()
    const pad = `calc((${trackHeight} - ${thumbSize}) / 2)`
    const targetX = checked ? `${this.#travel()}px` : '0px'

    if (animate) {
      const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
      const fromColor = getComputedStyle(this.#track).backgroundColor
      const fromThumbColor = getComputedStyle(this.#thumb).backgroundColor
      const fromTransform = this.#thumb.style.transform || `translateX(0px)`
      safeAnimate(this.#track, [{ backgroundColor: fromColor }, { backgroundColor: trackColor }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
      safeAnimate(this.#thumb, [{ backgroundColor: fromThumbColor }, { backgroundColor: thumbColor }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
      safeAnimate(this.#thumb, [{ transform: fromTransform }, { transform: `translateX(${targetX})` }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
    } else {
      this.#track.style.backgroundColor = trackColor
      this.#thumb.style.backgroundColor = thumbColor
      this.#thumb.style.transform = `translateX(${targetX})`
    }
    this.#thumb.style.marginLeft = pad
  }

  #toggle(): void {
    if (this.hasAttribute('disabled')) return
    this.dispatchEvent(new CustomEvent('convey-change', { detail: { checked: !this.checked } }))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-switch')) {
  customElements.define('convey-switch', ConveySwitchElement)
}
