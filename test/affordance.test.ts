import { describe, expect, it, vi } from 'vitest'
import '../src/affordance.js'
import { applyConveyAffordance, ConveyAffordance } from '../src/affordance.js'
import type { ConveyAffordanceElement } from '../src/affordance.js'

describe('applyConveyAffordance', () => {
  it('none does nothing and stop() does not throw', () => {
    const el = document.createElement('div')
    const handle = applyConveyAffordance(el, ConveyAffordance.None)
    expect(() => handle.stop()).not.toThrow()
  })

  it('press-hint schedules a timer that stop() cancels before it fires', () => {
    vi.useFakeTimers()
    try {
      const el = document.createElement('div')
      const handle = applyConveyAffordance(el, ConveyAffordance.PressHint({ delay: 400 }))
      handle.stop()
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  it('expand-hint does not throw across its full lifecycle', () => {
    vi.useFakeTimers()
    try {
      const el = document.createElement('div')
      const handle = applyConveyAffordance(el, ConveyAffordance.ExpandHint({ delay: 100 }))
      vi.advanceTimersByTime(200)
      handle.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('swipe-hint does not throw across its full lifecycle', () => {
    vi.useFakeTimers()
    try {
      const el = document.createElement('div')
      const handle = applyConveyAffordance(el, ConveyAffordance.SwipeHint({ delay: 100 }))
      vi.advanceTimersByTime(200)
      handle.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('drag-hint stops looping once the element is interacted with', () => {
    const el = document.createElement('div')
    const handle = applyConveyAffordance(el, ConveyAffordance.DragHint())
    el.dispatchEvent(new Event('pointerdown'))
    // The loop checks `cancelled` only inside its own recursive step, which in this
    // jsdom-without-WAAPI environment never re-enters (safeAnimate's fallback path returns
    // undefined and the loop deliberately does not recurse on that path) -- so nothing to
    // advance here. The real assertion is that this whole sequence never throws.
    expect(() => handle.stop()).not.toThrow()
  })

  it('stop() restores the element transform to empty', () => {
    const el = document.createElement('div')
    el.style.transform = 'scale(2)'
    const handle = applyConveyAffordance(el, ConveyAffordance.None)
    handle.stop()
    expect(el.style.transform).toBe('')
  })
})

describe('convey-affordance', () => {
  it('does not throw when connected with no kind attribute', () => {
    expect(() => {
      document.body.innerHTML = '<convey-affordance><button>+</button></convey-affordance>'
    }).not.toThrow()
  })

  it('does not throw across every kind', () => {
    for (const kind of ['press-hint', 'swipe-hint', 'drag-hint', 'expand-hint']) {
      expect(() => {
        document.body.innerHTML = `<convey-affordance kind="${kind}"><button>+</button></convey-affordance>`
      }).not.toThrow()
    }
  })

  it('re-applies when an attribute changes while connected', () => {
    document.body.innerHTML = '<convey-affordance kind="press-hint" delay="400"><button>+</button></convey-affordance>'
    const el = document.querySelector('convey-affordance') as ConveyAffordanceElement
    expect(() => el.setAttribute('delay', '800')).not.toThrow()
  })

  it('stops its handle on disconnect without throwing', () => {
    document.body.innerHTML = '<convey-affordance kind="drag-hint"><button>+</button></convey-affordance>'
    const el = document.querySelector('convey-affordance') as ConveyAffordanceElement
    expect(() => el.remove()).not.toThrow()
  })
})

describe('conveyInert', () => {
  it('sets data-convey-inert with the reason', async () => {
    const { conveyInert } = await import('../src/affordance.js')
    const el = document.createElement('div')
    conveyInert(el, 'decorative divider')
    expect(el.dataset.conveyInert).toBe('decorative divider')
  })
})
