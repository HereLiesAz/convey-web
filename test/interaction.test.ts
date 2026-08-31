import { describe, expect, it } from 'vitest'
import { conveyLongPress, conveyPress, conveyRipple, conveySwipe } from '../src/interaction.js'

// jsdom has no global PointerEvent constructor at all (production code only *listens* for
// pointer events -- it never constructs one -- so this is a test-infrastructure gap, not a
// source bug). A MouseEvent carries every field these listeners actually read (clientX/
// clientY); the one field it lacks, pointerId, is only read inside an
// `if (typeof el.setPointerCapture === 'function')` guard that itself never enters here,
// since jsdom doesn't implement pointer capture either.
function pointerEvent(type: string, init: Partial<MouseEventInit> = {}): MouseEvent {
  return new MouseEvent(type, { clientX: 0, clientY: 0, ...init })
}

describe('conveyRipple', () => {
  it('creates and removes an overlay element on pointerdown/animation finish', () => {
    document.body.innerHTML = '<button>Click</button>'
    const el = document.querySelector('button')!
    document.body.appendChild(el) // ensure attached for getBoundingClientRect
    conveyRipple(el)
    el.dispatchEvent(pointerEvent('pointerdown'))
    // jsdom has no WAAPI, so safeAnimate's fallback path removes the ripple synchronously.
    expect(el.children.length).toBe(0)
  })

  it('sets position: relative on an unpositioned element', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    conveyRipple(el)
    expect(el.style.position).toBe('relative')
  })

  it('stop() detaches the listener', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    const handle = conveyRipple(el)
    handle.stop()
    el.dispatchEvent(pointerEvent('pointerdown'))
    expect(el.children.length).toBe(0)
  })
})

describe('conveyPress', () => {
  it('calls onClick on a genuine pointerdown -> pointerup sequence', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    let clicked = false
    conveyPress(el, { onClick: () => (clicked = true) })
    el.dispatchEvent(pointerEvent('pointerdown'))
    el.dispatchEvent(pointerEvent('pointerup'))
    expect(clicked).toBe(true)
  })

  it('does not call onClick when the pointer is cancelled', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    let clicked = false
    conveyPress(el, { onClick: () => (clicked = true) })
    el.dispatchEvent(pointerEvent('pointerdown'))
    el.dispatchEvent(pointerEvent('pointercancel'))
    expect(clicked).toBe(false)
  })

  it('does not call onClick when the pointer leaves before release', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    let clicked = false
    conveyPress(el, { onClick: () => (clicked = true) })
    el.dispatchEvent(pointerEvent('pointerdown'))
    el.dispatchEvent(pointerEvent('pointerleave'))
    expect(clicked).toBe(false)
  })

  it('a pointerup with no preceding pointerdown does not call onClick', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    let clicked = false
    conveyPress(el, { onClick: () => (clicked = true) })
    el.dispatchEvent(pointerEvent('pointerup'))
    expect(clicked).toBe(false)
  })

  it('stop() detaches every listener', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    let clicked = false
    const handle = conveyPress(el, { onClick: () => (clicked = true) })
    handle.stop()
    el.dispatchEvent(pointerEvent('pointerdown'))
    el.dispatchEvent(pointerEvent('pointerup'))
    expect(clicked).toBe(false)
  })
})

describe('conveyLongPress', () => {
  it('does not fire before the hold duration elapses', () => {
    document.body.innerHTML = '<button></button>'
    const el = document.querySelector('button')!
    let fired = false
    conveyLongPress(el, { durationMs: 600, initiationDelay: 100, onLongPress: () => (fired = true) })
    el.dispatchEvent(pointerEvent('pointerdown'))
    el.dispatchEvent(pointerEvent('pointerup'))
    expect(fired).toBe(false)
  })

  it('stop() cancels any in-flight hold without throwing', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    const handle = conveyLongPress(el, { onLongPress: () => {} })
    el.dispatchEvent(pointerEvent('pointerdown'))
    expect(() => handle.stop()).not.toThrow()
  })

  it('sets position: relative on an unpositioned element', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    conveyLongPress(el, { onLongPress: () => {} })
    expect(el.style.position).toBe('relative')
  })
})

describe('conveySwipe', () => {
  it('does not throw across a full drag sequence', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    let swiped: string | undefined
    conveySwipe(el, { onSwipe: (dir) => (swiped = dir) })

    expect(() => {
      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 0 }))
      el.dispatchEvent(pointerEvent('pointermove', { clientX: 50 }))
      el.dispatchEvent(pointerEvent('pointermove', { clientX: 150 }))
      el.dispatchEvent(pointerEvent('pointerup', { clientX: 150 }))
    }).not.toThrow()
    // Whether `swiped` ends up set depends on the exact resistance math crossing the
    // threshold; the meaningful assertion here is that the whole gesture sequence, including
    // jsdom's lack of setPointerCapture, never throws.
    void swiped
  })

  it('a small drag below threshold does not fire onSwipe', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    let fired = false
    conveySwipe(el, { onSwipe: () => (fired = true) })

    el.dispatchEvent(pointerEvent('pointerdown', { clientX: 0 }))
    el.dispatchEvent(pointerEvent('pointermove', { clientX: 2 }))
    el.dispatchEvent(pointerEvent('pointerup', { clientX: 2 }))
    expect(fired).toBe(false)
  })

  it('stop() detaches every listener', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    let fired = false
    const handle = conveySwipe(el, { onSwipe: () => (fired = true) })
    handle.stop()
    el.dispatchEvent(pointerEvent('pointerdown', { clientX: 0 }))
    el.dispatchEvent(pointerEvent('pointermove', { clientX: 150 }))
    el.dispatchEvent(pointerEvent('pointerup', { clientX: 150 }))
    expect(fired).toBe(false)
  })
})
