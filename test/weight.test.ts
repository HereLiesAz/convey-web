import { describe, expect, it } from 'vitest'
import {
  ConveyViolationError,
  ConveyWeightLadder,
  ConveyWeightRegistry,
  demoteConveyWeight,
} from '../src/weight.js'

describe('demoteConveyWeight', () => {
  it('walks one rung down the canonical five-level outline', () => {
    expect(demoteConveyWeight('heroic')).toBe('primary')
    expect(demoteConveyWeight('primary')).toBe('secondary')
    expect(demoteConveyWeight('secondary')).toBe('tertiary')
    expect(demoteConveyWeight('tertiary')).toBe('supporting')
  })

  it('floors at supporting', () => {
    expect(demoteConveyWeight('supporting')).toBe('supporting')
  })

  it('has exactly the five levels Appendix B names, in order', () => {
    expect([...ConveyWeightLadder]).toEqual([
      'heroic',
      'primary',
      'secondary',
      'tertiary',
      'supporting',
    ])
  })
})

describe('ConveyWeightRegistry', () => {
  it('allows exactly one heroic', () => {
    const registry = new ConveyWeightRegistry()
    expect(() => registry.register('a', 'heroic')).not.toThrow()
    expect(registry.heroicCount).toBe(1)
    expect(registry.heroConflict).toBe(false)
  })

  it('throws when a second heroic registers -- the one retained singularity', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'heroic')
    expect(() => registry.register('b', 'heroic')).toThrow(ConveyViolationError)
    expect(() => registry.register('c', 'heroic')).toThrow(/HeroOfTheHill/)
  })

  it('imposes no quota on primary -- excess primaries never throw', () => {
    const registry = new ConveyWeightRegistry()
    for (let i = 0; i < 50; i++) {
      expect(() => registry.register(`p${i}`, 'primary')).not.toThrow()
    }
    expect(registry.primaryCount).toBe(50)
  })

  it('keeps every declared level while the heroic slot is uncontested', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'heroic')
    registry.register('b', 'primary')
    registry.register('c', 'supporting')
    expect(registry.resolvedWeight('a')).toBe('heroic')
    expect(registry.resolvedWeight('b')).toBe('primary')
    expect(registry.resolvedWeight('c')).toBe('supporting')
  })

  it('resolves the whole outline one rung lower on a hero-of-the-hill conflict', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'heroic')
    registry.register('b', 'heroic')
    registry.register('c', 'primary')
    registry.register('d', 'secondary')
    registry.register('e', 'tertiary')
    registry.register('f', 'supporting')

    expect(registry.heroConflict).toBe(true)
    expect(registry.resolvedWeight('a')).toBe('primary')
    expect(registry.resolvedWeight('b')).toBe('primary')
    expect(registry.resolvedWeight('c')).toBe('secondary')
    expect(registry.resolvedWeight('d')).toBe('tertiary')
    expect(registry.resolvedWeight('e')).toBe('supporting')
    expect(registry.resolvedWeight('f')).toBe('supporting')
  })

  it('never rewrites the declaration itself', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'heroic')
    registry.register('b', 'heroic')
    expect(registry.declaredWeight('a')).toBe('heroic')
    expect(registry.declaredWeight('b')).toBe('heroic')
  })

  it('resolves back up once the conflict is removed', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'heroic')
    registry.register('b', 'heroic')
    registry.register('c', 'primary')
    expect(registry.resolvedWeight('c')).toBe('secondary')
    registry.unregister('b')
    expect(registry.resolvedWeight('c')).toBe('primary')
    expect(registry.resolvedWeight('a')).toBe('heroic')
  })

  it('reports undefined for an unregistered id', () => {
    const registry = new ConveyWeightRegistry()
    expect(registry.declaredWeight('nope')).toBeUndefined()
    expect(registry.resolvedWeight('nope')).toBeUndefined()
  })

  it('does not enforce when enforce is false', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'heroic')
    expect(() => registry.register('b', 'heroic')).not.toThrow()
    expect(registry.heroicCount).toBe(2)
  })

  it('unregister frees the slot for a new heroic', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'heroic')
    registry.unregister('a')
    expect(() => registry.register('b', 'heroic')).not.toThrow()
  })

  it('every level below heroic is unlimited', () => {
    const registry = new ConveyWeightRegistry()
    for (let i = 0; i < 50; i++) {
      registry.register(`s${i}`, 'secondary')
      registry.register(`t${i}`, 'tertiary')
      registry.register(`u${i}`, 'supporting')
    }
    expect(registry.secondaryCount).toBe(50)
    expect(registry.tertiaryCount).toBe(50)
    expect(registry.supportingCount).toBe(50)
  })

  it('snapshot reports the five levels and the only remaining limit', () => {
    const registry = new ConveyWeightRegistry()
    registry.register('a', 'heroic')
    registry.register('b', 'primary')
    registry.register('c', 'tertiary')
    const snap = registry.snapshot()
    expect(snap).toContain('Heroic:     1  (at most 1)')
    expect(snap).toContain('Primary:    1')
    expect(snap).toContain('Tertiary:   1')
    expect(snap).toContain('Supporting: 0')
    expect(snap).not.toContain('max 3')
    expect(snap).not.toContain('HeroOfTheHill')
  })

  it('snapshot flags an active hero-of-the-hill conflict', () => {
    const registry = new ConveyWeightRegistry({ enforce: false })
    registry.register('a', 'heroic')
    registry.register('b', 'heroic')
    expect(registry.snapshot()).toContain('HeroOfTheHill')
  })
})
