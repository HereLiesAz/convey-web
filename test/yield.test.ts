import { describe, expect, it } from 'vitest'
import '../src/yield.js'
import type { ConveyYieldElement } from '../src/yield.js'

describe('convey-yield', () => {
  it('does not throw across every state on a jsdom environment lacking Element.animate', () => {
    document.body.innerHTML = '<convey-yield><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    expect(() => el.setAttribute('state', 'indeterminate')).not.toThrow()
    expect(() => el.setAttribute('state', 'determinate')).not.toThrow()
    expect(() => el.setAttribute('progress', '0.5')).not.toThrow()
    expect(() => el.setAttribute('state', 'idle')).not.toThrow()
  })

  it('applies the fill width for a determinate progress', () => {
    document.body.innerHTML = '<convey-yield state="determinate" progress="0.5"><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('coerces an out-of-range progress into 0..1', () => {
    document.body.innerHTML = '<convey-yield state="determinate" progress="5"><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('collapses the fill back to 0 on idle', () => {
    document.body.innerHTML = '<convey-yield state="determinate" progress="0.8"><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    el.setAttribute('state', 'idle')
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement
    expect(fill.style.width).toBe('0px')
  })

  it('defaults to idle with an unrecognized state value', () => {
    document.body.innerHTML = '<convey-yield state="bogus"><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement
    expect(fill.style.width).toBe('0px')
  })

  it('applies a custom fill-color', () => {
    document.body.innerHTML = '<convey-yield fill-color="rgb(255, 0, 0)"><button>Submit</button></convey-yield>'
    const el = document.querySelector('convey-yield') as ConveyYieldElement
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement
    expect(fill.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })
})
