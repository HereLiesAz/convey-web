import { safeAnimate, toCss } from './tokens/motion.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Interaction layer — the web port of convey's `ConveyInteraction`.
 *
 * The Manifesto says: "Physics/Motion: interaction feedback should demonstrate purpose and
 * train muscle memory." This is what that means in code.
 *
 * Every interaction here is designed to teach:
 *   - `conveyRipple` teaches WHERE the touch registered
 *   - `conveyPress` teaches THAT the element received the touch
 *   - `conveyLongPress`'s progress ring teaches HOW MUCH LONGER to hold
 *   - `conveySwipe`'s resistance teaches THAT there is content beyond the edge
 *
 * None of these are decorative. Each carries semantic cargo.
 *
 * Each function attaches Pointer Event listeners to an existing element (the web has no
 * Modifier chain to extend) and returns a handle whose `stop()` detaches them — call it on
 * unmount, the same lifecycle role `disconnectedCallback` plays for this package's custom
 * elements.
 */

export interface ConveyInteractionHandle {
  stop(): void
}

// ── Ripple ────────────────────────────────────────────────────────────────────

/**
 * A bounded ripple that marks the exact point of contact. Unlike a generic ripple effect,
 * this one scales from the touch point outward, which teaches the user exactly where their
 * input was registered — information, not decoration.
 *
 * Sets `position: relative` on `el` if it's not already positioned (an absolutely-positioned
 * ripple overlay needs a positioned ancestor), and `overflow: hidden` when `bounded` (matching
 * the Kotlin original's clip-to-bounds default).
 *
 * @param color Ripple color. Should be a light color at ~30% alpha for a dark surface.
 * @param bounded Whether the ripple is clipped to the element's bounds. Bounded = touch is
 *   received; unbounded = touch radiates outward (for icon buttons).
 * @param meaning Grammar meaning for the ripple expansion animation.
 */
export function conveyRipple(
  el: HTMLElement,
  options: { color?: string; bounded?: boolean; grammar?: ConveyGrammar; meaning?: string } = {},
): ConveyInteractionHandle {
  const color = options.color ?? 'rgba(255, 255, 255, 0.28)'
  const bounded = options.bounded ?? true
  const grammar = options.grammar ?? ConveyGrammar.Default
  const { durationMs, easing } = toCss(grammar.get(options.meaning ?? 'confirm'))

  // jsdom's getComputedStyle returns '' (not the real default 'static') for an unset
  // position -- treat both as "needs to become relative".
  const currentPosition = getComputedStyle(el).position
  if (currentPosition === '' || currentPosition === 'static') el.style.position = 'relative'
  if (bounded) el.style.overflow = 'hidden'

  const onPointerDown = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect()
    const centerX = bounded ? e.clientX - rect.left : rect.width / 2
    const centerY = bounded ? e.clientY - rect.top : rect.height / 2
    const radius = Math.min(rect.width, rect.height) * (bounded ? 0.9 : 1.4)

    const ripple = document.createElement('span')
    ripple.style.position = 'absolute'
    ripple.style.left = `${centerX}px`
    ripple.style.top = `${centerY}px`
    ripple.style.width = '0px'
    ripple.style.height = '0px'
    ripple.style.marginLeft = '0px'
    ripple.style.marginTop = '0px'
    ripple.style.borderRadius = '50%'
    ripple.style.backgroundColor = color
    ripple.style.pointerEvents = 'none'
    ripple.style.transform = 'translate(-50%, -50%)'
    el.appendChild(ripple)

    const anim = safeAnimate(
      ripple,
      [
        { width: '0px', height: '0px', opacity: '1' },
        { width: `${radius * 2}px`, height: `${radius * 2}px`, opacity: '0' },
      ],
      { duration: durationMs || 600, easing, fill: 'forwards' },
    )
    const cleanup = () => ripple.remove()
    if (anim) anim.addEventListener('finish', cleanup)
    else cleanup() // no WAAPI: safeAnimate already applied the end state; nothing to await
  }

  el.addEventListener('pointerdown', onPointerDown)
  return { stop: () => el.removeEventListener('pointerdown', onPointerDown) }
}

// ── Press scale ───────────────────────────────────────────────────────────────

