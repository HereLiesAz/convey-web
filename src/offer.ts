import { safeAnimate, toCss } from './tokens/motion.js'
import { ConveyShape, applyShape, type ConveyShapeToken } from './tokens/shape.js'
import { grammarOf } from './system.js'
import { nearestEscortRegistry } from './escort.js'
import type { ConveyGate } from './escort.js'
import { ConveyWeightRegistry, nearestWeightRegistry, type ConveyWeight } from './weight.js'

/**
 * The states an offered act moves through — the web port of convey's `ConveyOfferPhase`.
 * One element renders all of them — there is no separate spinner spawned for `progress`, no
 * separate toast for `success`.
 */
export type ConveyOfferPhase = 'invite' | 'progress' | 'success' | 'failure' | 'interrupted'

/**
 * The framework's `Act`, offered — the web port of convey's `ConveyOffer`: one declaration
 * carrying what several separate primitives in this library only offer piecemeal.
 *
 * - `gate` (a JS property, same as `<convey-escorted>` — a predicate function can't be an
 *   attribute), if set, means this act is blocked until `gate.isSatisfied()`; clicking while
 *   blocked performs the Refuse-and-escort sequence instead of dispatching `convey-invoke`.
 * - `interruptible`, if set, means clicking during `phase="progress"` dispatches
 *   `convey-interrupt` instead of doing nothing — Law 4's owed fourth job: a way to stop an
 *   act while it's in flight.
 * - `invite`/`progress`/`success`/`failure`/`interrupted` render from the same element via
 *   named slots, morphing shape/color/size between them (the `morph` grammar meaning) rather
 *   than one being swapped for another.
 *
 * A *destructive* act's required inverse is not a parameter here — it is `<convey-reversal>`
 * wrapping this element, with a `convey-invoke` listener calling `state.destroy(item)`.
 *
 * ```html
 * <convey-offer purpose="Send the invoice" weight="primary" phase="invite">
 *   <span slot="invite">Send</span>
 *   <span slot="progress">…</span>
 *   <span slot="success">✓</span>
 *   <span slot="interrupted">Cancelled</span>
 * </convey-offer>
 * <script>
 *   const offer = document.querySelector('convey-offer')
 *   offer.gate = new ConveyGate('email', () => email.value !== '')
 *   offer.addEventListener('convey-invoke', async () => {
 *     offer.setAttribute('phase', 'progress')
 *     offer.setAttribute('phase', (await send()) ? 'success' : 'failure')
 *   })
 * </script>
 * ```
 *
 * Attributes: `purpose` (audit label, not rendered — mirrors `ConveyConstruct`'s `purpose`),
 * `phase`, `weight` (default `secondary`), `interruptible`, `target-color`/
 * `target-content-color` (CSS colors), `target-width`/`target-height` (CSS lengths, unset =
 * wrap content). Does not self-mutate `phase` — the caller owns it, since only the caller's
 * own work knows when it settles, same contract as the Kotlin original.
 *
 * Slots: `invite`, `progress`, `success`, `failure` (falls back to `invite`'s content if
 * empty — the common case where Invite and Failure read identically, "Send"/"Send"),
 * `interrupted`.
 */
