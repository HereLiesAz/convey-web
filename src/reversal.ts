import { safeAnimate, toCss } from './tokens/motion.js'
import { ConveyShape, applyShape } from './tokens/shape.js'
import { grammarOf } from './system.js'

/**
 * The framework's replacement for confirmation dialogs, undo snackbars, and trash/archive
 * round-trips — the web port of convey's `ConveyReversal`.
 *
 * A destroyed subject does not vanish behind a modal, and its undo does not live in a bar at
 * the bottom of the screen that steals the space and then leaves. It collapses in place into
 * a compact, reversible residue — occupying the space it held, in the position it held, for a
 * window. Clicking the residue restores the subject. Letting the window elapse lets it go.
 *
 * The reversal is located in the world, which is where a person's hand already is — not in a
 * modal before the fact, and not in an orphaned report after it.
 *
 * Not named `ConveyGhost`: `ConveyWeight`'s `'ghost'` already names a different, unrelated
 * concept in this library (a present-but-inert element, explicitly non-interactive). This is
 * the framework's *other* "Ghost" — the reversible residue of a destroyed subject.
 *
 * ```ts
 * const state = new ConveyReversalState(messages)
 * ```
 * ```html
 * <convey-reversal>
 *   <div slot="content">...message row...</div>
 * </convey-reversal>
 * <script>
 *   const el = document.querySelector('convey-reversal')
 *   el.state = state
 *   el.item = messages[0]
 * </script>
 * ```
 */

type Listener = () => void

/**
 * Tracks a list of items and which one (if any) is mid-destruction. Reactive via a plain
 * `change` callback list rather than a framework-specific store — call `onChange()` to
 * subscribe (returns an unsubscribe function), the way any framework adapter's own effect
 * hook would want to.
 *
 * Item identity is reference equality (`===`), the JS analog of Kotlin's structural
 * `List - item`: pass the same object reference you used to add the item when calling
 * `destroy()`.
 */
export class ConveyReversalState<T> {
  #items: readonly T[]
  #pending: T | null = null
  #listeners = new Set<Listener>()

  constructor(initial: readonly T[] = []) {
    this.#items = initial
  }

  get items(): readonly T[] {
    return this.#items
  }

  get pending(): T | null {
    return this.#pending
  }

  onChange(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /**
   * Marks `item` for destruction: it starts showing its residue instead of its ordinary
   * content. Only one reversal window is open at a time — a prior pending item commits
   * immediately first.
   */
  destroy(item: T): void {
    this.commit()
    this.#pending = item
    this.#notify()
  }

  /** Cancels the pending destruction. `pending` returns to `null`. */
  restore(): void {
    if (this.#pending === null) return
    this.#pending = null
    this.#notify()
  }

  /**
   * Commits the pending destruction immediately, removing it from `items`. Called
   * automatically when a `<convey-reversal>`'s window elapses; safe to call when nothing is
   * pending.
   */
  commit(): void {
    if (this.#pending === null) return
    this.#items = this.#items.filter((i) => i !== this.#pending)
    this.#pending = null
    this.#notify()
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }
}

/**
 * Wraps a single item's display. When `item` is `state.pending`, this collapses to the
 * `residue` slot (a compact, clickable "undo" residue — defaults to a plain "Undo" label
 * when nothing is slotted) for `window-ms`; letting that window elapse without a click
 * commits the destruction via `state.commit()`. Clicking the residue restores the item via
 * `state.restore()`.
 *
 * Attributes:
 * - `window-ms` — how long the residue stays reversible (default `4000`). The framework's
 *   guidance is that this should scale with the weight of what was destroyed — a single
 *   message is quick to reconsider, a whole conversation deserves longer — so set this per
 *   instance rather than relying on one fixed value everywhere.
 * - `residue-height` — the collapsed height while showing the residue (default `40px`).
 *
 * Properties (not attributes — both carry live values an attribute string can't express):
 * `item` (the value this instance represents) and `state` (its `ConveyReversalState`).
 *
 * Slots: `content` (ordinary display), `residue` (optional custom residue content).
 */
export class ConveyReversalElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['window-ms', 'residue-height']
  }

  #shadow: ShadowRoot
  #box: HTMLElement
  #residueDefault: HTMLElement
  #item: unknown = undefined
  #state: ConveyReversalState<unknown> | undefined
  #unsubscribe: (() => void) | undefined
  #timer: ReturnType<typeof setTimeout> | undefined
  #currentlyResidue = false

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; overflow: hidden; }
        .box { box-sizing: border-box; }
        .residue-default { cursor: pointer; }
      </style>
      <div class="box" part="box">
        <slot name="content"></slot>
        <slot name="residue"><span class="residue-default" part="residue">Undo</span></slot>
      </div>
    `
    this.#box = this.#shadow.querySelector('.box')!
    this.#residueDefault = this.#shadow.querySelector('.residue-default')!
    this.#box.addEventListener('click', () => {
      if (this.#currentlyResidue) this.#state?.restore()
    })
  }

  connectedCallback(): void {
    applyShape(this.#box, ConveyShape.None)
    this.#render(false)
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
    if (this.#timer !== undefined) clearTimeout(this.#timer)
  }

  get item(): unknown {
    return this.#item
  }

  set item(value: unknown) {
    this.#item = value
    if (this.isConnected) this.#render(false)
  }

  get state(): ConveyReversalState<unknown> | undefined {
    return this.#state
  }

  set state(value: ConveyReversalState<unknown> | undefined) {
    this.#unsubscribe?.()
    this.#state = value
    this.#unsubscribe = value?.onChange(() => this.#render(true))
    if (this.isConnected) this.#render(false)
  }

  #windowMs(): number {
    const raw = this.getAttribute('window-ms')
    const n = raw === null ? NaN : Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : 4000
  }

  #render(reactToStateChange: boolean): void {
    const isPending = this.#state !== undefined && this.#state.pending === this.#item
    this.#currentlyResidue = isPending
    const residueHeight = this.getAttribute('residue-height') ?? '40px'

    if (this.#timer !== undefined) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }

    const applyTarget = () => {
      applyShape(this.#box, isPending ? ConveyShape.Small : ConveyShape.None)
      this.#box.style.height = isPending ? residueHeight : ''
      const contentSlot = this.#shadow.querySelector('slot[name="content"]') as HTMLSlotElement
      const residueSlot = this.#shadow.querySelector('slot[name="residue"]') as HTMLSlotElement
      contentSlot.style.display = isPending ? 'none' : ''
      residueSlot.style.display = isPending ? '' : 'none'
    }

    if (reactToStateChange) {
      const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
      safeAnimate(this.#box, [{ height: this.#box.style.height || 'auto' }, { height: isPending ? residueHeight : 'auto' }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
      applyTarget()
    } else {
      applyTarget()
    }

    if (isPending) {
      this.#timer = setTimeout(() => this.#state?.commit(), this.#windowMs())
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-reversal')) {
  customElements.define('convey-reversal', ConveyReversalElement)
}
