import { applyConveyLife, triggerConveyLifeBurst, ConveyLife, type ConveyLifeProfile } from '../life.js'
import { ConveyGrammar } from '../grammar.js'
import { classify as classifyVerb, toConveyLife } from './verb.js'

/**
 * Per-glyph kinetic text -- the web port of convey's `ConveyKineticText`. Every other element
 * in this library carries the grammar; type is the one exception most UI treats as inert
 * content. This closes that gap: each character gets its own continuous idle motion
 * (`ConveyLife`), phase-offset by its index so a word's letters move as a colony, not one
 * puppet -- the same "animate the parts, not the container" argument the rest of this
 * library makes structurally.
 *
 * ```html
 * <convey-kinetic-text text="KINETIC" stagger-ms="90"></convey-kinetic-text>
 * <script>
 *   const el = document.querySelector('convey-kinetic-text')
 *   el.idle = ConveyLife.Wobble({ period: 4500 })
 *   el.addEventListener('click', () => el.triggerBurst())
 * </script>
 * ```
 *
 * `idle` (a `ConveyLifeProfile`) and `grammar` are JS properties, not attributes -- neither
 * can be expressed as an attribute string. `triggerBurst()` plays `burst-meaning` across all
 * glyphs, staggered by `stagger-ms` (a wave passing left to right) -- the imperative
 * equivalent of the Kotlin original's `triggerKey`-change detection, since there's no
 * composition lifecycle here to hook a key comparison into.
 */
