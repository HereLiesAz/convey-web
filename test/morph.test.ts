import { describe, expect, it } from 'vitest'
import { ConveyMorphController } from '../src/morph.js'
import { ConveyShape } from '../src/tokens/shape.js'

describe('ConveyMorphController', () => {
  it('applies the first shape immediately (no prior shape to morph from)', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ shape: ConveyShape.Medium })
    expect(el.style.borderRadius).toBe(ConveyShape.Medium.borderRadius)
  })

  it('morphs between two border-radius shapes via border-radius', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ shape: ConveyShape.Small })
    morph.morphTo({ shape: ConveyShape.Circle })
    // jsdom has no WAAPI, so safeAnimate's fallback applies the target keyframe directly.
    expect(el.style.borderRadius).toBe(ConveyShape.Circle.borderRadius)
    expect(el.style.clipPath).toBe('')
  })

  it('cuts directly to the target when morphing between a border-radius and a clip-path shape', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ shape: ConveyShape.Medium })
    morph.morphTo({ shape: ConveyShape.Cut })
    expect(el.style.clipPath).toBe(ConveyShape.Cut.clipPath)
  })

  it('morphs between two same-point-count clip-path shapes via clip-path', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ shape: ConveyShape.Cut })
    morph.morphTo({ shape: ConveyShape.CutSmall })
    expect(el.style.clipPath).toBe(ConveyShape.CutSmall.clipPath)
    expect(el.style.borderRadius).toBe('')
  })

  it('animates background-color when color is given', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ color: 'rgb(255, 0, 0)' })
    expect(el.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('animates color when contentColor is given', () => {
    const el = document.createElement('div')
    const morph = new ConveyMorphController(el)
    morph.morphTo({ contentColor: 'rgb(0, 255, 0)' })
    expect(el.style.color).toBe('rgb(0, 255, 0)')
  })

  it('does not touch shape/color when they are not given', () => {
    const el = document.createElement('div')
    el.style.backgroundColor = 'rgb(1, 2, 3)'
    const morph = new ConveyMorphController(el)
    morph.morphTo({ contentColor: 'rgb(0, 255, 0)' })
    expect(el.style.backgroundColor).toBe('rgb(1, 2, 3)')
  })
})
