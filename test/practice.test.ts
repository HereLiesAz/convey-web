import { describe, expect, it } from 'vitest'
import { ConveyPracticeRegistry, conveyPracticeDecay, decayed } from '../src/practice.js'

describe('ConveyPracticeRegistry', () => {
  it('starts every key at zero operations', () => {
    const registry = new ConveyPracticeRegistry()
    expect(registry.operationCount('a')).toBe(0)
  })

  it('recordOperation increments the count', () => {
    const registry = new ConveyPracticeRegistry()
    registry.recordOperation('a')
    registry.recordOperation('a')
    expect(registry.operationCount('a')).toBe(2)
  })

  it('tracks separate keys independently', () => {
    const registry = new ConveyPracticeRegistry()
    registry.recordOperation('a')
    expect(registry.operationCount('b')).toBe(0)
  })

  it('seed sets the count directly', () => {
    const registry = new ConveyPracticeRegistry()
    registry.seed('a', 12)
    expect(registry.operationCount('a')).toBe(12)
  })
})

describe('conveyPracticeDecay', () => {
  it('is 1 at zero operations (full ceremony)', () => {
    expect(conveyPracticeDecay(0)).toBeCloseTo(1, 5)
  })

  it('is exactly halfway to floor at halfLife operations', () => {
    const floor = 0.4
    const halfLife = 5
    const value = conveyPracticeDecay(halfLife, floor, halfLife)
    expect(value).toBeCloseTo(floor + (1 - floor) * 0.5, 5)
  })

  it('approaches floor as operations grow large', () => {
    expect(conveyPracticeDecay(1000, 0.4, 5)).toBeCloseTo(0.4, 3)
  })

  it('throws for a floor outside 0..1', () => {
    expect(() => conveyPracticeDecay(1, 1.5)).toThrow(/floor must be in 0..1/)
    expect(() => conveyPracticeDecay(1, -0.1)).toThrow(/floor must be in 0..1/)
  })

  it('throws for a non-positive halfLife', () => {
    expect(() => conveyPracticeDecay(1, 0.4, 0)).toThrow(/halfLife must be positive/)
  })
})

describe('decayed', () => {
  it('shortens a tween proportionally to decay', () => {
    const spec = decayed({ kind: 'tween', durationMillis: 200, easing: 'linear' }, 0.5)
    expect(spec).toEqual({ kind: 'tween', durationMillis: 100, easing: 'linear' })
  })

  it('never shortens a tween below minDurationMillis', () => {
    const spec = decayed({ kind: 'tween', durationMillis: 200, easing: 'linear' }, 0.1, 80)
    expect(spec).toEqual({ kind: 'tween', durationMillis: 80, easing: 'linear' })
  })

  it('stiffens a spring proportionally to decay', () => {
    const spec = decayed({ kind: 'spring', stiffness: 380, dampingRatio: 0.8 }, 0.5)
    expect(spec).toEqual({ kind: 'spring', stiffness: 760, dampingRatio: 0.8 })
  })

  it('never stiffens a spring above maxStiffness', () => {
    const spec = decayed({ kind: 'spring', stiffness: 380, dampingRatio: 0.8 }, 0.01, 80, 1000)
    expect(spec).toEqual({ kind: 'spring', stiffness: 1000, dampingRatio: 0.8 })
  })

  it('leaves a snap unchanged -- no ceremony to remove', () => {
    const spec = decayed({ kind: 'snap' }, 0.1)
    expect(spec).toEqual({ kind: 'snap' })
  })

  it('decay = 1 leaves a tween/spring unchanged', () => {
    expect(decayed({ kind: 'tween', durationMillis: 200, easing: 'linear' }, 1)).toEqual({
      kind: 'tween',
      durationMillis: 200,
      easing: 'linear',
    })
    expect(decayed({ kind: 'spring', stiffness: 380, dampingRatio: 0.8 }, 1)).toEqual({
      kind: 'spring',
      stiffness: 380,
      dampingRatio: 0.8,
    })
  })
})
