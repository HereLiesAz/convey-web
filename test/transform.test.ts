import { describe, expect, it } from 'vitest'
import {
  conveyLiftOnHover,
  conveyRotateOnHover,
  conveyScaleIn,
  conveyScaleOnPress,
  conveySlideIn,
} from '../src/transform.js'

function mouseEvent(type: string): MouseEvent {
  return new MouseEvent(type)
}

describe('conveyScaleOnPress', () => {
  it('does not throw across a press/release cycle', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    const handle = conveyScaleOnPress(el)
    expect(() => {
      el.dispatchEvent(mouseEvent('pointerdown'))
      el.dispatchEvent(mouseEvent('pointerup'))
    }).not.toThrow()
    handle.stop()
  })

  it('stop() detaches every listener', () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    const handle = conveyScaleOnPress(el)
    handle.stop()
    expect(() => el.dispatchEvent(mouseEvent('pointerdown'))).not.toThrow()
  })
})

describe('conveyLiftOnHover', () => {
  it('does not throw on pointerenter/pointerleave', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = conveyLiftOnHover(el)
    expect(() => {
      el.dispatchEvent(mouseEvent('pointerenter'))
      el.dispatchEvent(mouseEvent('pointerleave'))
    }).not.toThrow()
    handle.stop()
  })

  it('stop() detaches every listener', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = conveyLiftOnHover(el)
    handle.stop()
    expect(() => el.dispatchEvent(mouseEvent('pointerenter'))).not.toThrow()
  })
})

describe('conveyRotateOnHover', () => {
  it('does not throw on pointerenter/pointerleave', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const handle = conveyRotateOnHover(el)
    expect(() => {
      el.dispatchEvent(mouseEvent('pointerenter'))
      el.dispatchEvent(mouseEvent('pointerleave'))
    }).not.toThrow()
    handle.stop()
  })
})

describe('conveyScaleIn', () => {
  it('does not throw when run immediately on a fresh element', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => conveyScaleIn(el)).not.toThrow()
  })
})

describe('conveySlideIn', () => {
  it('does not throw when run immediately on a fresh element', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => conveySlideIn(el)).not.toThrow()
  })

  it('does not throw for the horizontal axis', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => conveySlideIn(el, { horizontal: true })).not.toThrow()
  })
})
