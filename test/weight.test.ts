import { describe, expect, it } from 'vitest'
import { ConveyViolationError, ConveyWeightRegistry } from '../src/weight.js'

describe('ConveyWeightRegistry', () => {
  it('allows exactly one hero', () => {
    const registry = new ConveyWeightRegistry()
    expect(() => registry.register('a', 'hero')).not.toThrow()
    expect(registry.heroCount).toBe(1)
  })

  it('throws when a second hero registers', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'hero')
    expect(() => registry.register('b', 'hero')).toThrow(ConveyViolationError)
  })

  it('allows up to maxPrimary primaries, throws past it', () => {
    const registry = new ConveyWeightRegistry({ maxPrimary: 2 })
    registry.register('a', 'primary')
    registry.register('b', 'primary')
    expect(() => registry.register('c', 'primary')).toThrow(ConveyViolationError)
  })

  it('does not enforce when enforce is false', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'hero')
    expect(() => registry.register('b', 'hero')).not.toThrow()
    expect(registry.heroCount).toBe(2)
  })

  it('unregister frees the slot for a new hero', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'hero')
    registry.unregister('a')
    expect(() => registry.register('b', 'hero')).not.toThrow()
  })

  it('secondary and ghost are unlimited', () => {
    const registry = new ConveyWeightRegistry()
    for (let i = 0; i < 50; i++) {
      registry.register(`s${i}`, 'secondary')
      registry.register(`g${i}`, 'ghost')
    }
    expect(registry.secondaryCount).toBe(50)
    expect(registry.ghostCount).toBe(50)
  })

  it('snapshot reports counts against the configured limits', () => {
    const registry = new ConveyWeightRegistry({ maxPrimary: 5 })
    registry.register('a', 'hero')
    registry.register('b', 'primary')
    const snap = registry.snapshot()
    expect(snap).toContain('Hero:      1  (max 1)')
    expect(snap).toContain('Primary:   1  (max 5)')
  })
})
