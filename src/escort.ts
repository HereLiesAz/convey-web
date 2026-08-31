import { safeAnimate } from './tokens/motion.js'

/**
 * The framework's replacement for disabled controls, validation error summaries, and
 * "please complete all required fields" — the web port of convey's `ConveyEscort`.
 *
 * A `ConveyGate` is a condition standing between a person and an act, and — the part a plain
 * `disabled` boolean cannot express — it knows where it lives. Clicking a blocked
 * `<convey-escorted>` does not do nothing, and does not show a message. The element resists
 * at the point of contact (a small Refuse shake) and then carries the person to the gate: the
 * element registered at that gate's location is scrolled into view and focused.
 *
 * Two conventional constructs collapse into this one mechanism: the disabled control and the
 * "jump to first error" affordance. And the emotional register changes with it. A greyed-out
 * button says *you failed to read the rules*. An escort says *come on, it's this way* — same
 * information, opposite treatment of the person's dignity.
 *
 * ```html
 * <convey-gate-location identity="email">
 *   <input id="email-input" />
 * </convey-gate-location>
 *
 * <convey-escorted id="submit">
 *   <button>Submit</button>
 * </convey-escorted>
 *
 * <script>
 *   const email = document.getElementById('email-input')
 *   document.getElementById('submit').gate = new ConveyGate('email', () => email.value !== '')
 * </script>
 * ```
 */
export class ConveyGate {
  readonly identity: string
  readonly isSatisfied: () => boolean

  constructor(identity: string, isSatisfied: () => boolean) {
    this.identity = identity
    this.isSatisfied = isSatisfied
  }
}

/**
 * Tracks where each `ConveyGate` identity physically lives on a surface, so a blocked
 * `<convey-escorted>` can travel there. Elements register their location via
 * `<convey-gate-location>`; nothing needs to be wired up manually beyond that.
 */
export class ConveyEscortRegistry {
  private readonly locations = new Map<string, () => void | Promise<void>>()

  register(identity: string, travel: () => void | Promise<void>): void {
    this.locations.set(identity, travel)
  }

  unregister(identity: string): void {
    this.locations.delete(identity)
  }

  /** Brings the element at `identity`'s registered location into view and focuses it. No-op if unregistered. */
  async escortTo(identity: string): Promise<void> {
    await this.locations.get(identity)?.()
  }
}

const registryOfElement = new WeakMap<Element, ConveyEscortRegistry>()

/** Associates `registry` with `root` so descendant escort elements can find it. */
export function provideEscortRegistry(root: Element, registry: ConveyEscortRegistry): void {
  registryOfElement.set(root, registry)
}

/** The nearest ancestor `ConveyEscortRegistry` for `el`, walking up through shadow-DOM boundaries. */
export function nearestEscortRegistry(el: Element): ConveyEscortRegistry | undefined {
  let node: Element | null = el
  while (node) {
    const found = registryOfElement.get(node)
    if (found) return found
    node = node.parentElement ?? (node.getRootNode() as ShadowRoot | null)?.host ?? null
  }
  return undefined
}

/**
 * Marks this element as the physical location of the gate named by its `identity`
 * attribute. A blocked `<convey-escorted>` elsewhere on the surface whose gate has this
 * identity will scroll this element into view and focus its first focusable descendant (or
 * itself, if it is itself focusable) when escorted to.
 */
export class ConveyGateLocationElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['identity']
  }

  #registry: ConveyEscortRegistry | undefined
  #registeredIdentity: string | undefined

  connectedCallback(): void {
    this.#registry = nearestEscortRegistry(this)
    this.#syncRegistration()
  }

  disconnectedCallback(): void {
    if (this.#registeredIdentity) this.#registry?.unregister(this.#registeredIdentity)
    this.#registry = undefined
    this.#registeredIdentity = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#syncRegistration()
  }

  #syncRegistration(): void {
    if (this.#registeredIdentity) this.#registry?.unregister(this.#registeredIdentity)
    const identity = this.getAttribute('identity')
    if (identity === null) {
      this.#registeredIdentity = undefined
      return
    }
    this.#registeredIdentity = identity
    this.#registry?.register(identity, () => this.#travelHere())
  }

  #travelHere(): void {
    // jsdom (and so a Vitest/Jest consumer test) doesn't implement scrollIntoView either --
    // the same class of gap safeAnimate() guards against for Element.animate(). Feature-detect
    // rather than crash the escort sequence over a missing scroll, which is cosmetic next to
    // actually moving focus.
    if (typeof this.scrollIntoView === 'function') {
      this.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const focusable = this.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex], a[href]',
    )
    ;(focusable ?? (this.tabIndex >= 0 ? this : null))?.focus()
  }
}

/**
 * Wraps an act's control with a `gate` (set as a JS property — a gate's satisfaction
 * predicate is a live function, which no HTML attribute can carry). While
 * `gate.isSatisfied()` is false, clicking performs the Refuse signature — a brief resistant
 * shake — and escorts the surface to the gate's registered location, rather than doing
 * nothing or rendering a disabled appearance. While satisfied, clicking dispatches a
 * `convey-click` event normally.
 *
 * Slotted content stays visually identical either way — an escorted control stays visually
 * alive, never greyed out, because a genuinely dead control and a gated one are different
 * things (see `ConveyWeight`'s `'ghost'` for the former).
 */
export class ConveyEscortedElement extends HTMLElement {
  #shadow: ShadowRoot
  #box: HTMLElement
  #gate: ConveyGate | null = null
  #registry: ConveyEscortRegistry | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .box { cursor: pointer; }
      </style>
      <div class="box" part="box"><slot></slot></div>
    `
    this.#box = this.#shadow.querySelector('.box')!
    this.#box.addEventListener('click', () => this.#handleClick())
  }

  connectedCallback(): void {
    this.#registry = nearestEscortRegistry(this)
  }

  disconnectedCallback(): void {
    this.#registry = undefined
  }

  get gate(): ConveyGate | null {
    return this.#gate
  }

  set gate(value: ConveyGate | null) {
    this.#gate = value
  }

  #handleClick(): void {
    if (this.#gate === null || this.#gate.isSatisfied()) {
      this.dispatchEvent(new CustomEvent('convey-click'))
      return
    }
    void this.#refuseAndEscort(this.#gate.identity)
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
    await this.#registry?.escortTo(identity)
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('convey-gate-location')) {
    customElements.define('convey-gate-location', ConveyGateLocationElement)
  }
  if (!customElements.get('convey-escorted')) {
    customElements.define('convey-escorted', ConveyEscortedElement)
  }
}
