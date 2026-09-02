import { beforeAll, describe, expect, it } from 'vitest'
import { ConveyBodyClassifier } from '../src/kinetic/body.js'
import { classify as classifyVerb, loadConveyVerbData, toConveyLife } from '../src/kinetic/verb.js'
import { loadConveyNounData } from '../src/kinetic/noun.js'
import { ConveyLife } from '../src/life.js'

beforeAll(async () => {
  await Promise.all([loadConveyVerbData(), loadConveyNounData()])
})

describe('ConveyBodyClassifier.verbWeightDelta', () => {
  it('is positive for forceful physical classes', () => {
    expect(ConveyBodyClassifier.verbWeightDelta('Competition')).toBeGreaterThan(0)
    expect(ConveyBodyClassifier.verbWeightDelta('Contact')).toBeGreaterThan(0)
    expect(ConveyBodyClassifier.verbWeightDelta('MannerAgent')).toBeGreaterThan(0)
  })

  it('is negative for mental or stative classes', () => {
    expect(ConveyBodyClassifier.verbWeightDelta('Cognition')).toBeLessThan(0)
    expect(ConveyBodyClassifier.verbWeightDelta('Stative')).toBeLessThan(0)
    expect(ConveyBodyClassifier.verbWeightDelta('Possession')).toBeLessThan(0)
  })

  it('is neutral for everything else', () => {
    expect(ConveyBodyClassifier.verbWeightDelta('Communication')).toBe(0)
    expect(ConveyBodyClassifier.verbWeightDelta('Emotion')).toBe(0)
    expect(ConveyBodyClassifier.verbWeightDelta('Unclassified')).toBe(0)
  })
})

describe('ConveyBodyClassifier.nounWeightDelta', () => {
  it('adds for animacy and subtracts for mass', () => {
    expect(ConveyBodyClassifier.nounWeightDelta('Inanimate', 'Count')).toBe(0)
    expect(ConveyBodyClassifier.nounWeightDelta('Animate', 'Count')).toBeGreaterThan(0)
    expect(ConveyBodyClassifier.nounWeightDelta('Inanimate', 'Mass')).toBeLessThan(0)
  })

  it('combines both buckets additively', () => {
    const animateOnly = ConveyBodyClassifier.nounWeightDelta('Animate', 'Count')
    const massOnly = ConveyBodyClassifier.nounWeightDelta('Inanimate', 'Mass')
    const both = ConveyBodyClassifier.nounWeightDelta('Animate', 'Mass')
    expect(both).toBe(animateOnly + massOnly)
  })
})

describe('ConveyBodyClassifier.classifyWord against real bundled data', () => {
  it('resolves a real verb consistently with verbWeightDelta and toConveyLife', () => {
    const context = 'The cheetah sprints across the plain'
    const word = 'sprints'
    const verbClass = classifyVerb(word, context)
    expect(verbClass).not.toBe('Unclassified')

    const result = ConveyBodyClassifier.classifyWord(word, context)
    expect(result.weight).toBe(ConveyBodyClassifier.BASE_WEIGHT + ConveyBodyClassifier.verbWeightDelta(verbClass))
    expect(result.idle).toEqual(toConveyLife(verbClass))
  })

  it('resolves a real noun with no verb sense to weight-only, no motion', () => {
    // "cheetah" has no WordNet verb entry, so classifyWord falls through to the noun lexicon --
    // confirmed animate, count in the noun-lexicon real-data tests already.
    const result = ConveyBodyClassifier.classifyWord('cheetah', 'The cheetah ran across the plain')
    expect(result.idle).toEqual(ConveyLife.None)
    expect(result.weight).toBe(ConveyBodyClassifier.BASE_WEIGHT + ConveyBodyClassifier.nounWeightDelta('Animate', 'Count'))
  })

  it('falls back to base weight and no motion for an unrecognized token', () => {
    const result = ConveyBodyClassifier.classifyWord('xyzzy123', 'xyzzy123 is not a word')
    expect(result.weight).toBe(ConveyBodyClassifier.BASE_WEIGHT)
    expect(result.idle).toEqual(ConveyLife.None)
  })
})
