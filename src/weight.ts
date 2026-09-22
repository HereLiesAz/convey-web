/**
 * Visual weight in the Conveyance hierarchy — the web port of convey's `ConveyWeight`.
 *
 * The Manifesto says: "Dynamic color implicitly prioritizes." That's incomplete. Color
 * alone can't enforce hierarchy — a developer can paint everything Primary. Weight makes
 * the hierarchy structural.
 *
 * This is the canonical framework's five-level Act-emphasis outline (see
 * `CONVEYANCE-FRAMEWORK.md` §11, "Act emphasis and engineering the hero moment", and
 * Appendix B), *not* the older four-level `Hero/Primary/Secondary/Ghost` model with a
 * numeric Primary quota. The HTML analogy the framework itself uses is the clearest one:
 * `heroic` is the page title, then `primary`, `secondary`, `tertiary` and `supporting`
 * descend like headings.
 *
 *   - `heroic`:     title-level. At most one per registry scope — a *structural
 *                   singularity*, not a scarcity budget: a title is only a title when it
 *                   is singular.
 *   - `primary`:    the leading Act.
 *   - `secondary`:  the next level down.
 *   - `tertiary`:   the next level down again.
 *   - `supporting`: the lowest level, and the demotion floor.
 *
 * **There is no quota on any level except `heroic`.** The old model threw a
 * `ConveyViolationError` once more than `maxPrimary` (default 3) elements registered as
 * Primary; the framework has since removed that rule outright as an invented scarcity
 * budget it never actually justified. Fifty Primaries is a design smell, not a violation
 * the library is entitled to crash on.
 *
 * ### Hero of the hill
 *
 * With zero or one `heroic` declaration, every registration keeps its declared level.
 * When two or more claim `heroic`, there is no unique title, so the *whole visible
 * outline* resolves one rung lower:
 *
 * ```text
 * heroic     → primary
 * primary    → secondary
 * secondary  → tertiary
 * tertiary   → supporting
 * supporting → supporting
 * ```
 *
 * The declarations themselves are never rewritten — `declaredWeight(id)` still reports
 * exactly what the developer said, and `resolvedWeight(id)` derives the level the current
 * outline can actually present. This mirrors the framework's own `act.emphasis` /
 * `resolvedEmphasis()` split.
 *
 * The framework reports the conflict through Conscience as `HeroOfTheHill`. This library
 * has no Conscience layer, so — when `enforce` is true — the report is a thrown
 * `ConveyViolationError`, the same channel every other enforcement primitive here uses.
 * The demotion ladder still runs either way, so `resolvedWeight()` stays meaningful for a
 * caller that caught the error or turned enforcement off.
 *
 * ### No "Ghost" tier
 *
 * The four-level model's `ghost` tier is gone, and with it a real terminology collision:
 * the Conveyance Manifesto's own "Ghost" is the destruction-residue/undo concept (a
 * destroyed item collapsing to a reversible trace in place rather than raising a confirm
 * dialog), implemented in this library as `reversal.ts`. That word now means exactly one
 * thing across the codebase. An explicitly inert, decorative element is `supporting`.
 *
 * Compose enforces this through a `CompositionLocal` a `DisposableEffect` registers into
 * on composition and unregisters from on disposal. The web has no composition lifecycle,
 * so the equivalent here is explicit: a `ConveyWeightRegistry` instance any framework
 * adapter (React `useEffect`, Vue `onMounted`/`onUnmounted`, or a plain DOM lifecycle)
 * registers into directly, plus a ready-made `<convey-weight>` custom element for
 * framework-free HTML that does this via `connectedCallback`/`disconnectedCallback` — the
 * direct DOM analog of `DisposableEffect`.
 */

export type ConveyWeight = 'heroic' | 'primary' | 'secondary' | 'tertiary' | 'supporting'

/** The five levels in descending order — the outline `demoteConveyWeight` walks down. */
export const ConveyWeightLadder: readonly ConveyWeight[] = [
  'heroic',
  'primary',
  'secondary',
  'tertiary',
  'supporting',
] as const

/**
 * One rung down the emphasis ladder. `supporting` is the floor and demotes to itself —
 * the ladder never runs out from under an Act.
 */
export function demoteConveyWeight(weight: ConveyWeight): ConveyWeight {
  const i = ConveyWeightLadder.indexOf(weight)
  if (i < 0) return weight
  return ConveyWeightLadder[Math.min(i + 1, ConveyWeightLadder.length - 1)]!
}

/** Thrown by `ConveyWeightRegistry` when `enforce` is true and a hierarchy rule is broken. */
export class ConveyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConveyViolationError'
  }
}

/**
 * Tracks all `ConveyWeight` registrations within a scope (typically one `<convey-system>`
 * root, or one logical "surface" your app defines). Resolves the presented outline via the
 * hero-of-the-hill demotion ladder, and — when `enforce` is true — reports a second
 * `heroic` claim as a `ConveyViolationError`. Leave enforcement on in development, and
 * consider turning it off in production the same way Compose's port only enforces in debug
 * builds.
 */
export class ConveyWeightRegistry {
  private readonly registry = new Map<unknown, ConveyWeight>()
  private readonly enforce: boolean

  constructor(options: { enforce?: boolean } = {}) {
    this.enforce = options.enforce ?? true
  }

