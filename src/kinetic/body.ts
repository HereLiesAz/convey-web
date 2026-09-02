import { classify as classifyVerb, loadConveyVerbData, toConveyLife } from './verb.js'
import type { ConveyVerbClass } from './verb.js'
import { classify as classifyNoun, loadConveyNounData } from './noun.js'
import type { ConveyNounAnimacy, ConveyNounCountability } from './noun.js'
import { ConveyKineticTextElement } from './kinetic-text.js'
import { ConveyLife, type ConveyLifeProfile } from '../life.js'
import { ConveyScrollParallaxController, type ConveyParallaxDirection } from '../scroll-parallax.js'
import { ConveyType, fontVariationSettings } from '../tokens/type.js'
import { ConveyColor } from '../tokens/color.js'

/**
 * `ConveyDesign`'s (Part XI) sibling for body-level prose — Part XII of the Conveyance
 * Manifesto, "The Body Block" (`docs/CONVEYANCE-FRAMEWORK.md` in `HereLiesAz/Conveyance`). The
 * web port of convey's `ConveyBody`/`ConveyBodyClassifier`.
 *
 * `<convey-body>` never chooses a paragraph's semantic role or touches its place in the
 * accessibility tree — it is strictly additive. Unlike `<convey-design>`'s per-line `motion`
 * (offered, never assumed — manifesto §4.2), every effect here applies to everything inside the
 * block, uniformly: prose read at length that sometimes moves and sometimes doesn't reads as
 * broken in a way an occasional heading does not.
 *
 * **Bundle placement, unlike `<convey-design>`:** `ConveyDesign`'s motion is optional, so it
 * lives in the main bundle and only opportunistically uses `<convey-kinetic-text>` if that
 * separate entry point happens to be loaded. `CONVEY BODY`'s classification is mandatory to its
 * defining feature (§12.2-§12.4) — there is no meaningful `ConveyBody` without it — so this
 * component lives in the `kinetic/` entry point itself rather than the main bundle. It calls
 * `loadConveyVerbData()`/`loadConveyNounData()` itself on first connect (idempotent, safe to
 * call alongside any other caller) and renders with plain, unclassified text (base weight, no
 * motion) until both resolve, then re-renders with full classification — progressive
 * enhancement, never a blocking requirement on the caller.
 *
 * **One classification, two outputs (§12.2).** [ConveyBodyClassifier] runs the same verb/noun
 * classification already built for kinetic typography (`classifyVerb`/`classifyNoun`) once per
 * word, and that single result drives both the emotive motion (§12.3, via the existing
 * `toConveyLife` mapping `<convey-kinetic-sentence>` already uses) and a fluid font weight
 * (§12.4) — no longer fixed per semantic level the way `ConveyDesign`'s `title`/`body` weights
 * are.
 *
 * **Mandatory scroll-linked entrance (§12.5).** `<convey-body>` owns its own scroll container
 * (an internal `overflow-y: auto` viewport — set a CSS height on `<convey-body>` itself for it
 * to have room to scroll) rather than reading an externally supplied scroll state, using
 * `ConveyScrollParallaxController` (`../scroll-parallax.ts`) to drive every line's entrance,
 * direction keyed to role: `paragraph` enters horizontally, `quote` vertically.
 */
export type ConveyBodyRole = 'paragraph' | 'quote'

const ROLE_DIRECTION: Record<ConveyBodyRole, ConveyParallaxDirection> = {
  paragraph: 'horizontal',
  quote: 'vertical',
}

export interface ConveyBodyLine {
  text: string
  role?: ConveyBodyRole
}

export interface ConveyBodyWordClassification {
  word: string
  idle: ConveyLifeProfile
  weight: number
}

const HEAVY_VERB_CLASSES = new Set<ConveyVerbClass>([
  'Competition', 'MannerAgent', 'Contact', 'Punctual', 'Body', 'SubtleBody', 'Motion',
])
const LIGHT_VERB_CLASSES = new Set<ConveyVerbClass>([
  'Cognition', 'Perception', 'Possession', 'Stative', 'PurePath', 'Scalar',
])

/**
 * The one classification pass §12.2 describes, and the pure weight-delta math it spends on
 * §12.4's fluid weight — mirrors `convey`'s own `ConveyBodyClassifier.kt` exactly, so the two
 * platforms agree on the same weight-delta buckets even though the underlying lexicon calls are
 * async on this platform and synchronous there.
 */
