import { beforeAll, describe, expect, it } from 'vitest'
import '../src/kinetic/svo-scene.js'
import type { ConveySvoSceneElement } from '../src/kinetic/svo-scene.js'
import { parseSvoHeuristic } from '../src/kinetic/svo-scene.js'
import { loadConveyVerbData } from '../src/kinetic/verb.js'
import { loadConveyNounData } from '../src/kinetic/noun.js'

const VERB_BLOB = [
  '##SYN',
  '00000001\t6\tcatch up to and touch another that is fleeing',
  '00000002\t8\tfeel a strong sensation without moving toward anything',
  '##LEM',
  'chase\t00000001',
  'love\t00000002',
  '##EXC',
  '##REF',
].join('\n')

const NOUN_BLOB = [
  '##SYN',
  '00000001\t18\t1\t0\tan animal that runs on four legs',
  '00000002\t18\t1\t0\tanother animal that runs on four legs',
  '##LEM',
  'cheetah\t00000001',
  'gazelle\t00000002',
  '##EXC',
].join('\n')

beforeAll(async () => {
  await loadConveyVerbData(VERB_BLOB)
  await loadConveyNounData(NOUN_BLOB)
})

describe('parseSvoHeuristic', () => {
  it('returns null for fewer than 3 words', () => {
    expect(parseSvoHeuristic('cheetah chase')).toBeNull()
  })

  it('finds the classified verb and head-final subject/object', () => {
    expect(parseSvoHeuristic('The cheetah chased the gazelle')).toEqual({
      subject: 'cheetah',
      verb: 'chased',
      obj: 'gazelle',
    })
  })

  it('strips leading/trailing punctuation from each token', () => {
    const parts = parseSvoHeuristic('The cheetah chased the gazelle.')
    expect(parts?.obj).toBe('gazelle')
  })

  it('falls back to assuming the second word is the verb when nothing classifies', () => {
    // "big" and "fox" are not in our synthetic verb lexicon, so no word classifies --
    // falls back to verbIndex = 1 ("dog").
    const parts = parseSvoHeuristic('big dog small fox')
    expect(parts).toEqual({ subject: 'big', verb: 'dog', obj: 'fox' })
  })

  it('a real three-word sentence with a classified verb still splits successfully', () => {
    expect(parseSvoHeuristic('cheetah chased gazelle')).not.toBeNull()
  })
})

describe('convey-svo-scene', () => {
  it('renders a fallback convey-kinetic-sentence when the sentence cannot be split', () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'hi')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('convey-kinetic-sentence')).not.toBeNull()
  })

  it('renders subject/verb/object kinetic-text elements for a spatial verb', () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'The cheetah chased the gazelle')
    document.body.appendChild(el)
    const box = el.shadowRoot!.querySelector('.box')!
    expect(box.querySelector('.subject')).not.toBeNull()
    expect(box.querySelector('.object')).not.toBeNull()
    expect(box.querySelector('.verb')).not.toBeNull()
  })

  it('falls back to kinetic-sentence for a non-spatial verb (approaches === false)', () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'The cheetah loved the gazelle')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('convey-kinetic-sentence')).not.toBeNull()
  })

  it('applies a transform to the subject after a couple of animation frames', async () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'The cheetah chased the gazelle')
    document.body.appendChild(el)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const subject = el.shadowRoot!.querySelector('.subject') as HTMLElement
    expect(subject.style.transform).not.toBe('')
  })

  it('does not throw when the sentence changes after connection', () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'The cheetah chased the gazelle')
    document.body.appendChild(el)
    expect(() => el.setAttribute('sentence', 'The gazelle chased the cheetah')).not.toThrow()
  })

  it('cleans up its animation loop on disconnect without throwing', () => {
    const el = document.createElement('convey-svo-scene') as ConveySvoSceneElement
    el.setAttribute('sentence', 'The cheetah chased the gazelle')
    document.body.appendChild(el)
    expect(() => el.remove()).not.toThrow()
  })
})
