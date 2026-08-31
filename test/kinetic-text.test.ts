import { beforeAll, describe, expect, it } from 'vitest'
import '../src/kinetic/kinetic-text.js'
import type { ConveyKineticTextElement, ConveyKineticSentenceElement } from '../src/kinetic/kinetic-text.js'
import { loadConveyVerbData } from '../src/kinetic/verb.js'
import { ConveyLife } from '../src/life.js'

const SYNTHETIC_BLOB = [
  '##SYN',
  '00000001\t0\ttake a breath and draw air into the lungs',
  '00000002\t9\tmove quickly using the legs on a path',
  '##LEM',
  'breathe\t00000001',
  'run\t00000002',
  '##EXC',
  '##REF',
].join('\n')

beforeAll(async () => {
  await loadConveyVerbData(SYNTHETIC_BLOB)
})

describe('convey-kinetic-text', () => {
  it('renders one glyph span per character', () => {
    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', 'HI')
    document.body.appendChild(el)
    const glyphs = el.shadowRoot!.querySelectorAll('.glyph')
    expect(glyphs).toHaveLength(2)
    expect(glyphs[0]!.textContent).toBe('H')
    expect(glyphs[1]!.textContent).toBe('I')
  })

  it('re-renders when the text attribute changes', () => {
    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', 'AB')
    document.body.appendChild(el)
    el.setAttribute('text', 'XYZ')
    expect(el.shadowRoot!.querySelectorAll('.glyph')).toHaveLength(3)
  })

  it('dispatches convey-click only when clickable is set', () => {
    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', 'GO')
    el.toggleAttribute('clickable', true)
    document.body.appendChild(el)
    let clicked = false
    el.addEventListener('convey-click', () => { clicked = true })
    el.shadowRoot!.querySelector('.row')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(clicked).toBe(true)
  })

  it('setting idle re-applies life motion without throwing', () => {
    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', 'HI')
    document.body.appendChild(el)
    expect(() => { el.idle = ConveyLife.Wobble() }).not.toThrow()
  })

  it('triggerBurst does not throw', () => {
    const el = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    el.setAttribute('text', 'HI')
    document.body.appendChild(el)
    expect(() => el.triggerBurst()).not.toThrow()
  })
})

describe('convey-kinetic-sentence', () => {
  it('renders one convey-kinetic-text child per word', () => {
    const el = document.createElement('convey-kinetic-sentence') as ConveyKineticSentenceElement
    el.setAttribute('text', 'She would breathe deeply')
    document.body.appendChild(el)
    const words = el.shadowRoot!.querySelectorAll('convey-kinetic-text')
    expect(words).toHaveLength(4)
  })

  it('classifies a known verb to a non-None idle profile', () => {
    const el = document.createElement('convey-kinetic-sentence') as ConveyKineticSentenceElement
    el.setAttribute('text', 'breathe')
    document.body.appendChild(el)
    const word = el.shadowRoot!.querySelector('convey-kinetic-text') as ConveyKineticTextElement
    expect(word.idle.kind).not.toBe('none')
  })

  it('falls back to the fallback profile for an unclassifiable word', () => {
    const el = document.createElement('convey-kinetic-sentence') as ConveyKineticSentenceElement
    el.fallback = ConveyLife.Twinkle()
    el.setAttribute('text', 'zzznotarealword')
    document.body.appendChild(el)
    const word = el.shadowRoot!.querySelector('convey-kinetic-text') as ConveyKineticTextElement
    expect(word.idle.kind).toBe('twinkle')
  })
})