export class ConveyOfferElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['phase', 'weight', 'target-color', 'target-content-color', 'target-width', 'target-height']
  }

  #shadow: ShadowRoot
  #box: HTMLElement
  #gate: ConveyGate | null = null
  #weightRegistry: ConveyWeightRegistry | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .box { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; }
        .box[data-enabled="true"] { cursor: pointer; }
        .box[data-enabled="false"] { cursor: default; }
        slot { display: none; }
        slot.active { display: contents; }
      </style>
      <div class="box" part="box">
        <slot name="invite"></slot>
        <slot name="progress"></slot>
        <slot name="success"></slot>
        <slot name="failure"></slot>
        <slot name="interrupted"></slot>
      </div>
    `
    this.#box = this.#shadow.querySelector('.box')!
    this.#box.addEventListener('click', () => this.#handleClick())
  }

  connectedCallback(): void {
    this.#weightRegistry = nearestWeightRegistry(this)
    this.#weightRegistry?.register(this, this.#weight())
    this.#applyStyle(false)
    this.#applyPhaseVisibility()
  }

  disconnectedCallback(): void {
    this.#weightRegistry?.unregister(this)
    this.#weightRegistry = undefined
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'weight') {
      this.#weightRegistry?.register(this, this.#weight())
      return
    }
    if (name === 'phase') {
      this.#applyStyle(true)
      this.#applyPhaseVisibility()
      return
    }
    this.#applyStyle(true)
  }

  get gate(): ConveyGate | null {
    return this.#gate
  }

  set gate(value: ConveyGate | null) {
    this.#gate = value
  }

  #weight(): ConveyWeight {
    return (this.getAttribute('weight') as ConveyWeight | null) ?? 'secondary'
  }

  #phase(): ConveyOfferPhase {
    const raw = this.getAttribute('phase')
    return raw === 'progress' || raw === 'success' || raw === 'failure' || raw === 'interrupted' ? raw : 'invite'
  }

  #interruptible(): boolean {
    return this.hasAttribute('interruptible')
  }

  #enabled(): boolean {
    const phase = this.#phase()
    if (phase === 'invite' || phase === 'failure') return true
    if (phase === 'progress') return this.#interruptible()
    return false // success, interrupted
  }

  #applyPhaseVisibility(): void {
    const phase = this.#phase()
    const slots = this.#shadow.querySelectorAll('slot')
    slots.forEach((slot) => slot.classList.remove('active'))

    let activeSlotName: ConveyOfferPhase = phase
    if (phase === 'failure') {
      const failureSlot = this.#shadow.querySelector('slot[name="failure"]') as HTMLSlotElement
      if (failureSlot.assignedNodes({ flatten: true }).length === 0) activeSlotName = 'invite'
    }
    this.#shadow.querySelector(`slot[name="${activeSlotName}"]`)?.classList.add('active')
    this.#box.dataset.enabled = String(this.#enabled())
  }

  #applyStyle(animate: boolean): void {
    const shape: ConveyShapeToken = ConveyShape.Medium
    applyShape(this.#box, shape)

    const targetColor = this.getAttribute('target-color')
    const targetContentColor = this.getAttribute('target-content-color')
    const targetWidth = this.getAttribute('target-width')
    const targetHeight = this.getAttribute('target-height')

    const apply = () => {
      if (targetColor !== null) this.#box.style.backgroundColor = targetColor
      if (targetContentColor !== null) this.#box.style.color = targetContentColor
      this.#box.style.width = targetWidth ?? ''
      this.#box.style.height = targetHeight ?? ''
    }

    if (!animate) {
      apply()
      return
    }
    const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
    if (targetColor !== null) {
      const from = getComputedStyle(this.#box).backgroundColor
      safeAnimate(this.#box, [{ backgroundColor: from }, { backgroundColor: targetColor }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
    }
    if (targetContentColor !== null) {
      const from = getComputedStyle(this.#box).color
      safeAnimate(this.#box, [{ color: from }, { color: targetContentColor }], { duration: durationMs, easing, fill: 'forwards' })
    }
    if (targetWidth !== null || targetHeight !== null) {
      const fromWidth = this.#box.style.width || 'auto'
      const fromHeight = this.#box.style.height || 'auto'
      safeAnimate(
        this.#box,
        [
          { width: fromWidth, height: fromHeight },
          { width: targetWidth ?? 'auto', height: targetHeight ?? 'auto' },
        ],
        { duration: durationMs, easing, fill: 'forwards' },
      )
    }
  }

  #handleClick(): void {
    const phase = this.#phase()

    if (phase === 'progress') {
      if (this.#interruptible()) this.dispatchEvent(new CustomEvent('convey-interrupt'))
      return
    }
    if (!this.#enabled()) return

    const satisfied = this.#gate?.isSatisfied() ?? true
    if (satisfied) {
      this.dispatchEvent(new CustomEvent('convey-invoke'))
      return
    }
    void this.#refuseAndEscort(this.#gate!.identity)
  }

  async #refuseAndEscort(identity: string): Promise<void> {
    const shake = safeAnimate(
      this.#box,
      [
        { transform: 'translateX(0px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0px)' },
      ],
      { duration: 160, easing: 'ease-out', fill: 'forwards' },
    )
    await shake?.finished
    await nearestEscortRegistry(this)?.escortTo(identity)
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-offer')) {
  customElements.define('convey-offer', ConveyOfferElement)
}
