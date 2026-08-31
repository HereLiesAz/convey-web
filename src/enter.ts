import { safeAnimate, toCss } from './tokens/motion.js'
import { grammarOf } from './system.js'

/**
 * Law 2 — Continuity: "Nothing appears from nowhere and nothing goes nowhere" — the web port
 * of convey's `ConveyEnter`.
 *
 * If clicking a row opens a detail view, the row *becomes* the detail view. Cross-fades and
 * teleports destroy the mental map a person builds of a system they have never seen; a
 * destination cannot be declared without naming the element it grows out of.
 *
 * `<convey-origin key="...">` records where it was on screen; the `<convey-enter>` with a
 * matching `key` grows from that recorded position to fill its own space, instead of
 * appearing from nowhere.
 *
 * ```html
 * <!-- In the list: -->
 * <convey-origin key="message-41"><div class="row">...</div></convey-origin>
 *
 * <!-- In the destination, once navigated to: -->
 * <convey-enter key="message-41"><div class="detail">...</div></convey-enter>
 * ```
 *
 * This is a scale/translate approximation of a shared-element transition — the destination's
 * whole box grows from the origin element's last recorded bounds to its own, rather than a
 * true per-element content morph. Like the Kotlin original, it has not been visually verified
 * against a real display in the environment this was built in; try it on a real target before
 * trusting the feel of it.
 *
 * Bounds are captured at `connectedCallback` and re-captured on window `resize`/`scroll`
 * (throttled to one measurement per animation frame) — not continuously the way Compose's
 * `onGloballyPositioned` fires on every layout pass, since the DOM has no equivalent hook
 * without a `ResizeObserver`/`MutationObserver` pair watching every ancestor. Good enough for
 * the common case (the origin's position is stable between being seen and being clicked);
 * call `recordBounds()` on a `<convey-origin>` manually right before navigating away from it
 * if your layout might have shifted since the last capture.
 */

interface Bounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

function boundsOf(el: Element): Bounds {
  const rect = el.getBoundingClientRect()
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

/** Tracks the last recorded on-screen bounds of every `<convey-origin>`-marked element. */
export class ConveyOriginRegistry {
  private readonly bounds = new Map<string, Bounds>()

  register(key: string, rect: Bounds): void {
    this.bounds.set(key, rect)
  }

  /** The last recorded bounds for `key`, or `undefined` if nothing marked with it has registered yet. */
  boundsFor(key: string): Bounds | undefined {
    return this.bounds.get(key)
  }
}

const registryOfElement = new WeakMap<Element, ConveyOriginRegistry>()

/** Associates `registry` with `root` so descendant origin/enter elements can find it. */
export function provideOriginRegistry(root: Element, registry: ConveyOriginRegistry): void {
  registryOfElement.set(root, registry)
}

/** The nearest ancestor `ConveyOriginRegistry` for `el`, walking up through shadow-DOM boundaries. */
export function nearestOriginRegistry(el: Element): ConveyOriginRegistry | undefined {
  let node: Element | null = el
  while (node) {
    const found = registryOfElement.get(node)
    if (found) return found
    node = node.parentElement ?? (node.getRootNode() as ShadowRoot | null)?.host ?? null
  }
  return undefined
}

/**
 * Marks this element as the place a `<convey-enter>` with a matching `key` grows out of.
 * Records this element's viewport-relative bounds on connect and on window `resize`/`scroll`.
 */
export class ConveyOriginElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['key']
  }

  #registry: ConveyOriginRegistry | undefined
  #onWindowChange = () => this.recordBounds()
  #scheduled = false

  connectedCallback(): void {
    this.style.display ||= 'contents'
    this.#registry = nearestOriginRegistry(this)
    this.recordBounds()
    window.addEventListener('resize', this.#throttled)
    window.addEventListener('scroll', this.#throttled, true)
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.#throttled)
    window.removeEventListener('scroll', this.#throttled, true)
    this.#registry = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.recordBounds()
  }

  #throttled = () => {
    if (this.#scheduled) return
    this.#scheduled = true
    requestAnimationFrame(() => {
      this.#scheduled = false
      this.#onWindowChange()
    })
  }

  /** Re-measures and re-records this element's current bounds immediately. */
  recordBounds(): void {
    const key = this.getAttribute('key')
    if (key === null || this.#registry === undefined) return
    this.#registry.register(key, boundsOf(this))
  }
}

/**
 * Grows from the bounds recorded for `key` (via a `<convey-origin key="...">` elsewhere on
 * the surface) to its own layout position and size. No recorded origin (e.g. a deep link
 * straight to this destination) means nothing to grow from — it just appears, honestly,
 * rather than faking a grow-from-nowhere animation.
 */
export class ConveyEnterElement extends HTMLElement {
  connectedCallback(): void {
    this.style.display ||= 'block'
    // Wait a frame so this element has its own final layout bounds before measuring --
    // getBoundingClientRect() immediately in connectedCallback can still reflect a pre-layout
    // (often zero-sized) box.
    requestAnimationFrame(() => this.#animateIn())
  }

  #animateIn(): void {
    const key = this.getAttribute('key')
    const registry = nearestOriginRegistry(this)
    const origin = key === null ? undefined : registry?.boundsFor(key)
    const own = boundsOf(this)

    if (origin === undefined || own.width === 0 || own.height === 0) return // nothing to grow from

    const ownCenterX = own.x + own.width / 2
    const ownCenterY = own.y + own.height / 2
    const originCenterX = origin.x + origin.width / 2
    const originCenterY = origin.y + origin.height / 2

    const scaleX = origin.width / own.width
    const scaleY = origin.height / own.height
    const translateX = originCenterX - ownCenterX
    const translateY = originCenterY - ownCenterY

    const { durationMs, easing } = toCss(grammarOf(this).get('navigate'))
    safeAnimate(
      this,
      [
        { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})` },
        { transform: 'translate(0px, 0px) scale(1, 1)' },
      ],
      { duration: durationMs, easing, fill: 'forwards' },
    )
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('convey-origin')) customElements.define('convey-origin', ConveyOriginElement)
  if (!customElements.get('convey-enter')) customElements.define('convey-enter', ConveyEnterElement)
}
