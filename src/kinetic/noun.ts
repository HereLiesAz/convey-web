/**
 * Deterministic noun classification -- animacy and count/mass -- over the same WordNet data
 * and disambiguation shape as `verb.ts`. The web port of convey's `ConveyNoun.kt`.
 */

export type ConveyNounAnimacy = 'Animate' | 'Inanimate'
export type ConveyNounCountability = 'Count' | 'Mass'

export interface ConveyNounProperties {
  readonly animacy: ConveyNounAnimacy
  readonly countability: ConveyNounCountability
}

interface Synset {
  readonly animate: boolean
  readonly mass: boolean
  readonly gloss: string
}

interface ParsedData {
  readonly synsets: Map<string, Synset>
  readonly lemmaOffsets: Map<string, string[]>
  readonly exceptions: Map<string, string>
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

// Noun-specific detachment rules mirroring WordNet's morph.c, applied in this exact order.
const DETACHMENT_RULES: ReadonlyArray<readonly [string, string]> = [
  ['ies', 'y'], ['ches', 'ch'], ['shes', 'sh'], ['xes', 'x'], ['zes', 'z'], ['ses', 's'],
  ['men', 'man'], ['s', ''],
]

let dataPromise: Promise<ParsedData> | undefined
let resolvedData: ParsedData | undefined

function parse(blob: string): ParsedData {
  const synsets = new Map<string, Synset>()
  const lemmaOffsets = new Map<string, string[]>()
  const exceptions = new Map<string, string>()

  let section = 0 // 0=none, 1=SYN, 2=LEM, 3=EXC
  for (const line of blob.split('\n')) {
    if (line === '##SYN') { section = 1; continue }
    if (line === '##LEM') { section = 2; continue }
    if (line === '##EXC') { section = 3; continue }
    if (line.length === 0) continue

    if (section === 1) {
      // offset \t domainCode \t animate(0/1) \t mass(0/1) \t gloss
      const t1 = line.indexOf('\t')
      const t2 = line.indexOf('\t', t1 + 1)
      const t3 = line.indexOf('\t', t2 + 1)
      const t4 = line.indexOf('\t', t3 + 1)
      const offset = line.slice(0, t1)
      // domainCode (between t1 and t2) is parsed but unused, same as the Kotlin original
      // (kept for format symmetry with the verb pipeline; only animate/mass are consulted).
      const animate = line.slice(t2 + 1, t3) === '1'
      const mass = line.slice(t3 + 1, t4) === '1'
      const gloss = line.slice(t4 + 1)
      synsets.set(offset, { animate, mass, gloss })
    } else if (section === 2) {
      const t1 = line.indexOf('\t')
      lemmaOffsets.set(line.slice(0, t1), line.slice(t1 + 1).split(','))
    } else if (section === 3) {
      const t1 = line.indexOf('\t')
      exceptions.set(line.slice(0, t1), line.slice(t1 + 1))
    }
  }

  return { synsets, lemmaOffsets, exceptions }
}

/**
 * Loads and parses the noun data blob. Call this once (e.g. at app startup) before using
 * `classify`/`lemmatize` -- they throw if called before the data has loaded. Idempotent.
 */
export function loadConveyNounData(blob?: string): Promise<void> {
  if (dataPromise === undefined) {
    dataPromise = (async () => {
      const text = blob ?? (await import('./data/noun-data.txt?raw')).default
      const parsed = parse(text)
      resolvedData = parsed
      return parsed
    })()
  }
  return dataPromise.then(() => undefined)
}

function requireData(): ParsedData {
  if (resolvedData === undefined) {
    throw new Error('ConveyNounLexicon: call loadConveyNounData() and await it before use.')
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

function resolveOffset(lemma: string, offsets: readonly string[], context: string, data: ParsedData): string | null {
  if (offsets.length === 0) return null

  const candidates = offsets.map((o) => {
    const s = data.synsets.get(o)
    return s ? `${s.animate}:${s.mass}` : undefined
  })
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

/** Returns `null` when the word can't be lemmatized/resolved to a WordNet sense -- there is no "Unclassified" fallback for nouns, unlike verbs; the caller decides the default (see `ConveySvoScene`). */
export function classify(word: string, context = ''): ConveyNounProperties | null {
  const data = requireData()
  const lemma = lemmatize(word)
  if (lemma === null) return null
  const offsets = data.lemmaOffsets.get(lemma)
  if (offsets === undefined) return null
  const offset = resolveOffset(lemma, offsets, context, data)
  if (offset === null) return null
  const synset = data.synsets.get(offset)
  if (synset === undefined) return null
  return {
    animacy: synset.animate ? 'Animate' : 'Inanimate',
    countability: synset.mass ? 'Mass' : 'Count',
  }
}

export const ConveyNounLexicon = {
  loadData: loadConveyNounData,
  lemmatize,
  classify,
}
