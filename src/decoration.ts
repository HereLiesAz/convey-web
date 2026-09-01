import { ConveyPracticeRegistry } from './practice.js'

/**
 * The Decoration channel — Part IV §4.2 of the Conveyance Manifesto ("Text as an Act"): any
 * span of text that **is** an Act, rather than merely describing one, carries a persistent
 * visual marker distinguishing it from the static text around it. Plain text never borrows
 * Decoration for emphasis — the moment it did, the signal would stop meaning "you can act on
 * this."
 *
 * `<convey-act-text>` is that persistent marker (a literal `text-decoration: underline`) *plus*
 * the taught half: an unpracticed instance performs one Tell-scale burst through the existing
 * kinetic-typography engine (`<convey-kinetic-text>`, from the separate opt-in
 * `@hereliesaz/convey-web/kinetic` entry point) shortly after first appearing, exactly once —
 * §4.2 is explicit this is one signal in two registers, not two separate mechanisms, and that
 * the taught half draws on the vocabulary already in the framework rather than a bespoke
 * gesture. `<convey-kinetic-text>` is created via `document.createElement` (never statically
 * imported), the same bundle-boundary pattern `<convey-design>`/`<convey-svo-scene>` already
 * use — if the kinetic entry point hasn't been loaded, this degrades to a plain underlined
 * `<span>` with no burst rather than throwing.
 *
 * A `ConveyPracticeRegistry` (own instance by default, or shared via the `registry` property)
 * remembers "already taught": once a real click has been recorded for this instance's key, the
 * burst never fires again.
 *
 * ```html
 * <convey-act-text text="terms of service"></convey-act-text>
 * <script>
 *   document.querySelector('convey-act-text').addEventListener('convey-click', () => openTerms())
 * </script>
 * ```
 */
export class ConveyActTextElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['text']
  }

  #shadow: ShadowRoot
  #host: HTMLElement
  #registry: ConveyPracticeRegistry = new ConveyPracticeRegistry()

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .marker { text-decoration: underline; cursor: pointer; }
      </style>
      <span class="marker" part="marker"></span>
    `
    this.#host = this.#shadow.querySelector('.marker')!
  }

  connectedCallback(): void {
    this.#render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render()
  }

  get registry(): ConveyPracticeRegistry {
    return this.#registry
  }
  set registry(value: ConveyPracticeRegistry) {
    this.#registry = value
    if (this.isConnected) this.#render()
  }

  #key(): unknown {
    return this.getAttribute('text') ?? this.textContent ?? this
  }

  #render(): void {
    const text = this.getAttribute('text') ?? this.textContent ?? ''
    this.#host.innerHTML = ''

    const tagName = 'convey-kinetic-text'
    const isRegistered = typeof customElements !== 'undefined' && customElements.get(tagName) !== undefined
    const alreadyTaught = this.#registry.operationCount(this.#key()) > 0

    const el: HTMLElement = isRegistered ? document.createElement(tagName) : document.createElement('span')
    if (isRegistered) {
      el.setAttribute('text', text)
      el.setAttribute('burst-meaning', 'confirm')
      if (!alreadyTaught) {
        setTimeout(() => {
          const burst = (el as unknown as { triggerBurst?: () => void }).triggerBurst
          burst?.call(el)
        }, TELL_DELAY_MS)
      }
    } else {
      el.textContent = text
    }

    el.addEventListener('click', () => {
      this.#registry.recordOperation(this.#key())
      this.dispatchEvent(new CustomEvent('convey-click'))
    })

    this.#host.appendChild(el)
  }
}

const TELL_DELAY_MS = 400

if (typeof customElements !== 'undefined' && !customElements.get('convey-act-text')) {
  customElements.define('convey-act-text', ConveyActTextElement)
}
