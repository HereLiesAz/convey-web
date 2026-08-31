import { describe, expect, it, vi } from 'vitest'
import '../src/reversal.js'
import { ConveyReversalState } from '../src/reversal.js'
import type { ConveyReversalElement } from '../src/reversal.js'

describe('ConveyReversalState', () => {
  it('starts with the given items and no pending item', () => {
    const state = new ConveyReversalState([1, 2, 3])
    expect(state.items).toEqual([1, 2, 3])
    expect(state.pending).toBeNull()
  })

  it('destroy() marks an item pending without removing it yet', () => {
    const state = new ConveyReversalState([1, 2, 3])
    state.destroy(2)
    expect(state.pending).toBe(2)
    expect(state.items).toEqual([1, 2, 3])
  })

  it('commit() removes the pending item', () => {
    const state = new ConveyReversalState([1, 2, 3])
    state.destroy(2)
    state.commit()
    expect(state.items).toEqual([1, 3])
    expect(state.pending).toBeNull()
  })

  it('restore() cancels the pending destruction', () => {
    const state = new ConveyReversalState([1, 2, 3])
    state.destroy(2)
    state.restore()
    expect(state.pending).toBeNull()
    expect(state.items).toEqual([1, 2, 3])
  })

  it('destroying a second item while one is pending commits the first immediately', () => {
    const state = new ConveyReversalState([1, 2, 3])
    state.destroy(1)
    state.destroy(2)
    expect(state.items).toEqual([2, 3]) // 1 was committed
    expect(state.pending).toBe(2)
  })

  it('commit() is a safe no-op when nothing is pending', () => {
    const state = new ConveyReversalState([1, 2])
    expect(() => state.commit()).not.toThrow()
    expect(state.items).toEqual([1, 2])
  })

  it('notifies subscribers on destroy/restore/commit, not on no-op calls', () => {
    const state = new ConveyReversalState([1])
    const listener = vi.fn()
    state.onChange(listener)

    state.commit() // no-op, nothing pending
    expect(listener).not.toHaveBeenCalled()

    state.destroy(1)
    expect(listener).toHaveBeenCalledTimes(1)

    state.restore()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('onChange returns an unsubscribe function', () => {
    const state = new ConveyReversalState([1])
    const listener = vi.fn()
    const unsubscribe = state.onChange(listener)
    unsubscribe()
    state.destroy(1)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('convey-reversal', () => {
  it('shows content, not residue, when its item is not pending', () => {
    document.body.innerHTML = '<convey-reversal><div slot="content">Row</div></convey-reversal>'
    const el = document.querySelector('convey-reversal') as ConveyReversalElement
    const state = new ConveyReversalState(['row-1'])
    el.state = state
    el.item = 'row-1'

    const contentSlot = el.shadowRoot!.querySelector('slot[name="content"]') as HTMLElement
    const residueSlot = el.shadowRoot!.querySelector('slot[name="residue"]') as HTMLElement
    expect(contentSlot.style.display).not.toBe('none')
    expect(residueSlot.style.display).toBe('none')
  })

  it('shows residue, not content, when its item becomes pending', () => {
    document.body.innerHTML = '<convey-reversal><div slot="content">Row</div></convey-reversal>'
    const el = document.querySelector('convey-reversal') as ConveyReversalElement
    const state = new ConveyReversalState(['row-1'])
    el.state = state
    el.item = 'row-1'

    state.destroy('row-1')

    const contentSlot = el.shadowRoot!.querySelector('slot[name="content"]') as HTMLElement
    const residueSlot = el.shadowRoot!.querySelector('slot[name="residue"]') as HTMLElement
    expect(contentSlot.style.display).toBe('none')
    expect(residueSlot.style.display).not.toBe('none')
  })

  it('clicking the residue restores the item', () => {
    document.body.innerHTML = '<convey-reversal><div slot="content">Row</div></convey-reversal>'
    const el = document.querySelector('convey-reversal') as ConveyReversalElement
    const state = new ConveyReversalState(['row-1'])
    el.state = state
    el.item = 'row-1'
    state.destroy('row-1')

    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(state.pending).toBeNull()
    expect(state.items).toEqual(['row-1'])
  })

  it('commits automatically once window-ms elapses', () => {
    vi.useFakeTimers()
    try {
      document.body.innerHTML = '<convey-reversal window-ms="1000"><div slot="content">Row</div></convey-reversal>'
      const el = document.querySelector('convey-reversal') as ConveyReversalElement
      const state = new ConveyReversalState(['row-1'])
      el.state = state
      el.item = 'row-1'
      state.destroy('row-1')

      vi.advanceTimersByTime(999)
      expect(state.items).toEqual(['row-1'])

      vi.advanceTimersByTime(2)
      expect(state.items).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('a click while showing ordinary content does not restore anything', () => {
    document.body.innerHTML = '<convey-reversal><div slot="content">Row</div></convey-reversal>'
    const el = document.querySelector('convey-reversal') as ConveyReversalElement
    const state = new ConveyReversalState(['row-1'])
    el.state = state
    el.item = 'row-1'

    const restoreSpy = vi.spyOn(state, 'restore')
    ;(el.shadowRoot!.querySelector('.box') as HTMLElement).click()
    expect(restoreSpy).not.toHaveBeenCalled()
  })
})
