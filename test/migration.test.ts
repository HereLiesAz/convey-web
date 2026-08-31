import { describe, expect, it } from 'vitest'
import '../src/migration.js'
import type { ConveyMigrationElement } from '../src/migration.js'

describe('convey-migration', () => {
  it('hides content and centers the control box when empty', () => {
    document.body.innerHTML = `
      <convey-migration empty>
        <div slot="content">List</div>
        <button slot="creation-control">+</button>
      </convey-migration>
    `
    const el = document.querySelector('convey-migration') as ConveyMigrationElement
    const contentWrap = el.shadowRoot!.querySelector('.content-wrap') as HTMLElement
    const controlBox = el.shadowRoot!.querySelector('.control-box') as HTMLElement

    expect(contentWrap.style.display).toBe('none')
    expect(controlBox.style.left).toBe('50%')
    expect(controlBox.style.top).toBe('50%')
    expect(controlBox.style.width).toBe('96px')
  })

  it('shows content and relocates the control box to the default bottom-end corner when not empty', () => {
    document.body.innerHTML = `
      <convey-migration>
        <div slot="content">List</div>
        <button slot="creation-control">+</button>
      </convey-migration>
    `
    const el = document.querySelector('convey-migration') as ConveyMigrationElement
    const contentWrap = el.shadowRoot!.querySelector('.content-wrap') as HTMLElement
    const controlBox = el.shadowRoot!.querySelector('.control-box') as HTMLElement

    expect(contentWrap.style.display).toBe('')
    expect(controlBox.style.left).toBe('calc(100% - 16px)')
    expect(controlBox.style.top).toBe('calc(100% - 16px)')
    expect(controlBox.style.width).toBe('56px')
  })

  it('positions at the top-start corner', () => {
    document.body.innerHTML = `
      <convey-migration corner="top-start">
        <div slot="content">List</div>
        <button slot="creation-control">+</button>
      </convey-migration>
    `
    const el = document.querySelector('convey-migration') as ConveyMigrationElement
    const controlBox = el.shadowRoot!.querySelector('.control-box') as HTMLElement
    expect(controlBox.style.left).toBe('calc(0% + 16px)')
    expect(controlBox.style.top).toBe('calc(0% + 16px)')
  })

  it('honors custom full-size/compact-size/content-padding', () => {
    document.body.innerHTML = `
      <convey-migration empty full-size="120px" content-padding="24px">
        <div slot="content">List</div>
        <button slot="creation-control">+</button>
      </convey-migration>
    `
    const el = document.querySelector('convey-migration') as ConveyMigrationElement
    const controlBox = el.shadowRoot!.querySelector('.control-box') as HTMLElement
    expect(controlBox.style.width).toBe('120px')

    el.removeAttribute('empty')
    el.setAttribute('compact-size', '64px')
    expect(controlBox.style.width).toBe('64px')
    expect(controlBox.style.left).toBe('calc(100% - 24px)')
  })

  it('center corner has no padding offset', () => {
    document.body.innerHTML = `
      <convey-migration corner="center">
        <div slot="content">List</div>
        <button slot="creation-control">+</button>
      </convey-migration>
    `
    const el = document.querySelector('convey-migration') as ConveyMigrationElement
    const controlBox = el.shadowRoot!.querySelector('.control-box') as HTMLElement
    expect(controlBox.style.left).toBe('50%')
    expect(controlBox.style.top).toBe('50%')
  })
})