/**
 * Physical press feedback via scale. The element shrinks when pressed and recovers with a
 * spring when released. The recovery overshoot (controlled by the grammar's `meaning` spring)
 * teaches that the press was accepted — the spring says "got it."
 *
 * The press-down is always fast (`tween(80ms)`, matching the Kotlin original exactly) — it
 * must feel immediate, since latency here breaks trust. The recovery uses the grammar's
 * declared spec, which gives the product its personality.
 *
 * @param scale How small the element becomes at peak press. `0.94` is convey standard.
 * @param meaning Grammar entry for the recovery animation. `"confirm"` by default.
 */
export function conveyPress(
  el: HTMLElement,
  options: { scale?: number; grammar?: ConveyGrammar; meaning?: string; onClick?: () => void } = {},
): ConveyInteractionHandle {
  const scale = options.scale ?? 0.94
  const grammar = options.grammar ?? ConveyGrammar.Default
  const recovery = toCss(grammar.get(options.meaning ?? 'confirm'))

  let pressed = false

  const onPointerDown = () => {
    pressed = true
    safeAnimate(el, [{ transform: el.style.transform || 'scale(1)' }, { transform: `scale(${scale})` }], {
      duration: 80,
      easing: 'cubic-bezier(0.4, 0, 1, 1)', // FastOutLinearInEasing
      fill: 'forwards',
    })
  }
  const onRelease = (released: boolean) => {
    if (!pressed) return
    pressed = false
    safeAnimate(el, [{ transform: `scale(${scale})` }, { transform: 'scale(1)' }], {
      duration: recovery.durationMs,
      easing: recovery.easing,
      fill: 'forwards',
    })
    if (released) options.onClick?.()
  }
  const onPointerUp = () => onRelease(true)
  const onPointerCancel = () => onRelease(false)
  const onPointerLeave = () => onRelease(false)

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerCancel)
  el.addEventListener('pointerleave', onPointerLeave)

  return {
    stop: () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      el.removeEventListener('pointerleave', onPointerLeave)
    },
  }
}

// ── Long press ────────────────────────────────────────────────────────────────

/**
 * Long press with progressive disclosure. A well-placed indicator does more than a text
 * label: the progress ring on a long-press element tells the user exactly how much longer
 * to hold — no tooltip, no label, no text.
 *
 * The ring appears only after `initiationDelay` — the first few milliseconds feel like a
 * normal tap, so accidental long-presses don't trigger the affordance. Drawn as an SVG
 * overlay (an absolutely-positioned `<svg>` circle) animated via a single WAAPI
 * `stroke-dashoffset` keyframe over `durationMs`, rather than the Kotlin original's manual
 * 16ms-step coroutine loop — the browser's own animation timing handles this more precisely,
 * and `onLongPress` firing is just that same animation's `finish` event.
 *
 * @param durationMs How long the user must hold before `onLongPress` fires.
 * @param initiationDelay How long before the progress ring appears. Prevents flicker on taps.
 * @param progressColor Color of the progress ring's stroke.
 */
export function conveyLongPress(
  el: HTMLElement,
  options: {
    durationMs?: number
    initiationDelay?: number
    progressColor?: string
    onLongPress: () => void
  },
): ConveyInteractionHandle {
  const durationMs = options.durationMs ?? 600
  const initiationDelay = options.initiationDelay ?? 120
  const progressColor = options.progressColor ?? 'rgba(255, 255, 255, 0.7)'

  // jsdom's getComputedStyle returns '' (not the real default 'static') for an unset
  // position -- treat both as "needs to become relative".
  const currentPosition = getComputedStyle(el).position
  if (currentPosition === '' || currentPosition === 'static') el.style.position = 'relative'

  let showTimer: ReturnType<typeof setTimeout> | undefined
  let ring: SVGSVGElement | undefined
  let anim: Animation | undefined

  const clearRing = () => {
    if (showTimer !== undefined) clearTimeout(showTimer)
    showTimer = undefined
    anim?.cancel()
    anim = undefined
    ring?.remove()
    ring = undefined
  }

  const onPointerDown = () => {
    clearRing()
    showTimer = setTimeout(() => {
      const size = 24
      const radius = size / 2 - 2
      const circumference = 2 * Math.PI * radius
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', String(size))
      svg.setAttribute('height', String(size))
      svg.style.position = 'absolute'
      svg.style.top = '50%'
      svg.style.left = '50%'
      svg.style.transform = 'translate(-50%, -50%) rotate(-90deg)'
      svg.style.pointerEvents = 'none'
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(size / 2))
      circle.setAttribute('cy', String(size / 2))
      circle.setAttribute('r', String(radius))
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', progressColor)
      circle.setAttribute('stroke-width', '3')
      circle.setAttribute('stroke-linecap', 'round')
      circle.setAttribute('stroke-dasharray', String(circumference))
      circle.setAttribute('stroke-dashoffset', String(circumference))
      svg.appendChild(circle)
      el.appendChild(svg)
      ring = svg

      anim = safeAnimate(
        circle,
        [{ strokeDashoffset: String(circumference) }, { strokeDashoffset: '0' }],
        { duration: durationMs, easing: 'linear', fill: 'forwards' },
      )
      anim?.addEventListener('finish', () => {
        clearRing()
        options.onLongPress()
      })
    }, initiationDelay)
  }
  const onRelease = () => clearRing()

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onRelease)
  el.addEventListener('pointercancel', onRelease)
  el.addEventListener('pointerleave', onRelease)

  return {
    stop: () => {
      clearRing()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onRelease)
      el.removeEventListener('pointercancel', onRelease)
      el.removeEventListener('pointerleave', onRelease)
    },
  }
}

