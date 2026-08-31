import { describe, expect, it } from 'vitest'
import '../src/components/avatar.js'
import '../src/components/list-item.js'
import '../src/components/card.js'
import '../src/system.js'
import { ConveyViolationError } from '../src/weight.js'

describe('convey-avatar', () => {
  it('renders initials from name when nothing is slotted', () => {
    document.body.innerHTML = '<convey-avatar name="Ada Lovelace"></convey-avatar>'
    const el = document.querySelector('convey-avatar')!
    const initials = el.shadowRoot!.querySelector('.initials')!
    expect(initials.textContent).toBe('AL')
    expect((initials as HTMLElement).style.display).not.toBe('none')
  })

  it('caps initials at two letters', () => {
    document.body.innerHTML = '<convey-avatar name="Ada Katherine Lovelace"></convey-avatar>'
    const el = document.querySelector('convey-avatar')!
    const initials = el.shadowRoot!.querySelector('.initials')!
    expect(initials.textContent).toBe('AK')
  })

  it('hides initials when content is slotted', () => {
    document.body.innerHTML = '<convey-avatar name="Ada Lovelace"><img src="a.jpg" /></convey-avatar>'
    const el = document.querySelector('convey-avatar')!
    const initials = el.shadowRoot!.querySelector('.initials') as HTMLElement
    expect(initials.style.display).toBe('none')
  })

  it('renders nothing when there is no name and no content', () => {
    document.body.innerHTML = '<convey-avatar></convey-avatar>'
    const el = document.querySelector('convey-avatar')!
    const initials = el.shadowRoot!.querySelector('.initials')!
    expect(initials.textContent).toBe('')
  })
})

describe('convey-list-item', () => {
  it('registers its weight into the nearest ancestor registry', () => {
    document.body.innerHTML = `
      <convey-system></convey-system>
    `
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    const item = document.createElement('convey-list-item')
    item.setAttribute('weight', 'hero')
    system.appendChild(item)

    expect(system.weightRegistry.heroCount).toBe(1)

    item.remove()
    expect(system.weightRegistry.heroCount).toBe(0)
  })

  it('reports (not throws through appendChild) when a second hero registers', () => {
    // Per the WHATWG custom elements spec, an exception thrown inside a reaction callback
    // (connectedCallback here) is *reported* -- the DOM equivalent of an uncaught error --
    // not propagated to whatever triggered the reaction. appendChild() itself never throws
    // for this; jsdom implements that spec behavior correctly (confirmed by first writing
    // this test the "obvious" way, expecting appendChild to throw, and watching it fail).
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    const a = document.createElement('convey-list-item')
    a.setAttribute('weight', 'hero')
    const b = document.createElement('convey-list-item')
    b.setAttribute('weight', 'hero')

    let reported: Error | undefined
    const onError = (e: ErrorEvent) => {
      reported = e.error
      e.preventDefault()
    }
    window.addEventListener('error', onError)
    try {
      expect(() => {
        system.appendChild(a)
        system.appendChild(b)
      }).not.toThrow()
    } finally {
      window.removeEventListener('error', onError)
    }

    expect(reported).toBeInstanceOf(ConveyViolationError)
    // The registration still happened before validate() threw -- the throw is advisory, not
    // a rollback. This mirrors register()'s own documented order (set, then validate).
    expect(system.weightRegistry.heroCount).toBe(2)
  })

  it('defaults to secondary weight', () => {
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    system.appendChild(document.createElement('convey-list-item'))
    expect(system.weightRegistry.secondaryCount).toBe(1)
  })

  it('fires convey-click only when clickable', () => {
    document.body.innerHTML = '<convey-list-item clickable></convey-list-item>'
    const el = document.querySelector('convey-list-item')!
    const row = el.shadowRoot!.querySelector('.row') as HTMLElement

    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    row.click()
    expect(fired).toBe(true)
  })

  it('does not fire convey-click when not clickable', () => {
    document.body.innerHTML = '<convey-list-item></convey-list-item>'
    const el = document.querySelector('convey-list-item')!
    const row = el.shadowRoot!.querySelector('.row') as HTMLElement

    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    row.click()
    expect(fired).toBe(false)
  })
})

describe('convey-card', () => {
  it('registers its weight, same as convey-list-item', () => {
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    const card = document.createElement('convey-card')
    card.setAttribute('weight', 'primary')
    system.appendChild(card)
    expect(system.weightRegistry.primaryCount).toBe(1)
  })

  it('removes the shadow when elevation is 0px', () => {
    document.body.innerHTML = '<convey-card elevation="0px"></convey-card>'
    const el = document.querySelector('convey-card')!
    const surface = el.shadowRoot!.querySelector('.surface') as HTMLElement
    expect(surface.style.boxShadow).toBe('none')
  })

  it('fires convey-click only when clickable', () => {
    document.body.innerHTML = '<convey-card clickable></convey-card>'
    const el = document.querySelector('convey-card')!
    const surface = el.shadowRoot!.querySelector('.surface') as HTMLElement

    let fired = false
    el.addEventListener('convey-click', () => (fired = true))
    surface.click()
    expect(fired).toBe(true)
  })
})
