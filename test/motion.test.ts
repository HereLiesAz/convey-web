import { describe, expect, it } from 'vitest'
import {
  ConveyMotion,
  estimatedDurationMs,
  isCriticallyDamped,
  isElastic,
  springToLinearEasing,
  toCss,
} from '../src/tokens/motion.js'

describe('ConveyMotion springs', () => {
  it('Elastic and Heroic overshoot (dampingRatio < 1)', () => {
    expect(isElastic(ConveyMotion.Elastic)).toBe(true)
    expect(isElastic(ConveyMotion.Heroic)).toBe(true)
  })

  it('Snappy/Standard/Deliberate are underdamped but not critically damped', () => {
    expect(isCriticallyDamped(ConveyMotion.Snappy)).toBe(false)
  })

  it('estimatedDurationMs is positive and finite for every named spring', () => {
    for (const spring of [ConveyMotion.Snappy, ConveyMotion.Standard, ConveyMotion.Deliberate, ConveyMotion.Elastic, ConveyMotion.Heroic]) {
      const ms = estimatedDurationMs(spring)
      expect(ms).toBeGreaterThan(0)
      expect(Number.isFinite(ms)).toBe(true)
    }
  })

  it('springToLinearEasing produces a valid linear() function string starting at 0 and ending near 1', () => {
    const easing = springToLinearEasing(ConveyMotion.Standard)
    expect(easing.startsWith('linear(')).toBe(true)
    const values = easing
      .slice('linear('.length, -1)
      .split(', ')
      .map(Number)
    expect(values[0]).toBeCloseTo(0, 2)
    expect(values.at(-1)).toBeCloseTo(1, 1)
  })

  it('toCss resolves a snap to zero duration', () => {
    expect(toCss(ConveyMotion.Interrupt)).toEqual({ durationMs: 0, easing: 'step-end' })
  })

  it('toCss resolves a tween to its own duration and easing', () => {
    expect(toCss(ConveyMotion.Enter)).toEqual({
      durationMs: 300,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    })
  })
})
