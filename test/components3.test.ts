import { describe, expect, it } from 'vitest'
import '../src/components/segmented-control.js'
import '../src/components/top-bar.js'
import '../src/components/navigation-bar.js'
import '../src/system.js'

describe('convey-segmented-control', () => {
  it('positions the indicator at the selected segment', () => {
    document.body.innerHTML = `
      <convey-segmented-control selected="week">
        <button value="day">Day</button>
        <button value="week">Week</button>
        <button value="month">Month</button>
      </convey-segmented-control>
    `
    const el = document.querySelector('convey-segmented-control')!
    const indicator = el.shadowRoot!.querySelector('.indicator') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(100%)')
  })

  it('defaults to the first segment when selected is absent', () => {
    document.body.innerHTML = `
      <convey-segmented-control>
        <button value="day">Day</button>
        <button value="week">Week</button>
      </convey-segmented-control>
    `
    const el = document.querySelector('convey-segmented-control')!
    const indicator = el.shadowRoot!.querySelector('.indicator') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(0%)')
  })

  it('dispatches convey-select with the clicked segment\'s value, does not self-mutate selected', () => {
    document.body.innerHTML = `
      <convey-segmented-control selected="day">
        <button value="day">Day</button>
        <button value="week">Week</button>
      </convey-segmented-control>
    `
    const el = document.querySelector('convey-segmented-control')!
    const weekButton = el.querySelector('[value="week"]') as HTMLButtonElement

    let detail: { value: string } | undefined
    el.addEventListener('convey-select', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail
    })
    weekButton.click()

    expect(detail).toEqual({ value: 'week' })
    expect(el.getAttribute('selected')).toBe('day') // caller owns the source of truth
  })

  it('falls back to index-as-value for a segment with no value attribute', () => {
    document.body.innerHTML = `
      <convey-segmented-control>
        <button>Zero</button>
        <button>One</button>
      </convey-segmented-control>
    `
    const el = document.querySelector('convey-segmented-control')!
    const second = el.querySelectorAll('button')[1]!

    let detail: { value: string } | undefined
    el.addEventListener('convey-select', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail
    })
    second.click()
    expect(detail).toEqual({ value: '1' })
  })
})

describe('convey-top-bar', () => {
  it('registers its title into the nearest ancestor registry', () => {
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    const bar = document.createElement('convey-top-bar')
    system.appendChild(bar)
    expect(system.weightRegistry.primaryCount).toBe(1)

    bar.remove()
    expect(system.weightRegistry.primaryCount).toBe(0)
  })

  it('honors a non-default title-weight', () => {
    document.body.innerHTML = `<convey-system></convey-system>`
    const system = document.querySelector('convey-system') as HTMLElement & {
      weightRegistry: import('../src/weight.js').ConveyWeightRegistry
    }
    const bar = document.createElement('convey-top-bar')
    bar.setAttribute('title-weight', 'hero')
    system.appendChild(bar)
    expect(system.weightRegistry.heroCount).toBe(1)
    expect(system.weightRegistry.primaryCount).toBe(0)
  })
})

describe('convey-navigation-bar', () => {
  it('positions the pill track at the selected destination', () => {
    document.body.innerHTML = `
      <convey-navigation-bar selected="search">
        <button value="home">Home</button>
        <button value="search">Search</button>
        <button value="profile">Profile</button>
      </convey-navigation-bar>
    `
    const el = document.querySelector('convey-navigation-bar')!
    const track = el.shadowRoot!.querySelector('.indicator-track') as HTMLElement
    expect(track.style.transform).toBe('translateX(100%)')
  })

  it('dispatches convey-select for the clicked destination', () => {
    document.body.innerHTML = `
      <convey-navigation-bar selected="home">
        <button value="home">Home</button>
        <button value="profile">Profile</button>
      </convey-navigation-bar>
    `
    const el = document.querySelector('convey-navigation-bar')!
    const profile = el.querySelector('[value="profile"]') as HTMLButtonElement

    let detail: { value: string } | undefined
    el.addEventListener('convey-select', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail
    })
    profile.click()
    expect(detail).toEqual({ value: 'profile' })
  })
})
