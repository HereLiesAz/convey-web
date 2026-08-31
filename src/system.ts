import { ConveyGrammar } from './grammar.js'
import { ConveyWeightRegistry, provideWeightRegistry } from './weight.js'

/**
 * The convey-web system root — the web port of convey's `ConveyProvider`/`ConveySystem`.
 *
 * Activates enforcement for everything nested inside it: a `ConveyWeightRegistry` any
 * descendant `<convey-weight>` element (or a framework adapter reading `.weightRegistry`)
 * registers into, and a `ConveyGrammar` descendant components resolve motion meanings
 * against.
 *
 * ```html
 * <convey-system>
 *   <convey-weight weight="hero"><button>Send</button></convey-weight>
 * </convey-system>
 * ```
 *
 * ```ts
 * const system = document.querySelector('convey-system') as ConveySystemElement
 * system.grammar = myCustomGrammar
 * system.weightRegistry.snapshot() // for debug logging
 * ```
 *
 * Unlike Compose's `CompositionLocal`, there is no ambient "current" system outside the
 * DOM tree — a descendant looks up its nearest `<convey-system>` ancestor exactly the way
 * it looks up any other inherited context on the web (compare `closest()`).
 */
export class ConveySystemElement extends HTMLElement {
  #weightRegistry: ConveyWeightRegistry
  #grammar: ConveyGrammar

  constructor() {
    super()
    this.#weightRegistry = new ConveyWeightRegistry({
      maxPrimary: this.#intAttribute('max-primary', 3),
      enforce: this.getAttribute('enforce') !== 'false',
    })
    this.#grammar = ConveyGrammar.Default
  }

  connectedCallback(): void {
    provideWeightRegistry(this, this.#weightRegistry)
  }

  get weightRegistry(): ConveyWeightRegistry {
    return this.#weightRegistry
  }

  get grammar(): ConveyGrammar {
    return this.#grammar
  }

  set grammar(value: ConveyGrammar) {
    this.#grammar = value
  }

  #intAttribute(name: string, fallback: number): number {
    const raw = this.getAttribute(name)
    if (raw === null) return fallback
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-system')) {
  customElements.define('convey-system', ConveySystemElement)
}

/** Finds the nearest ancestor `<convey-system>`'s grammar, or `ConveyGrammar.Default` if none. */
export function grammarOf(el: Element): ConveyGrammar {
  const system = el.closest('convey-system') as ConveySystemElement | null
  return system?.grammar ?? ConveyGrammar.Default
}
