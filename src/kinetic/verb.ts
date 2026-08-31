import { ConveyLife, type ConveyLifeProfile } from '../life.js'

/**
 * Deterministic verb classification over real Princeton WordNet 3.0 + VerbNet 3.3 data
 * (Simplified Lesk word-sense disambiguation included) -- the web port of convey's
 * `ConveyVerb.kt`. See `../../AGENTS.md` and `data/README.md` for how the underlying data
 * (`data/verb-data.txt`) was generated, and `THIRD_PARTY_NOTICES.md` for its license.
 */

/** WordNet lexicographer-domain tier (15 cases) plus the VerbNet-refinement tier (7 more), plus a catch-all. Order matters -- it is the array index the compiled data format encodes. */
export type ConveyVerbClass =
  | 'Body' | 'Change' | 'Cognition' | 'Communication' | 'Competition' | 'Consumption' | 'Contact'
  | 'Creation' | 'Emotion' | 'Motion' | 'Perception' | 'Possession' | 'Social' | 'Stative' | 'Weather'
  | 'PurePath' | 'MannerAgent' | 'SubtleBody' | 'StateMetaphor' | 'Punctual' | 'Scalar'
  | 'Unclassified'

const VERB_DOMAINS: readonly ConveyVerbClass[] = [
  'Body', 'Change', 'Cognition', 'Communication', 'Competition', 'Consumption', 'Contact',
  'Creation', 'Emotion', 'Motion', 'Perception', 'Possession', 'Social', 'Stative', 'Weather',
]

/** Must match the generator's `REFINEMENTS` array order exactly -- the data format encodes this as an index. */
const REFINEMENT_BY_CODE: readonly ConveyVerbClass[] = [
  'PurePath', 'MannerAgent', 'SubtleBody', 'StateMetaphor', 'Contact', 'Punctual', 'Scalar',
  'Emotion', 'Perception',
]

export type ConveyTopographicalCategory = 'Descent' | 'Ascent' | 'Scatter' | 'Encircle'

const TOPOGRAPHICAL_MARKERS: Readonly<Record<ConveyTopographicalCategory, readonly string[]>> = {
  Descent: ['downward', 'descend', 'descending', 'descent', 'fall', 'falling', 'drop', 'sink', 'plunge'],
  Ascent: ['upward', 'ascend', 'ascending', 'ascent', 'rise', 'rising', 'climb', 'climbing', 'soar', 'mount', 'mounting'],
  Scatter: ['scatter', 'scattered', 'scattering', 'disperse', 'dispersed', 'dispersing', 'spread', 'spreading'],
  Encircle: ['circle', 'encircle', 'surround', 'surrounding', 'orbit', 'orbiting', 'encompass', 'encompassing'],
}

/**
 * The physical-event booleans a verb's classification reduces to -- what `ConveySvoScene`'s
 * force simulator drives its subject/object animation from.
 */
export interface ConveyVerbEventTimeline {
  /** Subject should translate toward object. False for verbs with no spatial component (those get idle motion only). */
  readonly approaches: boolean
  /** Translation should terminate in a collision, triggering squash-and-stretch on the object. */
  readonly contactAtEnd: boolean
  /** Motion holds throughout but no contact ever fires (locomotion verbs). Mutually exclusive with `contactAtEnd`. */
  readonly continuousNoContact: boolean
  /** Approximation for the Possession class -- giving and taking collapse to the same predicate. Read by nothing yet. */
  readonly possessionTransfer: boolean
}

const EVENT_TIMELINE_BY_CLASS: Readonly<Record<ConveyVerbClass, ConveyVerbEventTimeline>> = (() => {
  const contact: ConveyVerbEventTimeline = { approaches: true, contactAtEnd: true, continuousNoContact: false, possessionTransfer: false }
  const motion: ConveyVerbEventTimeline = { approaches: true, contactAtEnd: false, continuousNoContact: true, possessionTransfer: false }
  const possession: ConveyVerbEventTimeline = { approaches: true, contactAtEnd: true, continuousNoContact: false, possessionTransfer: true }
  const none: ConveyVerbEventTimeline = { approaches: false, contactAtEnd: false, continuousNoContact: false, possessionTransfer: false }
  return {
    Contact: contact, Punctual: contact, Competition: contact,
    Motion: motion, PurePath: motion, MannerAgent: motion, SubtleBody: motion,
    Possession: possession,
    Consumption: contact, Creation: contact, Change: contact, StateMetaphor: contact, Scalar: contact,
    Body: none, Cognition: none, Communication: none, Emotion: none, Perception: none, Social: none,
    Stative: none, Weather: none, Unclassified: none,
  }
})()

export function toEventTimeline(verbClass: ConveyVerbClass): ConveyVerbEventTimeline {
  return EVENT_TIMELINE_BY_CLASS[verbClass]
}

