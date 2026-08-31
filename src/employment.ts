import { ConveyViolationError } from './weight.js'

/**
 * The jobs an element can do, per Part IV ("Channel Economy") of the Conveyance Manifesto
 * framework spec — the web port of convey's `ConveyJob`.
 */
export type ConveyJob =
  | 'invite'
  | 'locate'
  | 'progress'
  | 'report'
  | 'identify'
  | 'group'
  | 'separate'
  | 'warn'
  | 'confirm'
  | 'navigate'
  | 'interrupt'

/**
 * Employment — Law 4: "Every element does at least four jobs. Elements with fewer get merged;
 * elements with none get deleted." The web port of convey's `ConveyEmploymentRegistry`.
 *
 * This is resourceful minimalism made checkable, the same way `ConveyWeightRegistry` makes
 * hierarchy checkable. Jobs are enumerable (`ConveyJob`) and every declared element names at
 * least the registry's minimum, or is honestly `ambient` instead of padded to fit.
 *
 * `invite`, `progress`, and `interrupt` travel together in spirit for an element that offers
 * an act — see `<convey-offer>`, which already carries all three for you — but registering
 * jobs never infers them: a job the registry credits without the code behind it existing is
 * exactly the failure this law exists to catch, not a shortcut past declaring it.
 *
 * An element that honestly can't carry the minimum may be declared `ambient` instead —
 * deliberately exempt rather than padded — and the exemption is budgeted per surface (see
 * `ambientBudget`) so it cannot quietly become the norm.
 */
export class ConveyEmploymentRegistry {
  private readonly registry = new Map<unknown, { jobs: ReadonlySet<ConveyJob>; ambient: boolean }>()
  private readonly minimumJobs: number
  readonly ambientBudget: number
  private readonly enforce: boolean

  constructor(options: { minimumJobs?: number; ambientBudget?: number; enforce?: boolean } = {}) {
    this.minimumJobs = options.minimumJobs ?? 4
    this.ambientBudget = options.ambientBudget ?? 3
    this.enforce = options.enforce ?? true
  }

  /**
   * See `ConveyWeightRegistry.register()`'s doc for the same caveat: the registration is
   * recorded before validation runs, and a thrown error is *reported*, not propagated, when
   * called from a custom element's `connectedCallback`.
   */
  register(id: unknown, jobs: ReadonlySet<ConveyJob>, ambient = false): void {
    this.registry.set(id, { jobs, ambient })
    if (this.enforce) this.validate(jobs, ambient)
  }

  unregister(id: unknown): void {
    this.registry.delete(id)
  }

  /** Elements declared job-under-resourced (fewer than the minimum, and not ambient). */
  get underEmployedCount(): number {
    let n = 0
    for (const entry of this.registry.values()) {
      if (!entry.ambient && entry.jobs.size < this.minimumJobs) n++
    }
    return n
  }

  /** Elements declared ambient — deliberately exempt from the minimum. */
  get ambientCount(): number {
    let n = 0
    for (const entry of this.registry.values()) if (entry.ambient) n++
    return n
  }

  private validate(jobs: ReadonlySet<ConveyJob>, ambient: boolean): void {
    if (ambient) {
      if (this.ambientCount > this.ambientBudget) {
        throw new ConveyViolationError(
          `CONVEY EMPLOYMENT VIOLATION: ${this.ambientCount} Ambient elements (budget ${this.ambientBudget}).\n` +
            'Ambient is an exemption, not a default. If most elements need it, the budget is wrong ' +
            'for this surface -- raise it deliberately in the ConveyEmploymentRegistry, don\'t let it drift.',
        )
      }
      return
    }
    if (jobs.size < this.minimumJobs) {
      throw new ConveyViolationError(
        `CONVEY EMPLOYMENT VIOLATION: element declares only ${jobs.size} job(s) (min ${this.minimumJobs}): ${[...jobs].join(', ')}.\n` +
          `Below ${this.minimumJobs} means merge this with its neighbor. Zero means delete it.\n` +
          "If it honestly can't carry the minimum, register with ambient = true instead of padding the list.",
      )
    }
  }

  snapshot(): string {
    return (
      `ConveyEmployment Snapshot:\n` +
      `  Under-employed: ${this.underEmployedCount}  (min ${this.minimumJobs} jobs)\n` +
      `  Ambient:        ${this.ambientCount}  (budget ${this.ambientBudget})`
    )
  }
}

const registryOfElement = new WeakMap<Element, ConveyEmploymentRegistry>()

/** Associates `registry` with `root` so descendant `<convey-employment>` elements can find it. */
export function provideEmploymentRegistry(root: Element, registry: ConveyEmploymentRegistry): void {
  registryOfElement.set(root, registry)
}

/**
 * The nearest ancestor `ConveyEmploymentRegistry` for `el`, walking up through shadow-DOM
 * boundaries, or `undefined` if none was provided. Unlike `ConveyWeightRegistry`,
 * `<convey-system>` does not provide one of these by default (matching the Kotlin original's
 * own documented asymmetry — `LocalConveyEmploymentRegistry` has no non-default value from
 * `ConveySystem` either): reading with nothing provided always falls back to a fresh,
 * per-element, *unshared* registry, the same as `staticCompositionLocalOf { ConveyEmploymentRegistry() }`
 * handing every unprovided reader its own default instance rather than one they all share.
 */
export function nearestEmploymentRegistry(el: Element): ConveyEmploymentRegistry | undefined {
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
 * <convey-employment jobs="invite,progress,confirm,interrupt">
 *   <button>Submit</button>
 * </convey-employment>
 *
 * <convey-employment ambient><hr /></convey-employment>
 * ```
 * An autonomous wrapper, the same shape as `<convey-weight>`. Self-registers into the nearest
 * ancestor registry (or a fresh, unshared one — see `nearestEmploymentRegistry`) on
 * `connectedCallback`, unregisters on `disconnectedCallback`.
 */
export class ConveyEmploymentElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['jobs', 'ambient']
  }

  #registry: ConveyEmploymentRegistry | undefined

  connectedCallback(): void {
    this.#registry = nearestEmploymentRegistry(this) ?? new ConveyEmploymentRegistry()
    this.#registerCurrent()
  }

  disconnectedCallback(): void {
    this.#registry?.unregister(this)
    this.#registry = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#registerCurrent()
  }

  #jobs(): Set<ConveyJob> {
    const raw = this.getAttribute('jobs')
    if (raw === null) return new Set()
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ConveyJob => s.length > 0) as ConveyJob[],
    )
  }

  #registerCurrent(): void {
    this.#registry?.register(this, this.#jobs(), this.hasAttribute('ambient'))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-employment')) {
  customElements.define('convey-employment', ConveyEmploymentElement)
}