export const ConveyBodyClassifier = {
  BASE_WEIGHT: 400,

  /**
   * Heavy: classes describing forceful, physical, or competitive action. Light: classes
   * describing mental/perceptual states or possession with no physical force behind it.
   * Everything else stays at `BASE_WEIGHT` — a deliberate, documented judgment call in three
   * buckets rather than 22 individually tuned deltas, in the same spirit as
   * `ConveyDesignSolver.inkScore`'s own ratio-tool framing.
   */
  verbWeightDelta(verbClass: ConveyVerbClass): number {
    if (HEAVY_VERB_CLASSES.has(verbClass)) return 150
    if (LIGHT_VERB_CLASSES.has(verbClass)) return -100
    return 0
  },

  /** An animate noun reads slightly heavier than an inanimate one; a mass noun slightly lighter than a count noun. Additive, so both can apply. */
  nounWeightDelta(animacy: ConveyNounAnimacy, countability: ConveyNounCountability): number {
    let delta = 0
    if (animacy === 'Animate') delta += 50
    if (countability === 'Mass') delta += -50
    return delta
  },

  /**
   * Classifies one word against `context` (its whole containing line). A word that resolves as
   * a verb drives both outputs from its `ConveyVerbClass`; failing that, a word that resolves as
   * a noun drives weight alone (nouns carry no motion mapping); anything neither lexicon can
   * place renders still, at `BASE_WEIGHT`.
   */
  classifyWord(word: string, context: string): ConveyBodyWordClassification {
    const verbClass = classifyVerb(word, context)
    if (verbClass !== 'Unclassified') {
      return { word, idle: toConveyLife(verbClass), weight: ConveyBodyClassifier.BASE_WEIGHT + ConveyBodyClassifier.verbWeightDelta(verbClass) }
    }

    const nounProps = classifyNoun(word, context)
    if (nounProps) {
      return {
        word,
        idle: ConveyLife.None,
        weight: ConveyBodyClassifier.BASE_WEIGHT + ConveyBodyClassifier.nounWeightDelta(nounProps.animacy, nounProps.countability),
      }
    }

    return { word, idle: ConveyLife.None, weight: ConveyBodyClassifier.BASE_WEIGHT }
  },
}

let dataReadyPromise: Promise<void> | undefined

function ensureDataLoaded(): Promise<void> {
  if (dataReadyPromise === undefined) {
    dataReadyPromise = Promise.all([loadConveyVerbData(), loadConveyNounData()]).then(() => undefined)
  }
  return dataReadyPromise
}

export class ConveyBodyElement extends HTMLElement {
  #shadow: ShadowRoot
  #viewport: HTMLElement
  #column: HTMLElement
  #lines: ConveyBodyLine[] = []
  #color: string = ConveyColor.OnSurface
  #baseSizeSp = 16
  #parallaxDistancePx = 48
  #entranceZoneFraction = 0.5
  #parallax: ConveyScrollParallaxController | undefined
  #unregisterFns: Array<() => void> = []
  #classified = false

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        .viewport { height: 100%; overflow-y: auto; }
        .column { display: flex; flex-direction: column; gap: 12px; }
        .row { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
      </style>
      <div class="viewport" part="viewport">
        <div class="column" part="column"></div>
      </div>
    `
    this.#viewport = this.#shadow.querySelector('.viewport')!
    this.#column = this.#shadow.querySelector('.column')!
  }

  connectedCallback(): void {
    this.#parallax = new ConveyScrollParallaxController(this.#viewport, this.#entranceZoneFraction)
    this.#render()
    ensureDataLoaded().then(() => {
      this.#classified = true
      if (this.isConnected) this.#render()
    })
  }

  disconnectedCallback(): void {
    this.#parallax?.destroy()
    this.#parallax = undefined
    this.#unregisterFns = []
  }

  get lines(): ConveyBodyLine[] {
    return this.#lines
  }
  set lines(value: ConveyBodyLine[]) {
    this.#lines = value
    if (this.isConnected) this.#render()
  }

  get color(): string {
    return this.#color
  }
  set color(value: string) {
    this.#color = value
    if (this.isConnected) this.#render()
  }

  get baseSizeSp(): number {
    return this.#baseSizeSp
  }
  set baseSizeSp(value: number) {
    this.#baseSizeSp = value
    if (this.isConnected) this.#render()
  }

  get parallaxDistancePx(): number {
    return this.#parallaxDistancePx
  }
  set parallaxDistancePx(value: number) {
    this.#parallaxDistancePx = value
    if (this.isConnected) this.#render()
  }

  #render(): void {
    for (const unregister of this.#unregisterFns) unregister()
    this.#unregisterFns = []
    this.#column.innerHTML = ''

    for (const line of this.#lines) {
      const role: ConveyBodyRole = line.role ?? 'paragraph'
      const row = document.createElement('div')
      row.className = 'row'

      const words = line.text.split(/\s+/).filter((w) => w.length > 0)
      for (const word of words) {
        const el = this.#createWordElement(word, line.text)
        row.appendChild(el)
      }

      this.#column.appendChild(row)
      const unregister = this.#parallax!.register({ element: row, direction: ROLE_DIRECTION[role], distancePx: this.#parallaxDistancePx })
      this.#unregisterFns.push(unregister)
    }

    this.#parallax?.recompute()
  }

  #createWordElement(word: string, context: string): HTMLElement {
    const classification = this.#classified
      ? ConveyBodyClassifier.classifyWord(word, context)
      : { word, idle: ConveyLife.None, weight: ConveyBodyClassifier.BASE_WEIGHT }

    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', word)
    el.idle = classification.idle
    el.style.color = this.#color
    el.style.fontSize = `${this.#baseSizeSp}px`
    el.style.fontFamily = `'${ConveyType.FontFamily}'`
    ;(el.style as CSSStyleDeclaration & { fontVariationSettings: string }).fontVariationSettings = fontVariationSettings({ Weight: classification.weight })
    return el
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-body')) {
  customElements.define('convey-body', ConveyBodyElement)
}
