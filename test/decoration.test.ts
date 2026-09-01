import { describe, expect, it, vi } from 'vitest'
import '../src/decoration.js'
import type { ConveyActTextElement } from '../src/decoration.js'
import { ConveyPracticeRegistry } from '../src/practice.js'

describe('convey-act-text (fallback path -- kinetic entry point not loaded)', () => {
  it('renders its text as a plain underlined span', () => {
    const el = document.createElement('convey-act-text') as ConveyActTextElement
    el.setAttribute('text', 'terms of service')
    document.body.appendChild(el)

    const span = el.shadowRoot!.querySelector('.marker span')!
    expect(span.textContent).toBe('terms of service')
  })

  it('dispatches convey-click and records a practice operation on click', () => {
    const el = document.createElement('convey-act-text') as ConveyActTextElement
    el.setAttribute('text', 'open settings')
    document.body.appendChild(el)

    const handler = vi.fn()
    el.addEventListener('convey-click', handler)

    const span = el.shadowRoot!.querySelector('.marker span') as HTMLElement
    span.click()

    expect(handler).toHaveBeenCalledOnce()
    expect(el.registry.operationCount('open settings')).toBe(1)
  })

  it('accepts a shared registry', () => {
    const shared = new ConveyPracticeRegistry()
    shared.recordOperation('already known')

    const el = document.createElement('convey-act-text') as ConveyActTextElement
    el.setAttribute('text', 'already known')
    el.registry = shared
    document.body.appendChild(el)

    expect(el.registry.operationCount('already known')).toBe(1)
  })

  it('re-renders when the text attribute changes', () => {
    const el = document.createElement('convey-act-text') as ConveyActTextElement
    el.setAttribute('text', 'first')
    document.body.appendChild(el)
    el.setAttribute('text', 'second')

    const span = el.shadowRoot!.querySelector('.marker span')!
    expect(span.textContent).toBe('second')
  })
})
