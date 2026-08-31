import { beforeAll, describe, expect, it } from 'vitest'
import { loadConveyVerbData, classify, lemmatize, topographicalCategory, toEventTimeline, toConveyLife } from '../src/kinetic/verb.js'

// A small synthetic blob in the same ##SYN/##LEM/##EXC/##REF format the real generated data
// uses (see src/kinetic/data/README.md) -- fast and deterministic, rather than loading the
// real ~1.5MB verb-data.txt for every unit test. See kinetic-verb-real-data.test.ts for
// spot-checks against the actual bundled data.
const SYNTHETIC_BLOB = [
  '##SYN',
  '00000001\t0\ttake a breath and draw air into the lungs',
  '00000002\t3\tspeak to another person using words',
  '00000003\t9\tmove quickly using the legs on a path',
  '00000004\t9\tmove upward using hands and feet to climb higher',
  '##LEM',
  'breathe\t00000001',
  'talk\t00000002,00000003',
  'climb\t00000004',
  '##EXC',
  'breathed\tbreathe',
  '##REF',
  '00000001\t2',
].join('\n')

beforeAll(async () => {
  await loadConveyVerbData(SYNTHETIC_BLOB)
})

describe('lemmatize', () => {
  it('returns a word that is already a known lemma unchanged', () => {
    expect(lemmatize('breathe')).toBe('breathe')
  })

  it('resolves an irregular exception form', () => {
    expect(lemmatize('breathed')).toBe('breathe')
  })

  it('resolves via WordNet-style suffix detachment', () => {
    expect(lemmatize('talking')).toBe('talk')
    expect(lemmatize('talks')).toBe('talk')
  })

  it('returns null for a word with no known lemma', () => {
    expect(lemmatize('zzznotaword')).toBeNull()
  })
})

describe('classify', () => {
  it('applies a VerbNet refinement override over the WordNet domain', () => {
    // offset 1's WordNet domain is Body, but ##REF overrides it to SubtleBody (code 2).
    expect(classify('breathe')).toBe('SubtleBody')
  })

  it('classifies through an irregular exception form the same as the base lemma', () => {
    expect(classify('breathed')).toBe('SubtleBody')
  })

  it('returns Unclassified for an unknown word', () => {
    expect(classify('zzznotaword')).toBe('Unclassified')
  })

  it('falls back to the primary (first-listed) sense with no context', () => {
    expect(classify('talk')).toBe('Communication')
  })

  it('disambiguates via Simplified Lesk gloss overlap when context is given', () => {
    expect(classify('talk', 'He would run quickly using his legs down the path')).toBe('Motion')
    expect(classify('talk', 'He likes to speak using words with his friend')).toBe('Communication')
  })
})

describe('topographicalCategory', () => {
  it('finds a marker word in the resolved sense\'s gloss', () => {
    expect(topographicalCategory('climb')).toBe('Ascent')
  })

  it('returns null when no marker word is present', () => {
    expect(topographicalCategory('breathe')).toBeNull()
  })
})

describe('toEventTimeline', () => {
  it('Contact-family classes approach and end in contact', () => {
    expect(toEventTimeline('Contact')).toEqual({ approaches: true, contactAtEnd: true, continuousNoContact: false, possessionTransfer: false })
    expect(toEventTimeline('Punctual')).toEqual({ approaches: true, contactAtEnd: true, continuousNoContact: false, possessionTransfer: false })
  })

  it('Motion-family classes approach continuously without contact', () => {
    expect(toEventTimeline('Motion')).toEqual({ approaches: true, contactAtEnd: false, continuousNoContact: true, possessionTransfer: false })
    expect(toEventTimeline('PurePath')).toEqual({ approaches: true, contactAtEnd: false, continuousNoContact: true, possessionTransfer: false })
  })

  it('Possession sets possessionTransfer', () => {
    expect(toEventTimeline('Possession')).toEqual({ approaches: true, contactAtEnd: true, continuousNoContact: false, possessionTransfer: true })
  })

  it('non-spatial classes never approach', () => {
    expect(toEventTimeline('Emotion').approaches).toBe(false)
    expect(toEventTimeline('Unclassified').approaches).toBe(false)
  })
})

describe('toConveyLife', () => {
  it('Contact/Possession/Stative/PurePath/Punctual/Scalar/Unclassified map to None', () => {
    for (const cls of ['Contact', 'Possession', 'Stative', 'PurePath', 'Punctual', 'Scalar', 'Unclassified'] as const) {
      expect(toConveyLife(cls)).toEqual({ kind: 'none' })
    }
  })

  it('Body maps to a Wobble profile', () => {
    expect(toConveyLife('Body')).toMatchObject({ kind: 'wobble', period: 1800 })
  })

  it('Cognition maps to a Twinkle profile', () => {
    expect(toConveyLife('Cognition')).toMatchObject({ kind: 'twinkle', period: 3200 })
  })
})
