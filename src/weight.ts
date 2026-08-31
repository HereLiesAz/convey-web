/**
 * Visual weight in the Conveyance hierarchy — the web port of convey's `ConveyWeight`.
 *
 * The Manifesto says: "Dynamic color implicitly prioritizes." That's incomplete. Color
 * alone can't enforce hierarchy — a developer can paint everything Primary. Weight makes
 * the hierarchy structural.
 *
 * Rules enforced at runtime (when `enforce` is true — see `ConveyWeightRegistry`):
 *   - `hero`: Only one per registry scope. This IS the product's defining moment.
 *             A screen with two heroes has no hero. The system will tell you.
 *   - `primary`: Strongly interactive. Limited to `maxPrimary` per scope (default 3).
 *             A screen with twelve primary actions has no primary action.
 *   - `secondary`: Supporting. Unlimited. The system trusts you here.
 *   - `ghost`: Present but inert. Marks decorative elements explicitly — they are not
 *             forgotten, they are acknowledged as intentionally passive.
 *
 * The most important weight is `hero`. A product that cannot identify its hero moment
 * has not finished designing itself.
 *
 * Compose enforces this through a `CompositionLocal` registry a `DisposableEffect`
 * registers into on composition and unregisters from on disposal. The web has no
 * composition lifecycle, so the equivalent here is explicit: a `ConveyWeightRegistry`
 * instance any framework adapter (React `useEffect`, Vue `onMounted`/`onUnmounted`, or
 * a plain DOM lifec"cycle) registers into directly, plus a ready-made `<convey-weight>`
 * custom element for framework-free HTML that does this via
 * `connectedCallback`/`disconnectedCallback` — the direct DOM analog of
 * `DisposableEffect`.
 */

export type ConveyWeight = 'hero' | 'primary' | 'secondary' | 'ghost'

/** Thrown by `ConveyWeightRegistry` when `enforce` is true and a hierarchy rule is broken. */
export class ConveyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConveyViolationError'
  }
}

/**
 * Tracks all `ConveyWeight` registrations within a scope (typically one `<convey-system>`
 * root, or one logical "surface" your app defines). Enforces hierarchy constraints when
 * `enforce` is true — leave this on in development, and consider turning it off in
 * production the same way Compose's port only enforces in debug builds.
 */
export class ConveyWeightRegistry {
  private readonly registry = new Map<unknown, ConveyWeight>()
  private readonly maxPrimary: number
  private readonly enforce: boolean

  constructor(options: { maxPrimary?: number; enforce?: boolean } = {}) {
    this.maxPrimary = options.maxPrimary ?? 3
    this.enforce = options.enforce ?? true
  }

  register(id: unknown, weight: ConveyWeight): void {
    this.registry.set(id, weight)
    if (this.enforce) this.validate()
  }

  unregister(id: unknown): void {
    this.registry.delete(id)
  }

  get heroCount(): number {
    return this.countOf('hero')
  }

  get primaryCount(): number {
    return this.countOf('primary')
  }

  get secondaryCount(): number {
    return this.countOf('secondary')
  }

  get ghostCount(): number {
    return this.countOf('ghost')
  }

  private countOf(weight: ConveyWeight): number {
    let n = 0
    for (const w of this.registry.values()) if (w === weight) n++
    return n
  }

  private validate(): void {
    if (this.heroCount > 1) {
      throw new ConveyViolationError(
        `CONVEY HIERARCHY VIOLATION: ${this.heroCount} Hero elements on one surface.\n` +
          'A surface with multiple heroes has no hero. Demote all but one to Primary.\n' +
          "The hero is the answer to: 'What is the single most important thing here?'",
      )
    }
    if (this.primaryCount > this.maxPrimary) {
      throw new ConveyViolationError(
        `CONVEY HIERARCHY VIOLATION: ${this.primaryCount} Primary elements (max ${this.maxPrimary}).\n` +
          'When everything is primary, nothing is primary. Demote some to Secondary.\n' +
          "Ask: which actions advance the user's goal? Those are Primary. Others are Secondary.",
      )
    }
  }

  snapshot(): string {
    return (
      `ConveyWeight Snapshot:\n` +
      `  Hero:      ${this.heroCount}  (max 1)\n` +
      `  Primary:   ${this.primaryCount}  (max ${this.maxPrimary})\n` +
      `  Secondary: ${this.secondaryCount}\n` +
      `  Ghost:     ${this.ghostCount}`
    )
  }
}

const registryOfElement = new WeakMap<Element, ConveyWeightRegistry>()

/** Associates `registry` with `root` so descendant `<convey-weight>` elements can find it. */
export function provideWeightRegistry(root: Element, registry: ConveyWeightRegistry): void {
  registryOfElement.set(root, registry)
}

function findRegistry(el: Element): ConveyWeightRegistry | undefined {
  let node: Element | null = el
  while (node) {
    const found = registryOfElement.get(node)
    if (found) return found
    node = node.parentElement ?? (node.getRootNode() as ShadowRoot | null)?.host ?? null
  }
  return undefined
}

/**
 * Framework-free HTML usage:
 * ```html
 * <convey-system>
 *   <convey-weight weight="hero"><button>Complete Purchase</button></convey-weight>
 * </convey-system>
 * ```
 * An autonomous wrapper, not a customized built-in (`is="..."`) element — Safari never
 * implemented the latter, so this is the only form that works across engines. It renders
 * as an inline `display: contents` box (see `styles.css`) so it adds no layout of its own.
 *
 * Self-registers into the nearest ancestor registry (installed via `provideWeightRegistry`,
 * which `<convey-system>` does automatically) on `connectedCallback`, unregisters on
 * `disconnectedCallback` — the DOM-lifecycle analog of `Modifier.conveyWeight`'s
 * `DisposableEffect`. Reacts to a live `weight` attribute change via
 * `attributeChangedCallback`.
 */
export class ConveyWeightElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['weight']
  }

  #registry: ConveyWeightRegistry | undefined

  connectedCallback(): void {
    this.#registry = findRegistry(this)
    this.#registerCurrent()
  }

  disconnectedCallback(): void {
    this.#registry?.unregister(this)
    this.#registry = undefined
  }

  attributeChangedCallback(name: string): void {
    if (name === 'weight' && this.isConnected) this.#registerCurrent()
  }

  #registerCurrent(): void {
    const weight = this.getAttribute('weight') as ConveyWeight | null
    if (weight === null) return
    this.#registry?.register(this, weight)
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-weight')) {
  customElements.define('convey-weight', ConveyWeightElement)
}
