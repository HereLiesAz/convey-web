import { describe, expect, it, vi } from 'vitest'
import '../src/offer.js'
import '../src/system.js'
import { ConveyGate } from '../src/escort.js'
import type { ConveyOfferElement } from '../src/offer.js'
import type { ConveyEscortRegistry } from '../src/escort.js'
import type { ConveyWeightRegistry } from '../src/weight.js'

function offerHtml(phase = 'invite'): string {
  return `
    <convey-offer phase="${phase}">
      <span slot="invite">Send</span>
      <span slot="progress">…</span>
      <span slot="success">✓</span>
      <span slot="interrupted">Cancelled</span>
    </convey-offer>
  `
}

describe('convey-offer', () => {
  it('dispatches convey-invoke when clicked with no gate, in invite phase', () => {
    document.body.innerHTML = offerHtml('invite')
    const el = document.querySelector('convey-offer') as ConveyOfferElement

    let fired = false
    el.addEventListener('convey-invoke', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(true)
  })

  it('dispatches convey-invoke in failure phase too', () => {
    document.body.innerHTML = offerHtml('failure')
    const el = document.querySelector('convey-offer') as ConveyOfferElement

    let fired = false
    el.addEventListener('convey-invoke', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(true)
  })

  it('does not dispatch convey-invoke during progress by default (not interruptible)', () => {
    document.body.innerHTML = offerHtml('progress')
    const el = document.querySelector('convey-offer') as ConveyOfferElement

    let fired = false
    el.addEventListener('convey-invoke', () => (fired = true))
    let interrupted = false
    el.addEventListener('convey-interrupt', () => (interrupted = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(false)
    expect(interrupted).toBe(false)
  })

  it('dispatches convey-interrupt during progress when interruptible', () => {
    document.body.innerHTML = offerHtml('progress')
    const el = document.querySelector('convey-offer') as ConveyOfferElement
    el.setAttribute('interruptible', '')

    let interrupted = false
    el.addEventListener('convey-interrupt', () => (interrupted = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(interrupted).toBe(true)
  })

  it('is inert in success and interrupted phases', () => {
    for (const phase of ['success', 'interrupted']) {
      document.body.innerHTML = offerHtml(phase)
      const el = document.querySelector('convey-offer') as ConveyOfferElement
      let fired = false
      el.addEventListener('convey-invoke', () => (fired = true))
      ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
      expect(fired).toBe(false)
    }
  })

  it('does not dispatch convey-invoke when the gate is unsatisfied, and escorts instead', async () => {
    document.body.innerHTML = `
      <convey-system>
        <convey-gate-location identity="email"><input /></convey-gate-location>
        ${offerHtml('invite')}
      </convey-system>
    `
    const system = document.querySelector('convey-system') as HTMLElement & {
      escortRegistry: ConveyEscortRegistry
    }
    const el = document.querySelector('convey-offer') as ConveyOfferElement
    el.gate = new ConveyGate('email', () => false)

    const escortSpy = vi.spyOn(system.escortRegistry, 'escortTo')
    let fired = false
    el.addEventListener('convey-invoke', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fired).toBe(false)
    expect(escortSpy).toHaveBeenCalledWith('email')
  })

  it('falls back to the invite slot for failure when no failure slot is provided', () => {
    document.body.innerHTML = `
      <convey-offer phase="failure">
        <span slot="invite">Send</span>
      </convey-offer>
    `
    const el = document.querySelector('convey-offer') as ConveyOfferElement
    const inviteSlot = el.shadowRoot!.querySelector('slot[name="invite"]') as HTMLSlotElement
    expect(inviteSlot.classList.contains('active')).toBe(true)
  })

  it('uses its own failure slot when one is provided', () => {
    document.body.innerHTML = `
      <convey-offer phase="failure">
        <span slot="invite">Send</span>
        <span slot="failure">Retry</span>
      </convey-offer>
    `
    const el = document.querySelector('convey-offer') as ConveyOfferElement
    const failureSlot = el.shadowRoot!.querySelector('slot[name="failure"]') as HTMLSlotElement
    const inviteSlot = el.shadowRoot!.querySelector('slot[name="invite"]') as HTMLSlotElement
    expect(failureSlot.classList.contains('active')).toBe(true)
    expect(inviteSlot.classList.contains('active')).toBe(false)
  })

  it('registers its weight into the nearest ancestor registry', () => {
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: ConveyWeightRegistry
    }
    const offer = document.createElement('convey-offer')
    offer.setAttribute('weight', 'primary')
    system.appendChild(offer)
    expect(system.weightRegistry.primaryCount).toBe(1)
  })
})
