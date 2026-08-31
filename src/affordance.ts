import { safeAnimate } from './tokens/motion.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Self-revealing interactivity — the web port of convey's `ConveyAffordance`.
 *
 * An affordance is a property of an object that reveals how it can be used. A door handle
 * affords pulling. A button affords pressing. In UI, we cannot rely on physical form — we
 * must signal affordance through behavior.
 *
 * The Manifesto says: "Design should teach users what to do simply by being used."
 * `applyConveyAffordance` makes elements teach their own interactivity, once, without help
 * text, without onboarding overlays, without tooltips that appear on hover.
 *
 * The element moves. The movement demonstrates what happens when you interact. Then it
 * stops, because the user has learned. It does not repeat the lesson.
 *
 * ```ts
 * applyConveyAffordance(fabElement, { kind: 'press-hint', delay: 800 })
 * ```
 * ```html
 * <convey-affordance kind="press-hint" delay="800">
 *   <button>+</button>
 * </convey-affordance>
 * ```
 */
export type ConveyAffordanceKind =
  | { readonly kind: 'none' }
  | { readonly kind: 'press-hint'; readonly scale?: number; readonly delay?: number; readonly meaning?: string }
  | { readonly kind: 'swipe-hint'; readonly directionPx?: number; readonly horizontal?: boolean; readonly delay?: number }
  | { readonly kind: 'drag-hint'; readonly amplitudePx?: number }
  | { readonly kind: 'expand-hint'; readonly scale?: number; readonly delay?: number }

export const ConveyAffordance = {
  None: { kind: 'none' } as const,
  PressHint: (opts: Omit<Extract<ConveyAffordanceKind, { kind: 'press-hint' }>, 'kind'> = {}): ConveyAffordanceKind => ({
    kind: 'press-hint',
    ...opts,
  }),
  SwipeHint: (opts: Omit<Extract<ConveyAffordanceKind, { kind: 'swipe-hint' }>, 'kind'> = {}): ConveyAffordanceKind => ({
    kind: 'swipe-hint',
    ...opts,
  }),
  DragHint: (opts: Omit<Extract<ConveyAffordanceKind, { kind: 'drag-hint' }>, 'kind'> = {}): ConveyAffordanceKind => ({
    kind: 'drag-hint',
    ...opts,
  }),
  ExpandHint: (opts: Omit<Extract<ConveyAffordanceKind, { kind: 'expand-hint' }>, 'kind'> = {}): ConveyAffordanceKind => ({
    kind: 'expand-hint',
    ...opts,
  }),
} as const

/** Stops a running affordance loop and restores the element's transform, if `applyConveyAffordance` returned one. */
export interface ConveyAffordanceHandle {
  stop(): void
}

/**
 * Applies `affordance` to `el`. Returns a handle whose `stop()` cancels any pending timer or
 * looping animation and restores `el`'s transform to identity — call it when `el` unmounts,
 * or whenever you'd re-run this with a new `key` (see the Kotlin original's `key` parameter:
 * there is no automatic re-run here, since there's no composition lifecycle to hook a key
 * comparison into — call `applyConveyAffordance` again yourself when the element's role
 * changes and should teach itself again).
 */
