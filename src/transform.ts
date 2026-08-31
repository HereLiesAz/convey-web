import { safeAnimate, toCss } from './tokens/motion.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Transform functions — the physical language of interaction — the web port of convey's
 * `ConveyTransform`.
 *
 * These are not animations for their own sake. Each transform communicates something:
 *
 * Scale on press → "I received your input"
 * Lift on hover  → "I can be interacted with"
 * Rotate hint    → "I have an orientation or direction"
 * Scale/slide in → "I am new here — notice me, then I'll be quiet"
 *
 * The Manifesto says: "Shape/Morphing: use varied forms to direct focus without literal
 * arrows." Transform is how shape becomes dynamic. Static shape is vocabulary. Transform is
 * syntax.
 *
 * Each function attaches Pointer Event listeners (or runs once immediately, for the two
 * entrance transforms) to an existing element and returns a handle whose `stop()` detaches
 * them, the same shape as `interaction.ts`'s functions — there is no Modifier chain here to
 * compose several of these onto one element the way `Modifier.conveyTransform { }`'s DSL
 * does; call each function you need on the same element instead.
 */

export interface ConveyTransformHandle {
  stop(): void
}

/**
 * Scale down on press, recover with spring on release. The recovery overshoot from the
 * grammar's `recoveryMeaning` spring tells the user their touch was received — the spring
 * does not just restore scale, it confirms.
 *
 * Functionally identical to `interaction.ts`'s `conveyPress` minus the `onClick` callback —
 * kept as a separate export to mirror `ConveyTransformScope.scaleOnPress`'s own identity in
 * the Kotlin source, for callers porting Compose code who are looking for this exact name.
 */
export function conveyScaleOnPress(
  el: HTMLElement,
  options: { pressedScale?: number; recoveryMeaning?: string; grammar?: ConveyGrammar } = {},
): ConveyTransformHandle {
  const pressedScale = options.pressedScale ?? 0.94
  const grammar = options.grammar ?? ConveyGrammar.Default
  const recovery = toCss(grammar.get(options.recoveryMeaning ?? 'confirm'))

  const onPointerDown = () => {
    safeAnimate(el, [{ transform: el.style.transform || 'scale(1)' }, { transform: `scale(${pressedScale})` }], {
      duration: 80,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'forwards',
    })
  }
  const onRelease = () => {
    safeAnimate(el, [{ transform: `scale(${pressedScale})` }, { transform: 'scale(1)' }], {
      duration: recovery.durationMs,
      easing: recovery.easing,
      fill: 'forwards',
    })
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onRelease)
  el.addEventListener('pointercancel', onRelease)
  el.addEventListener('pointerleave', onRelease)

  return {
    stop: () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onRelease)
      el.removeEventListener('pointercancel', onRelease)
      el.removeEventListener('pointerleave', onRelease)
    },
  }
}

/**
 * Translate upward and scale up on pointer hover. Physical lift communicates that the
 * element is above the surface and can be engaged — the digital equivalent of a card rising
 * from a table.
 *
 * Uses `pointerenter`/`pointerleave` rather than the Kotlin original's manual
 * `awaitPointerEventScope` polling loop with an `isOutOfBounds` check — the browser's own
 * hover-boundary tracking already does exactly this.
 *
 * @param elevationPx How many px to translate upward at peak hover.
 * @param scaleUp How much to scale up at peak hover.
 */
export function conveyLiftOnHover(
  el: HTMLElement,
  options: { elevationPx?: number; scaleUp?: number; meaning?: string; grammar?: ConveyGrammar } = {},
): ConveyTransformHandle {
  const elevationPx = options.elevationPx ?? 8
  const scaleUp = options.scaleUp ?? 1.03
  const grammar = options.grammar ?? ConveyGrammar.Default
  const { durationMs, easing } = toCss(grammar.get(options.meaning ?? 'reveal'))

  const animateTo = (translateY: number, scale: number) => {
    const from = el.style.transform || 'translateY(0px) scale(1)'
    safeAnimate(el, [{ transform: from }, { transform: `translateY(${translateY}px) scale(${scale})` }], {
      duration: durationMs,
      easing,
      fill: 'forwards',
    })
  }
  const onEnter = () => animateTo(-elevationPx, scaleUp)
  const onLeave = () => animateTo(0, 1)

  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointerleave', onLeave)

  return {
    stop: () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
    },
  }
}

