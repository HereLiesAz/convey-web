import { safeAnimate, toCss } from './tokens/motion.js'
import type { ConveyShapeToken } from './tokens/shape.js'
import { applyShape } from './tokens/shape.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Persistent visual identity across state changes — the web port of convey's `ConveyMorph`.
 *
 * The core difference from swapping content: there is no "old" element and "new" element.
 * There is ONE element that IS different things at different times. The transformation
 * between states is not decorative — it IS the communication. The user sees the same thing
 * becoming something else, which tells them those things are related.
 *
 * A FAB expanding into a sheet is not a FAB disappearing and a sheet appearing. It is ONE
 * element demonstrating its full range. The morph shows the relationship.
 *
 * ```ts
 * const morph = new ConveyMorphController(fabElement)
 * morph.morphTo({ shape: ConveyShape.ExtraLarge, color: ConveyColor.Primary })
 * ```
 *
 * **Scope note, honestly stated:** the Kotlin original morphs between *any* two `Shape`s by
 * sampling both outlines as paths and interpolating point-by-point — real from-scratch
 * geometry work. This port instead uses CSS's own native shape interpolation, which covers
 * the common case well but not the general one:
 * - Both shapes using `borderRadius` (every `ConveyShape` token except `Cut`/`CutSmall`) —
 *   animates `border-radius` directly. CSS interpolates this natively and smoothly.
 * - Both shapes using `clipPath` with the same polygon point count (`Cut`↔`CutSmall`, or
 *   either against itself) — animates `clip-path` directly; CSS interpolates matching
 *   `polygon()` functions natively too.
 * - A `borderRadius` shape morphing to/from a `clipPath` one — no native CSS property covers
 *   both. Falls back to an immediate cut to the target rather than attempting a from-scratch
 *   path-sampling engine (that's a real geometry undertaking on its own, out of scope here).
 */
export class ConveyMorphController {
  #el: HTMLElement
  #grammar: ConveyGrammar
  #currentShape: ConveyShapeToken | undefined

  constructor(el: HTMLElement, grammar: ConveyGrammar = ConveyGrammar.Default) {
    this.#el = el
    this.#grammar = grammar
  }

  /**
   * Morphs to `shape`/`color`/`contentColor`. `meaning` MUST resolve to the `"morph"` grammar
   * entry or a declared alias — matching the Kotlin original's own insistence that a morph
   * animate with morph's ceremony, not, say, navigate's.
   */
  morphTo(options: { shape?: ConveyShapeToken; color?: string; contentColor?: string; meaning?: string }): void {
    const { durationMs, easing } = toCss(this.#grammar.get(options.meaning ?? 'morph'))

    if (options.color !== undefined) {
      const from = getComputedStyle(this.#el).backgroundColor
      safeAnimate(this.#el, [{ backgroundColor: from }, { backgroundColor: options.color }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
    }
    if (options.contentColor !== undefined) {
      const from = getComputedStyle(this.#el).color
      safeAnimate(this.#el, [{ color: from }, { color: options.contentColor }], { duration: durationMs, easing, fill: 'forwards' })
    }
    if (options.shape !== undefined) {
      this.#morphShape(options.shape, durationMs, easing)
    }
  }

  #morphShape(target: ConveyShapeToken, durationMs: number, easing: string): void {
    const from = this.#currentShape
    this.#currentShape = target

    if (from === undefined) {
      applyShape(this.#el, target)
      return
    }

    const fromUsesRadius = from.borderRadius !== undefined
    const toUsesRadius = target.borderRadius !== undefined

    if (fromUsesRadius && toUsesRadius) {
      safeAnimate(this.#el, [{ borderRadius: from.borderRadius }, { borderRadius: target.borderRadius }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
      this.#el.style.clipPath = ''
      return
    }

    if (!fromUsesRadius && !toUsesRadius && this.#samePolygonPointCount(from.clipPath, target.clipPath)) {
      this.#el.style.borderRadius = ''
      safeAnimate(this.#el, [{ clipPath: from.clipPath }, { clipPath: target.clipPath }], {
        duration: durationMs,
        easing,
        fill: 'forwards',
      })
      return
    }

    // Mixed borderRadius <-> clipPath, or mismatched polygon point counts: no single CSS
    // property covers both shapes, so cut directly to the target (see the class doc's scope
    // note) rather than leaving the element in a stale intermediate shape.
    applyShape(this.#el, target)
  }

  #samePolygonPointCount(a: string | undefined, b: string | undefined): boolean {
    if (a === undefined || b === undefined) return false
    const countOf = (clipPath: string) => (clipPath.match(/,/g)?.length ?? 0) + 1
    return countOf(a) === countOf(b)
  }
}