const LIFE_BY_CLASS: Readonly<Record<ConveyVerbClass, () => ConveyLifeProfile>> = {
  Body: () => ConveyLife.Wobble({ period: 1800, skewDegrees: 2.5 }),
  Change: () => ConveyLife.Breathe({ period: 4000, peakScale: 1.05 }),
  Cognition: () => ConveyLife.Twinkle({ period: 3200, minOpacity: 0.65 }),
  Communication: () => ConveyLife.Twinkle({ period: 1800 }),
  Competition: () => ConveyLife.Wobble({ period: 700, skewDegrees: 4 }),
  Consumption: () => ConveyLife.Breathe({ period: 2200, peakScale: 1.1 }),
  Contact: () => ConveyLife.None,
  Creation: () => ConveyLife.Breathe({ period: 3400, peakScale: 1.15 }),
  Emotion: () => ConveyLife.Breathe({ period: 3000, peakScale: 1.05, minOpacity: 0.88 }),
  Motion: () => ConveyLife.Wobble({ period: 2000, skewDegrees: 3 }),
  Perception: () => ConveyLife.Twinkle({ period: 1200, minOpacity: 0.7 }),
  Possession: () => ConveyLife.None,
  Social: () => ConveyLife.Wobble({ period: 2400, skewDegrees: 2 }),
  Stative: () => ConveyLife.None,
  Weather: () => ConveyLife.Twinkle({ period: 2600, minOpacity: 0.55 }),
  // Spatial-path classes: handled via a whole-line entry transform (see ConveyKineticSentence), not idle motion.
  PurePath: () => ConveyLife.None,
  MannerAgent: () => ConveyLife.Wobble({ period: 1400, skewDegrees: 5 }),
  SubtleBody: () => ConveyLife.Wobble({ period: 340, skewDegrees: 1.5 }),
  StateMetaphor: () => ConveyLife.Breathe({ period: 3200, peakScale: 1.06 }),
  // One-shot event class: belongs on a burst trigger, not idle motion.
  Punctual: () => ConveyLife.None,
  Scalar: () => ConveyLife.None,
  Unclassified: () => ConveyLife.None,
}

export function toConveyLife(verbClass: ConveyVerbClass): ConveyLifeProfile {
  return LIFE_BY_CLASS[verbClass]()
}

// ── Lexicon: parsing + lemmatization + Simplified Lesk WSD ──────────────────────────────

interface Synset {
  readonly domain: ConveyVerbClass
  readonly gloss: string
}

interface ParsedData {
  readonly synsets: Map<string, Synset>
  readonly lemmaOffsets: Map<string, string[]>
  readonly exceptions: Map<string, string>
  readonly offsetOverride: Map<string, ConveyVerbClass>
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'by', 'as', 'it', 'its', 'that', 'this', 'from', 'into', 'than',
  'then', 'so', 'not', 'no', 'do', 'does', 'did', 'has', 'have', 'had',
])

const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/g

function tokenize(text: string, exclude: ReadonlySet<string>): string[] {
  const matches = text.toLowerCase().match(WORD_PATTERN) ?? []
  return matches.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !exclude.has(w))
}

// Detachment rules mirroring WordNet's own verb morphology (morph.c), applied in this exact order.
const DETACHMENT_RULES: ReadonlyArray<readonly [string, string]> = [
  ['ies', 'y'], ['es', 'e'], ['es', ''], ['ed', 'e'], ['ed', ''], ['ing', 'e'], ['ing', ''], ['s', ''],
]

let dataPromise: Promise<ParsedData> | undefined
let resolvedData: ParsedData | undefined

function parse(blob: string): ParsedData {
  const synsets = new Map<string, Synset>()
  const lemmaOffsets = new Map<string, string[]>()
  const exceptions = new Map<string, string>()
  const offsetOverride = new Map<string, ConveyVerbClass>()

  let section = 0 // 0=none, 1=SYN, 2=LEM, 3=EXC, 4=REF
  for (const line of blob.split('\n')) {
    if (line === '##SYN') { section = 1; continue }
    if (line === '##LEM') { section = 2; continue }
    if (line === '##EXC') { section = 3; continue }
    if (line === '##REF') { section = 4; continue }
    if (line.length === 0) continue

    if (section === 1) {
      const t1 = line.indexOf('\t')
      const t2 = line.indexOf('\t', t1 + 1)
      const offset = line.slice(0, t1)
      const domainIndex = Number.parseInt(line.slice(t1 + 1, t2), 10)
      const gloss = line.slice(t2 + 1)
      const domain = VERB_DOMAINS[domainIndex]
      if (domain !== undefined) synsets.set(offset, { domain, gloss })
    } else if (section === 2) {
      const t1 = line.indexOf('\t')
      const lemma = line.slice(0, t1)
      const offsets = line.slice(t1 + 1).split(',')
      lemmaOffsets.set(lemma, offsets)
    } else if (section === 3) {
      const t1 = line.indexOf('\t')
      exceptions.set(line.slice(0, t1), line.slice(t1 + 1))
    } else if (section === 4) {
      const t1 = line.indexOf('\t')
      const offset = line.slice(0, t1)
      const code = Number.parseInt(line.slice(t1 + 1), 10)
      const refinement = REFINEMENT_BY_CODE[code]
      if (refinement !== undefined) offsetOverride.set(offset, refinement)
    }
  }

  return { synsets, lemmaOffsets, exceptions, offsetOverride }
}

