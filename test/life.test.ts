import { describe, expect, it } from 'vitest'
import { applyConveyLife, ConveyLife, triggerConveyLifeBurst } from '../src/life.js'

describe('applyConveyLife', () => {
  it('None is a no-op whose stop() does not throw', () => {
    const el = document.createElement('div')
    const handle = applyConveyLife(el, ConveyLife.None)
    expect(() => handle.stop()).not.toThrow()
  })

  it('enabled: false is a no-op regardless of profile', () => {
    const el = document.createElement('div')
    const handle = applyConveyLife(el, ConveyLife.Breathe(), { enabled: false })
    expect(() => handle.stop()).not.toThrow()
  })

  it('breathe does not throw and stop() clears the transform', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = applyConveyLife(el, ConveyLife.Breathe({ period: 1000 }))
    handle.stop()
    expect(el.style.transform).toBe('')
    expect(el.style.opacity).toBe('')
  })

  it('twinkle does not throw', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => applyConveyLife(el, ConveyLife.Twinkle())).not.toThrow()
  })

  it('wobble does not throw', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => applyConveyLife(el, ConveyLife.Wobble())).not.toThrow()
  })

  it('accepts a phaseOffsetMs without throwing', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => applyConveyLife(el, ConveyLife.Breathe({ period: 1000 }), { phaseOffsetMs: 500 })).not.toThrow()
  })
})

describe('triggerConveyLifeBurst', () => {
  it('does not throw when called on a fresh element', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => triggerConveyLifeBurst(el)).not.toThrow()
  })

  it('does not throw with custom options', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => triggerConveyLifeBurst(el, { peakScale: 1.5, meaning: 'confirm' })).not.toThrow()
  })
})