/**
 * Rotate by `degrees` when the pointer enters. Useful for icon buttons, directional
 * indicators, and decorative accents that should respond to proximity — the rotation implies
 * directionality or liveliness.
 *
 * @param degrees Rotation at peak hover. Positive = clockwise.
 */
export function conveyRotateOnHover(
  el: HTMLElement,
  options: { degrees?: number; meaning?: string; grammar?: ConveyGrammar } = {},
): ConveyTransformHandle {
  const degrees = options.degrees ?? 8
  const grammar = options.grammar ?? ConveyGrammar.Default
  const { durationMs, easing } = toCss(grammar.get(options.meaning ?? 'reveal'))

  const animateTo = (deg: number) => {
    const from = el.style.transform || 'rotate(0deg)'
    safeAnimate(el, [{ transform: from }, { transform: `rotate(${deg}deg)` }], {
      duration: durationMs,
      easing,
      fill: 'forwards',
    })
  }
  const onEnter = () => animateTo(degrees)
  const onLeave = () => animateTo(0)

  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointerleave', onLeave)

  return {
    stop: () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
    },
  }
}

/**
 * Scale and fade in from `initialScale`/`initialAlpha` to `1`/`1`, once, immediately. New
 * elements should announce their presence, then become quiet. This animates once — call it
 * right after adding `el` to the DOM (the web has no "on first composition" hook to run it
 * automatically). It does not repeat. It does not pulse. It introduces, then trusts that the
 * user noticed.
 *
 * @param initialScale Starting scale. `0.85` gives a "grow in" feel.
 * @param initialAlpha Starting opacity.
 */
export function conveyScaleIn(
  el: HTMLElement,
  options: { initialScale?: number; initialAlpha?: number; meaning?: string; grammar?: ConveyGrammar } = {},
): void {
  const initialScale = options.initialScale ?? 0.85
  const initialAlpha = options.initialAlpha ?? 0
  const grammar = options.grammar ?? ConveyGrammar.Default
  const { durationMs, easing } = toCss(grammar.get(options.meaning ?? 'reveal'))

  safeAnimate(
    el,
    [
      { transform: `scale(${initialScale})`, opacity: String(initialAlpha) },
      { transform: 'scale(1)', opacity: '1' },
    ],
    { duration: durationMs, easing, fill: 'forwards' },
  )
}

/**
 * Translate in from `offsetPx` on the specified axis, once, immediately. Content that slides
 * in carries spatial information: it came from somewhere. "Navigate" transitions use this —
 * the new screen slides in from the direction of the navigation hierarchy.
 *
 * @param offsetPx Starting translation. Positive = from right (horizontal) or bottom
 *   (vertical).
 * @param horizontal If true, translates along X. If false, along Y.
 * @param meaning Grammar entry. Should be `"navigate"` for navigation transitions.
 */
export function conveySlideIn(
  el: HTMLElement,
  options: { offsetPx?: number; horizontal?: boolean; meaning?: string; grammar?: ConveyGrammar } = {},
): void {
  const offsetPx = options.offsetPx ?? 32
  const horizontal = options.horizontal ?? false
  const grammar = options.grammar ?? ConveyGrammar.Default
  const { durationMs, easing } = toCss(grammar.get(options.meaning ?? 'navigate'))
  const axis = horizontal ? 'X' : 'Y'

  safeAnimate(
    el,
    [{ transform: `translate${axis}(${offsetPx}px)` }, { transform: `translate${axis}(0px)` }],
    { duration: durationMs, easing, fill: 'forwards' },
  )
}