export class ConveyKineticTextElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['text', 'stagger-ms', 'burst-meaning', 'peak-burst-scale', 'clickable']
  }

  #shadow: ShadowRoot
  #row: HTMLElement
  #idle: ConveyLifeProfile = ConveyLife.None
  #grammar: ConveyGrammar = ConveyGrammar.Default
  #lifeHandles: { stop(): void }[] = []

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .row { display: inline-flex; }
        .row[data-clickable="true"] { cursor: pointer; }
        .glyph { display: inline-block; white-space: pre; }
      </style>
      <div class="row" part="row"><slot></slot></div>
    `
    this.#row = this.#shadow.querySelector('.row')!
    this.#row.addEventListener('click', () => {
      if (this.hasAttribute('clickable')) this.dispatchEvent(new CustomEvent('convey-click'))
    })
  }

  connectedCallback(): void {
    this.#render()
  }

  disconnectedCallback(): void {
    this.#stopLife()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'clickable') {
      this.#row.dataset.clickable = String(this.hasAttribute('clickable'))
      return
    }
    this.#render()
  }

  get idle(): ConveyLifeProfile {
    return this.#idle
  }

  set idle(value: ConveyLifeProfile) {
    this.#idle = value
    if (this.isConnected) this.#render()
  }

  get grammar(): ConveyGrammar {
    return this.#grammar
  }

  set grammar(value: ConveyGrammar) {
    this.#grammar = value
  }

  #staggerMs(): number {
    const raw = this.getAttribute('stagger-ms')
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 90
  }

  #text(): string {
    return this.getAttribute('text') ?? ''
  }

  #stopLife(): void {
    for (const handle of this.#lifeHandles) handle.stop()
    this.#lifeHandles = []
  }

  #render(): void {
    this.#stopLife()
    this.#row.innerHTML = ''
    this.#row.dataset.clickable = String(this.hasAttribute('clickable'))
    const staggerMs = this.#staggerMs()
    const text = this.#text()

    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span')
      span.className = 'glyph'
      span.textContent = text[i]!
      this.#row.appendChild(span)
      this.#lifeHandles.push(applyConveyLife(span, this.#idle, { phaseOffsetMs: i * staggerMs }))
    }
  }

  /** Plays a burst across all glyphs, staggered left-to-right by `stagger-ms`. */
  triggerBurst(): void {
    const staggerMs = this.#staggerMs()
    const burstMeaning = this.getAttribute('burst-meaning') ?? 'delight'
    const peakScaleRaw = this.getAttribute('peak-burst-scale')
    const peakScale = peakScaleRaw === null ? 1.4 : Number.parseFloat(peakScaleRaw)
    const glyphs = Array.from(this.#row.querySelectorAll<HTMLElement>('.glyph'))
    glyphs.forEach((glyph, i) => {
      setTimeout(() => {
        triggerConveyLifeBurst(glyph, { meaning: burstMeaning, peakScale, grammar: this.#grammar })
      }, i * staggerMs)
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-kinetic-text')) {
  customElements.define('convey-kinetic-text', ConveyKineticTextElement)
}

/**
 * Per-word motion driven by verb classification -- the web port of convey's
 * `ConveyKineticSentence`. Each word is classified independently via `ConveyVerbLexicon`
 * (the whole sentence is passed as WSD context for every word); its `ConveyVerbClass` maps
 * to a `ConveyLife` idle profile via `toConveyLife()`, and each word renders as its own
 * `<convey-kinetic-text>` (so within-word glyph stagger still applies).
 *
 * Requires `ConveyVerbLexicon`'s data to be loaded first (`loadConveyVerbData()`/
 * `ConveyVerbLexicon.loadData()`) -- renders every word as `fallback` (default
 * `ConveyLife.None`) until it resolves, then re-renders with real classifications.
 *
 * Deliberately does not implement syntactic coercion: every word classifies from its own
 * WordNet/VerbNet senses in isolation via context-word-overlap only -- there is no parser
 * to detect a caused-motion construction overriding a verb's ordinary sense, same
 * limitation as the Kotlin original.
 */
export class ConveyKineticSentenceElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['text', 'stagger-ms', 'word-spacing']
  }

  #shadow: ShadowRoot
  #row: HTMLElement
  #grammar: ConveyGrammar = ConveyGrammar.Default
  #fallback: ConveyLifeProfile = ConveyLife.None

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .row { display: flex; flex-wrap: wrap; align-items: baseline; }
      </style>
      <div class="row" part="row"></div>
    `
    this.#row = this.#shadow.querySelector('.row')!
  }

  connectedCallback(): void {
    this.#render()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'text' && this.isConnected) this.#render()
    else if (this.isConnected) this.#applyGeometry()
  }

  get grammar(): ConveyGrammar {
    return this.#grammar
  }

  set grammar(value: ConveyGrammar) {
    this.#grammar = value
  }

  get fallback(): ConveyLifeProfile {
    return this.#fallback
  }

  set fallback(value: ConveyLifeProfile) {
    this.#fallback = value
    if (this.isConnected) this.#render()
  }

  #wordSpacing(): string {
    return this.getAttribute('word-spacing') ?? '6px'
  }

  #staggerMs(): string {
    return this.getAttribute('stagger-ms') ?? '90'
  }

  #applyGeometry(): void {
    this.#row.style.gap = this.#wordSpacing()
  }

  #render(): void {
    this.#applyGeometry()
    const text = this.getAttribute('text') ?? ''
    const words = text.split(/\s+/).filter((w) => w.length > 0)
    this.#row.innerHTML = ''

    for (const word of words) {
      const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
      el.setAttribute('text', word)
      el.setAttribute('stagger-ms', this.#staggerMs())
      el.grammar = this.#grammar
      // classify() throws if the lexicon data hasn't loaded yet -- fall back silently rather
      // than crash a render that fires before the caller's loadConveyVerbData() resolves.
      try {
        const verbClass = classifyVerb(word, text)
        el.idle = verbClass === 'Unclassified' ? this.#fallback : toConveyLife(verbClass)
      } catch {
        el.idle = this.#fallback
      }
      this.#row.appendChild(el)
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-kinetic-sentence')) {
  customElements.define('convey-kinetic-sentence', ConveyKineticSentenceElement)
}
