import { beforeAll, describe, expect, it } from 'vitest'
import { loadConveyVerbData, classify } from '../src/kinetic/verb.js'

// Spot-checks against the real generated verb-data.txt (see src/kinetic/data/README.md for
// how it was produced and why these specific cases were chosen: they're the exact examples
// convey's own Kotlin docs cite for its ConveyVerbLexicon, so a match here is a strong signal
// this reconstructed generator produces output faithful to the Kotlin original's behavior.
beforeAll(async () => {
  await loadConveyVerbData()
})

describe('classify against the real bundled data', () => {
  it('classifies "breathe" as SubtleBody via the VerbNet breathe-40.1.2 refinement (its plain WordNet domain is Body, but VerbNet\'s own breathe class overrides it)', () => {
    expect(classify('breathe')).toBe('SubtleBody')
  })

  it('classifies "run" (primary locomotion sense) as MannerAgent via the VerbNet run-51.3 refinement', () => {
    expect(classify('run')).toBe('MannerAgent')
  })

  it('classifies an unknown word as Unclassified', () => {
    expect(classify('zzznotarealword')).toBe('Unclassified')
  })
})
