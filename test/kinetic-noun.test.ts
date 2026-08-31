import { beforeAll, describe, expect, it } from 'vitest'
import { loadConveyNounData, classify, lemmatize } from '../src/kinetic/noun.js'

const SYNTHETIC_BLOB = [
  '##SYN',
  '00000001\t18\t1\t0\ta human being who does things',
  '00000002\t27\t0\t1\ta clear liquid substance used for drinking',
  '00000003\t17\t0\t0\tan inanimate object with a fixed shape',
  '##LEM',
  'person\t00000001',
  'water\t00000002',
  'rock\t00000003',
  '##EXC',
  'people\tperson',
].join('\n')

beforeAll(async () => {
  await loadConveyNounData(SYNTHETIC_BLOB)
})

describe('lemmatize', () => {
  it('returns a known lemma unchanged', () => {
    expect(lemmatize('water')).toBe('water')
  })

  it('resolves an irregular exception form', () => {
    expect(lemmatize('people')).toBe('person')
  })

  it('resolves via noun suffix detachment (plural s)', () => {
    expect(lemmatize('rocks')).toBe('rock')
  })

  it('returns null for an unknown word', () => {
    expect(lemmatize('zzznotaword')).toBeNull()
  })
})

describe('classify', () => {
  it('classifies a person as Animate/Count', () => {
    expect(classify('person')).toEqual({ animacy: 'Animate', countability: 'Count' })
  })

  it('classifies water as Inanimate/Mass', () => {
    expect(classify('water')).toEqual({ animacy: 'Inanimate', countability: 'Mass' })
  })

  it('classifies a rock as Inanimate/Count', () => {
    expect(classify('rock')).toEqual({ animacy: 'Inanimate', countability: 'Count' })
  })

  it('returns null for an unknown word (no Unclassified fallback for nouns)', () => {
    expect(classify('zzznotaword')).toBeNull()
  })

  it('classifies through an irregular exception form the same as the base lemma', () => {
    expect(classify('people')).toEqual({ animacy: 'Animate', countability: 'Count' })
  })
})