export function applyConveyAffordance(
  el: HTMLElement,
  affordance: ConveyAffordanceKind,
  grammar: ConveyGrammar = ConveyGrammar.Default,
): ConveyAffordanceHandle {
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let cleanupListener: (() => void) | undefined

  const stop = () => {
    stopped = true
    if (timer !== undefined) clearTimeout(timer)
    cleanupListener?.()
    el.style.transform = ''
  }

  switch (affordance.kind) {
    case 'none':
      break

    case 'press-hint': {
      const scaleTarget = affordance.scale ?? 0.92
      const delay = affordance.delay ?? 400
      const meaning = affordance.meaning ?? 'confirm'
      timer = setTimeout(() => {
        if (stopped) return
        const spec = grammar.get(meaning)
        const duration = spec.kind === 'tween' ? spec.durationMillis : 200
        const easing = spec.kind === 'tween' ? spec.easing : 'ease-out'
        safeAnimate(el, [{ transform: 'scale(1)' }, { transform: `scale(${scaleTarget})` }, { transform: 'scale(1)' }], {
          duration: duration * 2,
          easing,
          fill: 'forwards',
        })
      }, delay)
      break
    }

    case 'expand-hint': {
      const scaleTarget = affordance.scale ?? 1.06
      const delay = affordance.delay ?? 500
      timer = setTimeout(() => {
        if (stopped) return
        safeAnimate(el, [{ transform: 'scale(1)' }, { transform: `scale(${scaleTarget})` }, { transform: 'scale(1)' }], {
          duration: 500,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          fill: 'forwards',
        })
      }, delay)
      break
    }

    case 'swipe-hint': {
      const distance = affordance.directionPx ?? 20
      const horizontal = affordance.horizontal ?? true
      const delay = affordance.delay ?? 600
      const axis = horizontal ? 'X' : 'Y'
      timer = setTimeout(() => {
        if (stopped) return
        safeAnimate(
          el,
          [
            { transform: `translate${axis}(0px)` },
            { transform: `translate${axis}(${distance}px)` },
            { transform: `translate${axis}(0px)` },
          ],
          { duration: 500, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)', fill: 'forwards' },
        )
      }, delay)
      break
    }

    case 'drag-hint': {
      const amplitude = affordance.amplitudePx ?? 4
      let cancelled = false
      const onInteract = () => {
        cancelled = true
      }
      el.addEventListener('pointerdown', onInteract, { once: true })
      cleanupListener = () => el.removeEventListener('pointerdown', onInteract)

      const loop = () => {
        if (stopped || cancelled) {
          el.style.transform = ''
          return
        }
        const anim = safeAnimate(
          el,
          [
            { transform: 'translateY(0px)' },
            { transform: `translateY(${amplitude}px)` },
            { transform: `translateY(${-amplitude}px)` },
            { transform: 'translateY(0px)' },
          ],
          { duration: 1400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        )
        if (anim === undefined) return // no WAAPI: safeAnimate already applied a static fallback, don't loop forever
        anim.addEventListener('finish', loop)
      }
      loop()
      break
    }
  }

  return { stop }
}

/**
 * Framework-free HTML usage of `applyConveyAffordance`:
 * ```html
 * <convey-affordance kind="press-hint" delay="800">
 *   <button>+</button>
 * </convey-affordance>
 * ```
 * Attributes: `kind` (`press-hint`/`swipe-hint`/`drag-hint`/`expand-hint`; absent or `none`
 * applies nothing), `scale`, `delay`, `meaning` (press-hint), `direction-px`, `horizontal`
 * (swipe-hint, presence = true), `amplitude-px` (drag-hint). Re-applies (restarting the hint)
 * whenever `kind` or its parameters change while connected — the DOM-attribute analog of the
 * Kotlin original's `key` parameter.
 */
export class ConveyAffordanceElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['kind', 'scale', 'delay', 'meaning', 'direction-px', 'horizontal', 'amplitude-px']
  }

  #handle: ConveyAffordanceHandle | undefined

  connectedCallback(): void {
    this.style.display ||= 'contents'
    this.#reapply()
  }

  disconnectedCallback(): void {
    this.#handle?.stop()
    this.#handle = undefined
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#reapply()
  }

  #reapply(): void {
    this.#handle?.stop()
    this.#handle = applyConveyAffordance(this, this.#affordance())
  }

  #floatAttr(name: string): number | undefined {
    const raw = this.getAttribute(name)
    if (raw === null) return undefined
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : undefined
  }

  #affordance(): ConveyAffordanceKind {
    switch (this.getAttribute('kind')) {
      case 'press-hint':
        return ConveyAffordance.PressHint(
          omitUndefined({ scale: this.#floatAttr('scale'), delay: this.#floatAttr('delay'), meaning: this.getAttribute('meaning') ?? undefined }),
        )
      case 'expand-hint':
        return ConveyAffordance.ExpandHint(omitUndefined({ scale: this.#floatAttr('scale'), delay: this.#floatAttr('delay') }))
      case 'swipe-hint':
        return ConveyAffordance.SwipeHint(
          omitUndefined({
            directionPx: this.#floatAttr('direction-px'),
            horizontal: this.hasAttribute('horizontal') || undefined,
            delay: this.#floatAttr('delay'),
          }),
        )
      case 'drag-hint':
        return ConveyAffordance.DragHint(omitUndefined({ amplitudePx: this.#floatAttr('amplitude-px') }))
      default:
        return { kind: 'none' }
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-affordance')) {
  customElements.define('convey-affordance', ConveyAffordanceElement)
}

/**
 * Marks an element as having no interactive affordance — it is Ghost by nature. Not a no-op:
 * an explicit declaration: "I know this element does nothing, and that is intentional." Sets
 * `data-convey-inert` (with `reason` as its value, if given) so an audit tool can distinguish
 * "declared inert" from "affordance unknown" the same way `Modifier.conveyInert` does.
 */
function omitUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  const result = {} as Record<string, unknown>
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v
  }
  return result as { [K in keyof T]: Exclude<T[K], undefined> }
}

export function conveyInert(el: HTMLElement, reason = ''): void {
  el.dataset.conveyInert = reason
}
