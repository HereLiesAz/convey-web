import { beforeAll, describe, expect, it } from 'vitest'
import { loadConveyNounData, classify } from '../src/kinetic/noun.js'

// Spot-checks against the real generated noun-data.txt -- the exact examples convey's own
// Kotlin docs cite for animacy-root traversal and mass-noun detection.
beforeAll(async () => {
  await loadConveyNounData()
})

describe('classify against the real bundled data', () => {
  it('classifies "person" as Animate (it IS the animacy root)', () => {
    expect(classify('person')?.animacy).toBe('Animate')
  })

  it('classifies "animal" as Animate (it IS the other animacy root)', () => {
    expect(classify('animal')?.animacy).toBe('Animate')
  })

  it('classifies "dog" as Animate (reaches animal.n.01 via hypernym traversal)', () => {
    expect(classify('dog')?.animacy).toBe('Animate')
  })

  it('classifies "water" as Mass (its primary sense is a noun.substance)', () => {
    expect(classify('water')?.countability).toBe('Mass')
  })

  it('classifies "rock" primary sense as Inanimate', () => {
    expect(classify('rock')?.animacy).toBe('Inanimate')
  })

  it('returns null for an unknown word', () => {
    expect(classify('zzznotarealword')).toBeNull()
  })
})
