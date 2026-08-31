import { beforeEach, describe, expect, it } from 'vitest'
import '../src/components/badge.js'
import '../src/components/chip.js'
import '../src/components/switch.js'
import '../src/system.js'

describe('convey-badge', () => {
  it('shows a dot with no count', () => {
    document.body.innerHTML = '<convey-badge><button>bell</button></convey-badge>'
    const el = document.querySelector('convey-badge')!
    const badge = el.shadowRoot!.querySelector('.badge')!
    expect(badge.classList.contains('dot')).toBe(true)
  })

  it('renders count text, capped at max-count', () => {
    document.body.innerHTML = '<convey-badge count="150" max-count="99"><button>bell</button></convey-badge>'
    const el = document.querySelector('convey-badge')!
    const label = el.shadowRoot!.querySelector('.label')!
    expect(label.textContent).toBe('99+')
  })

  it('renders the exact count under max-count', () => {
    document.body.innerHTML = '<convey-badge count="3"><button>bell</button></convey-badge>'
    const el = document.querySelector('convey-badge')!
    const label = el.shadowRoot!.querySelector('.label')!
    expect(label.textContent).toBe('3')
  })

  it('does not throw when Element.animate is unavailable (jsdom)', () => {
    expect(() => {
      document.body.innerHTML = '<convey-badge count="1"><button>bell</button></convey-badge>'
    }).not.toThrow()
  })
})

describe('convey-chip', () => {
  it('reflects selected colors', () => {
    document.body.innerHTML = '<convey-chip selected>Draft</convey-chip>'
    const el = document.querySelector('convey-chip')!
    const chip = el.shadowRoot!.querySelector('.chip') as HTMLElement
    expect(chip.style.backgroundColor).not.toBe('')
  })

  it('adds a remove button when removable, dispatches convey-remove', () => {
    document.body.innerHTML = '<convey-chip removable>Draft</convey-chip>'
    const el = document.querySelector('convey-chip')!
    const button = el.shadowRoot!.querySelector('.remove') as HTMLButtonElement
    expect(button).not.toBeNull()

    let fired = false
    el.addEventListener('convey-remove', () => {
      fired = true
    })
    button.click()
    expect(fired).toBe(true)
  })

  it('does not add a remove button when not removable', () => {
    document.body.innerHTML = '<convey-chip>Draft</convey-chip>'
    const el = document.querySelector('convey-chip')!
    expect(el.shadowRoot!.querySelector('.remove')).toBeNull()
  })
})

describe('convey-switch', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('starts unchecked by default', () => {
    document.body.innerHTML = '<convey-switch></convey-switch>'
    const el = document.querySelector('convey-switch') as HTMLElement & { checked: boolean }
    expect(el.checked).toBe(false)
  })

  it('reflects the checked attribute', () => {
    document.body.innerHTML = '<convey-switch checked></convey-switch>'
    const el = document.querySelector('convey-switch') as HTMLElement & { checked: boolean }
    expect(el.checked).toBe(true)
  })

  it('dispatches convey-change with the toggled value, does not self-mutate', () => {
    document.body.innerHTML = '<convey-switch></convey-switch>'
    const el = document.querySelector('convey-switch') as HTMLElement & { checked: boolean }
    const track = el.shadowRoot!.querySelector('.track') as HTMLButtonElement

    let detail: { checked: boolean } | undefined
    el.addEventListener('convey-change', (e) => {
      detail = (e as CustomEvent<{ checked: boolean }>).detail
    })
    track.click()

    expect(detail).toEqual({ checked: true })
    expect(el.checked).toBe(false) // caller owns the source of truth
  })

  it('ignores clicks when disabled', () => {
    document.body.innerHTML = '<convey-switch disabled></convey-switch>'
    const el = document.querySelector('convey-switch')!
    const track = el.shadowRoot!.querySelector('.track') as HTMLButtonElement

    let fired = false
    el.addEventListener('convey-change', () => {
      fired = true
    })
    track.click()
    expect(fired).toBe(false)
  })
})
