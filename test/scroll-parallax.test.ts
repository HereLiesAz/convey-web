import { describe, expect, it, vi } from 'vitest'
import { ConveyScrollParallax, ConveyScrollParallaxController } from '../src/scroll-parallax.js'

describe('ConveyScrollParallax.entranceProgress', () => {
  it('is zero when the item sits at or below the viewport bottom', () => {
    expect(ConveyScrollParallax.entranceProgress(600, 600)).toBe(0)
    expect(ConveyScrollParallax.entranceProgress(900, 600)).toBe(0)
  })

  it('is one once the item has fully crossed the entrance zone', () => {
    expect(ConveyScrollParallax.entranceProgress(300, 600)).toBe(1)
    expect(ConveyScrollParallax.entranceProgress(0, 600)).toBe(1)
    expect(ConveyScrollParallax.entranceProgress(-200, 600)).toBe(1)
  })

  it('is linear inside the zone', () => {
    const progress = ConveyScrollParallax.entranceProgress(450, 600)
    expect(progress).toBeGreaterThanOrEqual(0.4)
    expect(progress).toBeLessThanOrEqual(0.6)
  })

  it('respects a custom zone fraction', () => {
    const wide = ConveyScrollParallax.entranceProgress(500, 600, 0.5)
    const narrow = ConveyScrollParallax.entranceProgress(500, 600, 0.25)
    expect(narrow).toBeGreaterThan(wide)
  })

  it('treats a degenerate viewport height as fully entered', () => {
    expect(ConveyScrollParallax.entranceProgress(100, 0)).toBe(1)
  })
})

describe('ConveyScrollParallax.translation', () => {
  it('is full distance at zero progress and zero at full progress', () => {
    expect(ConveyScrollParallax.translation(0, 48)).toBe(48)
    expect(ConveyScrollParallax.translation(1, 48)).toBe(0)
  })

  it('is linear in progress', () => {
    expect(ConveyScrollParallax.translation(0.5, 48)).toBe(24)
  })

  it('clamps progress outside zero to one', () => {
    expect(ConveyScrollParallax.translation(-1, 48)).toBe(48)
    expect(ConveyScrollParallax.translation(2, 48)).toBe(0)
  })
})

describe('ConveyScrollParallaxController', () => {
  function mockRect(top: number, height: number): DOMRect {
    return { top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  }

  it('applies a transform to a registered item on recompute', () => {
    const container = document.createElement('div')
    const item = document.createElement('span')
    document.body.appendChild(container)
    container.appendChild(item)

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect(0, 600))
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect(300, 20))

    const controller = new ConveyScrollParallaxController(container)
    controller.register({ element: item, direction: 'horizontal', distancePx: 48 })
    controller.recompute()

    expect(item.style.transform).toContain('translateX')
    expect(item.style.opacity).not.toBe('')
  })

  it('uses translateY for the vertical direction', () => {
    const container = document.createElement('div')
    const item = document.createElement('span')
    document.body.appendChild(container)
    container.appendChild(item)

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect(0, 600))
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect(450, 20))

    const controller = new ConveyScrollParallaxController(container)
    controller.register({ element: item, direction: 'vertical', distancePx: 48 })
    controller.recompute()

    expect(item.style.transform).toContain('translateY')
  })

  it('stops updating an item once unregistered', () => {
    const container = document.createElement('div')
    const item = document.createElement('span')
    document.body.appendChild(container)
    container.appendChild(item)

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(mockRect(0, 600))
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect(300, 20))

    const controller = new ConveyScrollParallaxController(container)
    const unregister = controller.register({ element: item, direction: 'horizontal', distancePx: 48 })
    controller.recompute()
    const firstTransform = item.style.transform

    unregister()
    item.style.transform = ''
    controller.recompute()

    expect(item.style.transform).toBe('')
    expect(firstTransform).not.toBe('')
  })

  it('destroy removes the scroll listener and clears items', () => {
    const container = document.createElement('div')
    const removeSpy = vi.spyOn(container, 'removeEventListener')
    const controller = new ConveyScrollParallaxController(container)
    controller.destroy()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
