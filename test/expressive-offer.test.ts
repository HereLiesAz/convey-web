import { beforeAll, describe, expect, it } from 'vitest'
import '../src/components/expressive-offer.js'
import '../src/system.js'
import { ConveyExpressiveShape } from '../src/tokens/expressive-shape.js'
import type { ConveyExpressiveOfferElement } from '../src/components/expressive-offer.js'

beforeAll(async () => {
  await ConveyExpressiveShape.ensureLoaded()
})

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function offerHtml(phase = 'invite'): string {
  return `
    <convey-expressive-offer phase="${phase}">
      <span slot="invite">Go</span>
      <span slot="progress">...</span>
      <span slot="success">✓</span>
    </convey-expressive-offer>
  `
}

describe('convey-expressive-offer', () => {
  it('applies the rest shape at invite', async () => {
    document.body.innerHTML = offerHtml('invite')
    const el = document.querySelector('convey-expressive-offer') as ConveyExpressiveOfferElement
    await flush()
    expect(el.shape.clipPath).toMatch(/circle/)
  })

  it('applies the busy shape at progress', async () => {
    document.body.innerHTML = offerHtml('progress')
    const el = document.querySelector('convey-expressive-offer') as ConveyExpressiveOfferElement
    await flush()
    expect(el.shape.clipPath).toMatch(/cookie9Sided/)
  })

  it('applies the resolved shape at success', async () => {
    document.body.innerHTML = offerHtml('success')
    const el = document.querySelector('convey-expressive-offer') as ConveyExpressiveOfferElement
    await flush()
    expect(el.shape.clipPath).toMatch(/heart/)
  })

  it('respects custom shape name attributes', async () => {
    document.body.innerHTML = `
      <convey-expressive-offer phase="progress" rest-shape="pill" busy-shape="burst" resolved-shape="gem">
        <span slot="invite">Go</span>
      </convey-expressive-offer>
    `
    const el = document.querySelector('convey-expressive-offer') as ConveyExpressiveOfferElement
    await flush()
    expect(el.shape.clipPath).toMatch(/burst/)
  })

  it('still dispatches convey-invoke when clicked at invite', async () => {
    document.body.innerHTML = offerHtml('invite')
    const el = document.querySelector('convey-expressive-offer') as ConveyExpressiveOfferElement
    await flush()
    let fired = false
    el.addEventListener('convey-invoke', () => (fired = true))
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(fired).toBe(true)
  })
})
