import { describe, expect, it } from 'vitest'
import { ConveyExpressiveType, step, applyExpressiveType } from '../src/tokens/expressive-type.js'

describe('ConveyExpressiveType', () => {
  it('has all fifteen M3 steps', () => {
    const keys = Object.keys(ConveyExpressiveType)
    expect(keys).toHaveLength(15)
  })

  it('matches the M3 spec value for displayLarge', () => {
    expect(ConveyExpressiveType.displayLarge).toEqual({
      fontSize: '57px',
      lineHeight: '64px',
      letterSpacing: '-0.2px',
      fontWeight: 400,
    })
  })
})

describe('step', () => {
  it('resolves a direct M3 role name', () => {
    expect(step('titleMedium')).toBe(ConveyExpressiveType.titleMedium)
  })

  it('resolves h2g2-style aliases', () => {
    expect(step('hero')).toBe(ConveyExpressiveType.displayMedium)
    expect(step('section')).toBe(ConveyExpressiveType.headlineLarge)
    expect(step('lead')).toBe(ConveyExpressiveType.titleLarge)
    expect(step('capsule')).toBe(ConveyExpressiveType.titleSmall)
    expect(step('eyebrow')).toBe(ConveyExpressiveType.labelLarge)
    expect(step('endCap')).toBe(ConveyExpressiveType.labelMedium)
    expect(step('micro')).toBe(ConveyExpressiveType.labelSmall)
  })

  it('falls back to bodyMedium for an unrecognized name', () => {
    expect(step('notARealStepName')).toBe(ConveyExpressiveType.bodyMedium)
  })
})

describe('applyExpressiveType', () => {
  it('sets the element style from a text style', () => {
    const el = document.createElement('span')
    applyExpressiveType(el, ConveyExpressiveType.titleLarge)
    expect(el.style.fontSize).toBe('22px')
    expect(el.style.lineHeight).toBe('28px')
    expect(el.style.letterSpacing).toBe('0px')
    expect(el.style.fontWeight).toBe('400')
  })
})