// ── Swipe resistance ──────────────────────────────────────────────────────────

export type ConveySwipeDirection = 'horizontal' | 'vertical' | 'left' | 'right' | 'up' | 'down'

/**
 * Drag with resistance — the element follows the pointer but pushes back. Resistance
 * teaches the user that the element CAN be dragged but does not want to be moved freely:
 * "drag here is meaningful, not free-form."
 *
 * Used for dismissible items, reorderable lists, and swipe-to-action rows. The resistance
 * factor maps gesture distance to visual offset non-linearly — small gestures produce almost
 * no offset, large gestures produce moderate offset. This is honest: the offset shows effort
 * without implying the action is easy. Ports the Kotlin original's exact resistance formula.
 *
 * @param resistance How much the element resists. `1` = no resistance, `0.3` = very resistant.
 * @param threshold Fraction of `maxDragPx` at which `onSwipe` fires.
 * @param maxDragPx Maximum drag distance before clamping.
 */
export function conveySwipe(
  el: HTMLElement,
  options: {
    direction?: ConveySwipeDirection
    resistance?: number
    threshold?: number
    maxDragPx?: number
    grammar?: ConveyGrammar
    onSwipe: (direction: ConveySwipeDirection) => void
  },
): ConveyInteractionHandle {
  const resistance = options.resistance ?? 0.4
  const threshold = options.threshold ?? 0.5
  const maxDragPx = options.maxDragPx ?? 120
  const grammar = options.grammar ?? ConveyGrammar.Default
  const horizontal =
    (options.direction ?? 'horizontal') === 'horizontal' ||
    options.direction === 'left' ||
    options.direction === 'right'

  let dragging = false
  let offset = 0
  let startX = 0
  let startY = 0

  const applyOffset = () => {
    el.style.transform = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`
  }

  const onPointerDown = (e: PointerEvent) => {
    dragging = true
    startX = e.clientX
    startY = e.clientY
    // jsdom (and so a consumer test) doesn't implement pointer capture -- the same class of
    // gap safeAnimate()/escort.ts's scrollIntoView guard already cover.
    if (typeof el.setPointerCapture === 'function') el.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    const delta = horizontal ? e.clientX - startX : e.clientY - startY
    startX = e.clientX
    startY = e.clientY
    const rawTarget = offset + delta
    const resistedTarget = rawTarget * resistance * (1 - Math.abs(offset) / (maxDragPx * 2))
    offset = Math.min(maxDragPx, Math.max(-maxDragPx, offset + resistedTarget * (1 - resistance)))
    applyOffset()
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    if (typeof el.releasePointerCapture === 'function') el.releasePointerCapture(e.pointerId)

    if (Math.abs(offset) > maxDragPx * threshold) {
      const dir: ConveySwipeDirection = horizontal ? (offset > 0 ? 'right' : 'left') : offset > 0 ? 'down' : 'up'
      options.onSwipe(dir)
    }

    const { durationMs, easing } = toCss(grammar.get('dismiss'))
    const from = horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)`
    const to = horizontal ? 'translateX(0px)' : 'translateY(0px)'
    offset = 0
    safeAnimate(el, [{ transform: from }, { transform: to }], { duration: durationMs, easing, fill: 'forwards' })
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)

  return {
    stop: () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    },
  }
}
