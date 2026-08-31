import { describe, expect, it, vi } from 'vitest'
import '../src/enter.js'
import '../src/system.js'
import { ConveyOriginRegistry } from '../src/enter.js'
import type { ConveyOriginElement } from '../src/enter.js'

describe('ConveyOriginRegistry', () => {
  it('returns undefined for an unregistered key', () => {
    const registry = new ConveyOriginRegistry()
    expect(registry.boundsFor('nope')).toBeUndefined()
  })

  it('returns the bounds registered for a key', () => {
    const registry = new ConveyOriginRegistry()
    const bounds = { x: 1, y: 2, width: 3, height: 4 }
    registry.register('a', bounds)
    expect(registry.boundsFor('a')).toEqual(bounds)
  })

  it('a later register() for the same key overwrites the earlier one', () => {
    const registry = new ConveyOriginRegistry()
    registry.register('a', { x: 0, y: 0, width: 10, height: 10 })
    registry.register('a', { x: 5, y: 5, width: 20, height: 20 })
    expect(registry.boundsFor('a')).toEqual({ x: 5, y: 5, width: 20, height: 20 })
  })
})

describe('convey-origin', () => {
  it('registers its own bounds into the nearest ancestor registry on connect', () => {
    document.body.innerHTML = '<convey-system></convey-system>'
    const system = document.querySelector('convey-system') as HTMLElement & {
      originRegistry: ConveyOriginRegistry
    }
    const origin = document.createElement('convey-origin') as ConveyOriginElement
    origin.setAttribute('key', 'message-41')
    system.appendChild(origin)

    // jsdom's getBoundingClientRect() always returns zeros (no real layout engine), but the
    // registration itself -- the thing this test actually verifies -- still happens.
    expect(system.originRegistry.boundsFor('message-41')).toBeDefined()
  })

  it('recordBounds() re-registers on demand', () => {
    document.body.innerHTML = '<convey-system></convey-system>'
    const system = document.querySelector('convey-system') as HTMLElement & {
      originRegistry: ConveyOriginRegistry
    }
    const origin = document.createElement('convey-origin') as ConveyOriginElement
    origin.setAttribute('key', 'message-41')
    system.appendChild(origin)

    const registerSpy = vi.spyOn(system.originRegistry, 'register')
    origin.recordBounds()
    expect(registerSpy).toHaveBeenCalledWith('message-41', expect.any(Object))
  })

  it('does nothing when key is absent', () => {
    document.body.innerHTML = '<convey-system></convey-system>'
    const system = document.querySelector('convey-system') as HTMLElement & {
      originRegistry: ConveyOriginRegistry
    }
    const origin = document.createElement('convey-origin') as ConveyOriginElement
    system.appendChild(origin)
    const registerSpy = vi.spyOn(system.originRegistry, 'register')
    origin.recordBounds()
    expect(registerSpy).not.toHaveBeenCalled()
  })
})

describe('convey-enter', () => {
  it('does not throw when mounted with no matching origin (e.g. a deep link)', async () => {
    document.body.innerHTML = `
      <convey-system>
        <convey-enter key="never-registered"><div>Detail</div></convey-enter>
      </convey-system>
    `
    // #animateIn runs on the next animation frame.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    // Nothing to assert beyond "did not throw" -- jsdom's zero-sized getBoundingClientRect()
    // means the own.width === 0 guard always takes the "nothing to grow from" branch here,
    // which is exactly the deep-link case this test names.
  })

  it('does not throw when mounted with a matching origin registered', async () => {
    document.body.innerHTML = `
      <convey-system>
        <convey-origin key="message-41"><div>Row</div></convey-origin>
        <convey-enter key="message-41"><div>Detail</div></convey-enter>
      </convey-system>
    `
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })
})