  /**
   * Registers `id` at `weight`, then validates. The registration is recorded *before*
   * validation runs — a thrown `ConveyViolationError` reports the violation, it does not
   * roll the registration back; `heroicCount` reflects the offending state too, and
   * `resolvedWeight()` already reports the demoted outline.
   *
   * When called from inside a custom element's `connectedCallback` (as `<convey-weight>`,
   * `<convey-list-item>`, and `<convey-card>` all do), a thrown error here does not
   * propagate to whatever DOM call triggered the connection (`appendChild`, `innerHTML`,
   * etc.) — the WHATWG custom elements spec requires exceptions from a reaction callback to
   * be *reported* (the DOM's own "uncaught error," visible in the console/devtools and to a
   * `window.addEventListener('error', ...)` listener) rather than thrown back at the
   * caller. This is real, standard browser behavior (verified against jsdom's own spec
   * implementation, not assumed), not a limitation specific to this registry — it's simply
   * a different delivery mechanism than Compose's crash-on-compose, not a weaker one: it
   * still fails loud, just asynchronously rather than by unwinding the call stack.
   */
  register(id: unknown, weight: ConveyWeight): void {
    this.registry.set(id, weight)
    if (this.enforce) this.validate()
  }

  unregister(id: unknown): void {
    this.registry.delete(id)
  }

  /** What the developer declared for `id`, unchanged by any conflict resolution. */
  declaredWeight(id: unknown): ConveyWeight | undefined {
    return this.registry.get(id)
  }

  /**
   * The level the current outline can actually present for `id` — the declaration itself
   * with zero or one `heroic` claim, one rung lower while the heroic slot is contested.
   */
  resolvedWeight(id: unknown): ConveyWeight | undefined {
    const declared = this.registry.get(id)
    if (declared === undefined) return undefined
    return this.heroConflict ? demoteConveyWeight(declared) : declared
  }

  /** True while two or more registrations claim `heroic` — the `HeroOfTheHill` condition. */
  get heroConflict(): boolean {
    return this.heroicCount > 1
  }

  get heroicCount(): number {
    return this.countOf('heroic')
  }

  get primaryCount(): number {
    return this.countOf('primary')
  }

  get secondaryCount(): number {
    return this.countOf('secondary')
  }

  get tertiaryCount(): number {
    return this.countOf('tertiary')
  }

  get supportingCount(): number {
    return this.countOf('supporting')
  }

  /** How many registrations *declared* `weight` (before any hero-of-the-hill demotion). */
  countOf(weight: ConveyWeight): number {
    let n = 0
    for (const w of this.registry.values()) if (w === weight) n++
    return n
  }

  private validate(): void {
    if (this.heroicCount > 1) {
      throw new ConveyViolationError(
        `CONVEY HIERARCHY VIOLATION (HeroOfTheHill): ${this.heroicCount} Heroic Acts on one surface.\n` +
          'A surface with two titles has no title. The visible outline has resolved one rung\n' +
          'lower (Heroic -> Primary -> Secondary -> Tertiary -> Supporting) until you decide\n' +
          'which Act actually owns the Heroic slot.\n' +
          "Heroic is the answer to: 'What is the single most important thing here?'",
      )
    }
  }

  snapshot(): string {
    return (
      `ConveyWeight Snapshot:\n` +
      `  Heroic:     ${this.heroicCount}  (at most 1)\n` +
      `  Primary:    ${this.primaryCount}\n` +
      `  Secondary:  ${this.secondaryCount}\n` +
      `  Tertiary:   ${this.tertiaryCount}\n` +
      `  Supporting: ${this.supportingCount}` +
      (this.heroConflict ? `\n  HeroOfTheHill: outline resolved one rung lower.` : '')
    )
  }
}

const registryOfElement = new WeakMap<Element, ConveyWeightRegistry>()

/** Associates `registry` with `root` so descendant `<convey-weight>` elements can find it. */
export function provideWeightRegistry(root: Element, registry: ConveyWeightRegistry): void {
  registryOfElement.set(root, registry)
}

/**
 * The nearest ancestor `ConveyWeightRegistry` for `el`, walking up through shadow-DOM
 * boundaries (a shadow root's `host` counts as the next ancestor). Any component that
 * needs to register *itself* — not a wrapped child — into the ambient registry (see
 * `ConveyListItem` for an example) uses this directly, the same lookup `<convey-weight>`
 * itself performs.
 */
export function nearestWeightRegistry(el: Element): ConveyWeightRegistry | undefined {
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
 *   <convey-weight weight="heroic"><button>Complete Purchase</button></convey-weight>
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
    this.#registry = nearestWeightRegistry(this)
    this.#registerCurrent()
  }

  disconnectedCallback(): void {
    this.#registry?.unregister(this)
    this.#registry = undefined
  }

  attributeChangedCallback(name: string): void {
    if (name === 'weight' && this.isConnected) this.#registerCurrent()
  }

  /** The level this element's declaration currently resolves to, or `undefined` when
   *  unregistered — the DOM-side read of `ConveyWeightRegistry.resolvedWeight()`. */
  get resolvedWeight(): ConveyWeight | undefined {
    return this.#registry?.resolvedWeight(this)
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
