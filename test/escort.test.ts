import { describe, expect, it, vi } from 'vitest'
import '../src/escort.js'
import '../src/system.js'
import { ConveyEscortRegistry, ConveyGate } from '../src/escort.js'
import type { ConveyEscortedElement, ConveyGateLocationElement } from '../src/escort.js'

describe('ConveyEscortRegistry', () => {
  it('calls the registered travel function for an identity', async () => {
    const registry = new ConveyEscortRegistry()
    const travel = vi.fn()
    registry.register('email', travel)
    await registry.escortTo('email')
    expect(travel).toHaveBeenCalledOnce()
  })

  it('is a no-op for an unregistered identity', async () => {
    const registry = new ConveyEscortRegistry()
    await expect(registry.escortTo('nope')).resolves.toBeUndefined()
  })

  it('unregister removes the travel function', async () => {
    const registry = new ConveyEscortRegistry()
    const travel = vi.fn()
    registry.register('email', travel)
    registry.unregister('email')
    await registry.escortTo('email')
    expect(travel).not.toHaveBeenCalled()
  })
})

describe('convey-gate-location', () => {
  it('registers into the nearest escort registry on connect', () => {
    document.body.innerHTML = '<convey-system></convey-system>'
    const system = document.querySelector('convey-system') as HTMLElement & {
      escortRegistry: ConveyEscortRegistry
    }
    const registerSpy = vi.spyOn(system.escortRegistry, 'register')
    const location = document.createElement('convey-gate-location') as ConveyGateLocationElement
    location.setAttribute('identity', 'email')
    system.appendChild(location)
    expect(registerSpy).toHaveBeenCalledWith('email', expect.any(Function))
  })

  it('unregisters on disconnect', () => {
    document.body.innerHTML = '<convey-system></convey-system>'
    const system = document.querySelector('convey-system') as HTMLElement & {
      escortRegistry: ConveyEscortRegistry
    }
    const location = document.createElement('convey-gate-location') as ConveyGateLocationElement
    location.setAttribute('identity', 'email')
    system.appendChild(location)
    const unregisterSpy = vi.spyOn(system.escortRegistry, 'unregister')
    location.remove()
    expect(unregisterSpy).toHaveBeenCalledWith('email')
  })
})

describe('convey-escorted', () => {
  it('dispatches convey-click directly when the gate is satisfied', () => {
    document.body.innerHTML = '<convey-escorted><button>Submit</button></convey-escorted>'
    const el = document.querySelector('convey-escorted') as ConveyEscortedElement
    el.gate = new ConveyGate('email', () => true)

    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(true)
  })

  it('dispatches convey-click directly when there is no gate at all', () => {
    document.body.innerHTML = '<convey-escorted><button>Submit</button></convey-escorted>'
    const el = document.querySelector('convey-escorted') as ConveyEscortedElement

    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(true)
  })

  it('does not dispatch convey-click when the gate is unsatisfied, and escorts instead', async () => {
    document.body.innerHTML = `
      <convey-system>
        <convey-gate-location identity="email"><input /></convey-gate-location>
        <convey-escorted><button>Submit</button></convey-escorted>
      </convey-system>
    `
    const system = document.querySelector('convey-system') as HTMLElement & {
      escortRegistry: ConveyEscortRegistry
    }
    const el = document.querySelector('convey-escorted') as ConveyEscortedElement
    el.gate = new ConveyGate('email', () => false)

    const escortSpy = vi.spyOn(system.escortRegistry, 'escortTo')
    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()

    // The shake-then-escort sequence is async (awaits the shake animation's .finished).
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fired).toBe(false)
    expect(escortSpy).toHaveBeenCalledWith('email')
  })
})