/**
 * Loads and parses the verb data blob. Call this once (e.g. at app startup) before using
 * `classify`/`lemmatize`/`topographicalCategory` -- they throw if called before the data has
 * loaded. Idempotent: subsequent calls return the same in-flight/resolved promise.
 *
 * Not eagerly loaded at module-evaluation time, unlike the Kotlin original's lazy-but-
 * synchronous `by lazy` (which can afford to block since the data is compiled into the
 * binary) -- the web port's data is a separate ~1.5MB fetched/bundled asset, so loading it
 * is asynchronous by construction.
 */
export function loadConveyVerbData(blob?: string): Promise<void> {
  if (dataPromise === undefined) {
    dataPromise = (async () => {
      const text = blob ?? (await import('./data/verb-data.txt?raw')).default
      const parsed = parse(text)
      resolvedData = parsed
      return parsed
    })()
  }
  return dataPromise.then(() => undefined)
}

function requireData(): ParsedData {
  if (resolvedData === undefined) {
    throw new Error('ConveyVerbLexicon: call loadConveyVerbData() and await it before use.')
  }
  return resolvedData
}

export function lemmatize(word: string): string | null {
  const data = requireData()
  const lower = word.toLowerCase()
  if (data.lemmaOffsets.has(lower)) return lower

  const exception = data.exceptions.get(lower)
  if (exception !== undefined && data.lemmaOffsets.has(exception)) return exception

  for (const [suffix, replacement] of DETACHMENT_RULES) {
    if (lower.length > suffix.length + 1 && lower.endsWith(suffix)) {
      const candidate = lower.slice(0, lower.length - suffix.length) + replacement
      if (data.lemmaOffsets.has(candidate)) return candidate
    }
  }
  return null
}

function selfForms(lemma: string, data: ParsedData): Set<string> {
  const forms = new Set<string>()
  for (const [suffix, replacement] of DETACHMENT_RULES) {
    if (replacement.length === 0 || lemma.endsWith(replacement)) {
      forms.add(lemma.slice(0, lemma.length - replacement.length) + suffix)
    }
  }
  for (const [inflected, base] of data.exceptions) {
    if (base === lemma) forms.add(inflected)
  }
  return forms
}

function classifyOffset(offset: string, data: ParsedData): ConveyVerbClass {
  return data.offsetOverride.get(offset) ?? data.synsets.get(offset)?.domain ?? 'Unclassified'
}

function resolveOffset(lemma: string, offsets: readonly string[], context: string, data: ParsedData): string | null {
  if (offsets.length === 0) return null

  const candidates = offsets.map((o) => classifyOffset(o, data))
  if (new Set(candidates).size === 1) return offsets[0]!

  if (context.trim() === '') return offsets[0]!

  const exclude = selfForms(lemma, data)
  exclude.add(lemma)
  const contextTokens = new Set(tokenize(context, exclude))
  if (contextTokens.size === 0) return offsets[0]!

  let bestIndex = 0
  let bestScore = -1
  offsets.forEach((offset, i) => {
    const gloss = data.synsets.get(offset)?.gloss ?? ''
    const glossTokens = tokenize(gloss, exclude)
    const score = glossTokens.filter((t) => contextTokens.has(t)).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  })
  return offsets[bestIndex]!
}

export function classify(word: string, context = ''): ConveyVerbClass {
  const data = requireData()
  const lemma = lemmatize(word)
  if (lemma === null) return 'Unclassified'
  const offsets = data.lemmaOffsets.get(lemma)
  if (offsets === undefined) return 'Unclassified'
  const offset = resolveOffset(lemma, offsets, context, data)
  if (offset === null) return 'Unclassified'
  return classifyOffset(offset, data)
}

export function topographicalCategory(word: string, context = ''): ConveyTopographicalCategory | null {
  const data = requireData()
  const lemma = lemmatize(word)
  if (lemma === null) return null
  const offsets = data.lemmaOffsets.get(lemma)
  if (offsets === undefined) return null
  const offset = resolveOffset(lemma, offsets, context, data)
  if (offset === null) return null
  const gloss = data.synsets.get(offset)?.gloss ?? ''
  const glossTokens = new Set(tokenize(gloss, new Set()))
  for (const category of Object.keys(TOPOGRAPHICAL_MARKERS) as ConveyTopographicalCategory[]) {
    if (TOPOGRAPHICAL_MARKERS[category].some((marker) => glossTokens.has(marker))) return category
  }
  return null
}

export function isDescent(word: string, context = ''): boolean {
  return topographicalCategory(word, context) === 'Descent'
}

export const ConveyVerbLexicon = {
  loadData: loadConveyVerbData,
  lemmatize,
  classify,
  topographicalCategory,
  isDescent,
}
