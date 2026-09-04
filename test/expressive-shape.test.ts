import { beforeAll, describe, expect, it } from 'vitest'
import { ConveyExpressiveShape } from '../src/tokens/expressive-shape.js'

beforeAll(async () => {
  await ConveyExpressiveShape.ensureLoaded()
})

describe('ConveyExpressiveShape.pathDataOf', () => {
  it('returns real, non-empty SVG path data for a known shape', () => {
    const d = ConveyExpressiveShape.pathDataOf('heart')
    expect(d.length).toBeGreaterThan(20)
    expect(d.startsWith('M')).toBe(true)
  })

  it('returns different path data for different shapes', () => {
    const circle = ConveyExpressiveShape.pathDataOf('circle')
    const heart = ConveyExpressiveShape.pathDataOf('heart')
    expect(circle).not.toBe(heart)
  })

  it('falls back to circle for an unknown name', () => {
    const unknown = ConveyExpressiveShape.pathDataOf('notARealShapeName')
    const circle = ConveyExpressiveShape.pathDataOf('circle')
    expect(unknown).toBe(circle)
  })

  it('resolves every documented shape name without throwing', () => {
    const names = [
      'circle', 'square', 'slanted', 'arch', 'fan', 'arrow', 'semiCircle', 'oval', 'pill',
      'triangle', 'diamond', 'clamShell', 'pentagon', 'gem', 'sunny', 'verySunny',
      'cookie4Sided', 'cookie6Sided', 'cookie7Sided', 'cookie9Sided', 'cookie12Sided',
      'ghostish', 'clover4Leaf', 'clover8Leaf', 'burst', 'softBurst', 'boom', 'softBoom',
      'flower', 'puffy', 'puffyDiamond', 'pixelCircle', 'pixelTriangle', 'bun', 'heart',
    ]
    for (const name of names) {
      expect(() => ConveyExpressiveShape.pathDataOf(name)).not.toThrow()
    }
  })
})

describe('ConveyExpressiveShape.shapeOf', () => {
  it('returns a ConveyShapeToken with a url(#...) clip-path', () => {
    const token = ConveyExpressiveShape.shapeOf('cookie9Sided')
    expect(token.name).toBe('cookie9Sided')
    expect(token.clipPath).toMatch(/^url\(#convey-expressive-cookie9Sided\)$/)
  })

  it('registers a real <clipPath> def in the document reachable by that id', () => {
    ConveyExpressiveShape.shapeOf('burst')
    const clipPath = document.getElementById('convey-expressive-burst')
    expect(clipPath).not.toBeNull()
    expect(clipPath?.tagName.toLowerCase()).toBe('clippath')
    expect(clipPath?.getAttribute('clipPathUnits')).toBe('objectBoundingBox')
    expect(clipPath?.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(20)
  })

  it('reuses the same def on a second call for the same shape rather than duplicating it', () => {
    ConveyExpressiveShape.shapeOf('pill')
    const before = document.querySelectorAll('#convey-expressive-pill').length
    ConveyExpressiveShape.shapeOf('pill')
    const after = document.querySelectorAll('#convey-expressive-pill').length
    expect(after).toBe(before)
    expect(after).toBe(1)
  })
})
