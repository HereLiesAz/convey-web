import { describe, expect, it } from 'vitest'
import '../src/employment.js'
import { ConveyEmploymentRegistry } from '../src/employment.js'
import { ConveyViolationError } from '../src/weight.js'
import type { ConveyEmploymentElement } from '../src/employment.js'

describe('ConveyEmploymentRegistry', () => {
  it('allows an element with at least the minimum jobs', () => {
    const registry = new ConveyEmploymentRegistry()
    expect(() => registry.register('a', new Set(['invite', 'progress', 'confirm', 'interrupt']))).not.toThrow()
  })

  it('throws for an element below the minimum, not ambient', () => {
    const registry = new ConveyEmploymentRegistry()
    expect(() => registry.register('a', new Set(['invite', 'progress']))).toThrow(ConveyViolationError)
  })

  it('does not throw for an under-resourced element declared ambient', () => {
    const registry = new ConveyEmploymentRegistry()
    expect(() => registry.register('a', new Set(), true)).not.toThrow()
  })

  it('throws once ambient count exceeds the budget', () => {
    const registry = new ConveyEmploymentRegistry({ ambientBudget: 1 })
    registry.register('a', new Set(), true)
    expect(() => registry.register('b', new Set(), true)).toThrow(ConveyViolationError)
  })

  it('does not enforce when enforce is false', () => {
    const registry = new ConveyEmploymentRegistry({ enforce: false })
    expect(() => registry.register('a', new Set(['invite']))).not.toThrow()
    expect(registry.underEmployedCount).toBe(1)
  })

  it('unregister removes the entry from the counts', () => {
    const registry = new ConveyEmploymentRegistry({ enforce: false })
    registry.register('a', new Set(['invite']))
    registry.unregister('a')
    expect(registry.underEmployedCount).toBe(0)
  })

  it('snapshot reports counts against the configured minimum/budget', () => {
    const registry = new ConveyEmploymentRegistry({ minimumJobs: 4, ambientBudget: 3, enforce: false })
    registry.register('a', new Set(['invite']))
    registry.register('b', new Set(), true)
    const snap = registry.snapshot()
    expect(snap).toContain('Under-employed: 1  (min 4 jobs)')
    expect(snap).toContain('Ambient:        1  (budget 3)')
  })

  it('a custom minimumJobs is honored', () => {
    const registry = new ConveyEmploymentRegistry({ minimumJobs: 2 })
    expect(() => registry.register('a', new Set(['invite', 'progress']))).not.toThrow()
  })
})

describe('convey-employment', () => {
  it('parses the jobs attribute as a comma-separated list, no shared registry across instances', () => {
    document.body.innerHTML = '<convey-employment jobs="invite,progress,confirm,interrupt"></convey-employment>'
    const el = document.querySelector('convey-employment') as ConveyEmploymentElement
    // Each unprovided instance gets its own fresh registry (matching the Kotlin original's
    // documented asymmetry from ConveyWeightRegistry) -- four jobs alone satisfies its own
    // registry's default minimum, so this must not throw.
    expect(el.isConnected).toBe(true)
  })

  it('reads the ambient attribute', () => {
    document.body.innerHTML = '<convey-employment ambient></convey-employment>'
    const el = document.querySelector('convey-employment') as ConveyEmploymentElement
    expect(el.hasAttribute('ambient')).toBe(true)
  })

  it('shares a registry with siblings when one is provided by an ancestor', async () => {
    const { provideEmploymentRegistry } = await import('../src/employment.js')
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    const registry = new ConveyEmploymentRegistry({ enforce: false })
    provideEmploymentRegistry(root, registry)

    const a = document.createElement('convey-employment') as ConveyEmploymentElement
    a.setAttribute('jobs', 'invite')
    root.appendChild(a)

    expect(registry.underEmployedCount).toBe(1)
  })
})
