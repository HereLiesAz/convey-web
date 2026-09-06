import { beforeAll, describe, expect, it } from 'vitest'
import '../src/components/expressive-badge.js'
import { ConveyExpressiveShape } from '../src/tokens/expressive-shape.js'
import { accentWeightFor } from '../src/components/expressive-badge.js'
import type { ConveyExpressiveBadgeElement, ConveyExpressiveCompoundBadgeElement, ConveyExpressiveTileElement } from '../src/components/expressive-badge.js'

beforeAll(async () => {
  await ConveyExpressiveShape.ensureLoaded()
})

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('accentWeightFor', () => {
  it('cycles through three distinct weights', () => {
    expect(accentWeightFor('hero')).toBe('primary')
    expect(accentWeightFor('primary')).toBe('secondary')
    expect(accentWeightFor('secondary')).toBe('hero')
  })

  it('never matches its own input', () => {
    for (const weight of ['hero', 'primary', 'secondary', 'ghost'] as const) {
      expect(accentWeightFor(weight)).not.toBe(weight)
    }
  })

  it('gives ghost a hero fallback', () => {
    expect(accentWeightFor('ghost')).toBe('hero')
  })
})

describe('convey-expressive-badge', () => {
  it('renders its label and applies a clip-path shape', async () => {
    document.body.innerHTML = `<convey-expressive-badge label="9" shape="cookie9Sided"></convey-expressive-badge>`
    const el = document.querySelector('convey-expressive-badge') as ConveyExpressiveBadgeElement
    await flush()
    const box = el.shadowRoot!.querySelector('.box') as HTMLElement
    const label = el.shadowRoot!.querySelector('.label') as HTMLElement
    expect(label.textContent).toBe('9')
    expect(box.style.clipPath).toMatch(/^url\(#convey-expressive-local-cookie9Sided\)$/)
  })

  it('defaults to circle and secondary weight', async () => {
    document.body.innerHTML = `<convey-expressive-badge label="1"></convey-expressive-badge>`
    const el = document.querySelector('convey-expressive-badge') as ConveyExpressiveBadgeElement
    await flush()
    const box = el.shadowRoot!.querySelector('.box') as HTMLElement
    expect(box.style.clipPath).toMatch(/circle/)
  })
})

describe('convey-expressive-compound-badge', () => {
  it('renders primary and accent shapes with different colors', async () => {
    document.body.innerHTML = `<convey-expressive-compound-badge label="!" shape="sunny" weight="hero"></convey-expressive-compound-badge>`
    const el = document.querySelector('convey-expressive-compound-badge') as ConveyExpressiveCompoundBadgeElement
    await flush()
    const primary = el.shadowRoot!.querySelector('.primary') as HTMLElement
    const accent = el.shadowRoot!.querySelector('.accent') as HTMLElement
    expect(primary.style.backgroundColor).not.toBe('')
    expect(accent.style.backgroundColor).not.toBe('')
    expect(accent.style.backgroundColor).not.toBe(primary.style.backgroundColor)
  })

  it('uses spark as the accent when the primary shape is burst', async () => {
    document.body.innerHTML = `<convey-expressive-compound-badge label="x" shape="burst"></convey-expressive-compound-badge>`
    const el = document.querySelector('convey-expressive-compound-badge') as ConveyExpressiveCompoundBadgeElement
    await flush()
    const accent = el.shadowRoot!.querySelector('.accent') as HTMLElement
    expect(accent.style.clipPath).toMatch(/spark/)
  })
})

describe('convey-expressive-tile', () => {
  it('renders label and subtitle', async () => {
    document.body.innerHTML = `<convey-expressive-tile label="Shipment" subtitle="Out for delivery" shape="clamShell"></convey-expressive-tile>`
    const el = document.querySelector('convey-expressive-tile') as ConveyExpressiveTileElement
    await flush()
    const title = el.shadowRoot!.querySelector('.title') as HTMLElement
    const subtitle = el.shadowRoot!.querySelector('.subtitle') as HTMLElement
    expect(title.textContent).toBe('Shipment')
    expect(subtitle.textContent).toBe('Out for delivery')
    expect(subtitle.style.display).not.toBe('none')
  })

  it('hides the subtitle element when none is given', async () => {
    document.body.innerHTML = `<convey-expressive-tile label="Shipment" shape="clamShell"></convey-expressive-tile>`
    const el = document.querySelector('convey-expressive-tile') as ConveyExpressiveTileElement
    await flush()
    const subtitle = el.shadowRoot!.querySelector('.subtitle') as HTMLElement
    expect(subtitle.style.display).toBe('none')
  })
})
