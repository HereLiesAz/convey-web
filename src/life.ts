import { safeAnimate, toCss } from './tokens/motion.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Continuous idle motion for chrome that should never look inert — the web port of convey's
 * `ConveyLife`.
 *
 * `ConveyAffordance` teaches once, then stops — that is correct for a control the user is
 * about to touch. But some elements are not controls. A live counter, a status badge, a
 * presence indicator: these are not teaching interactivity, they are reporting that the
 * system is alive right now. `ConveyLife` is that second category, made structural.
 *
 * Each profile has a distinct amplitude/period signature so two different `ConveyLife`
 * profiles never read as the same thing moving. If you need a new idle behavior, add a
 * profile — do not tune an existing one until it means something else.
 *
 * Unlike `ConveyAffordance`, `ConveyLife` never stops on its own. Stop it explicitly (call
 * the returned handle's `stop()`) when the thing it represents actually goes quiet — a badge
 * that breathes forever after its subject has gone offline is a lie the UI is telling.
 *
 * ```ts
 * applyConveyLife(badgeElement, ConveyLife.Breathe({ period: 2600 }))
 * ```
 */
export type ConveyLifeProfile =
  | { readonly kind: 'none' }
  | { readonly kind: 'breathe'; readonly period?: number; readonly peakScale?: number; readonly minOpacity?: number }
  | { readonly kind: 'twinkle'; readonly period?: number; readonly minOpacity?: number }
  | { readonly kind: 'wobble'; readonly period?: number; readonly skewDegrees?: number }

export const ConveyLife = {
  None: { kind: 'none' } as const,
  Breathe: (opts: Omit<Extract<ConveyLifeProfile, { kind: 'breathe' }>, 'kind'> = {}): ConveyLifeProfile => ({
    kind: 'breathe',
    ...opts,
  }),
  Twinkle: (opts: Omit<Extract<ConveyLifeProfile, { kind: 'twinkle' }>, 'kind'> = {}): ConveyLifeProfile => ({
    kind: 'twinkle',
    ...opts,
  }),
  Wobble: (opts: Omit<Extract<ConveyLifeProfile, { kind: 'wobble' }>, 'kind'> = {}): ConveyLifeProfile => ({
    kind: 'wobble',
    ...opts,
  }),
} as const

export interface ConveyLifeHandle {
  stop(): void
}

/** Samples `fn` over one period into WAAPI keyframes — the same sampling approach `springToLinearEasing` uses for springs. */
function sineKeyframes(fn: (wave: number) => Keyframe, samples = 32): Keyframe[] {
  const frames: Keyframe[] = []
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * 2 * Math.PI
    const wave = (Math.sin(t) + 1) / 2 // 0..1
    frames.push(fn(wave))
  }
  return frames
}

/**
 * Applies continuous idle motion described by `profile`. A no-op (returns a handle whose
 * `stop()` does nothing) for `ConveyLife.None`.
 *
 * `phaseOffsetMs` staggers multiple elements sharing one profile (e.g. each letter of a
 * word, each item in a live list) so they don't move in unison — synchronized idle motion
 * reads as one puppet, staggered idle motion reads as several living things. Implemented via
 * WAAPI's `iterationStart` (a fractional starting point into the infinite loop), the native
 * primitive for exactly this — no manual phase-clock math needed the way the Kotlin
 * original's `rememberInfiniteLoop` computes it by hand.
 */
export function applyConveyLife(
  el: HTMLElement,
  profile: ConveyLifeProfile,
  options: { phaseOffsetMs?: number; enabled?: boolean } = {},
): ConveyLifeHandle {
  const enabled = options.enabled ?? true
  if (!enabled || profile.kind === 'none') return { stop: () => {} }

  const period = 'period' in profile ? profile.period ?? defaultPeriod(profile.kind) : defaultPeriod(profile.kind)
  const phaseOffsetMs = options.phaseOffsetMs ?? 0
  const iterationStart = ((phaseOffsetMs % period) + period) % period / period

  let keyframes: Keyframe[]
  switch (profile.kind) {
    case 'breathe': {
      const peakScale = profile.peakScale ?? 1.12
      const minOpacity = profile.minOpacity ?? 0.82
      keyframes = sineKeyframes((wave) => ({
        transform: `scale(${1 + (peakScale - 1) * wave})`,
        opacity: String(minOpacity + (1 - minOpacity) * wave),
      }))
      break
    }
    case 'twinkle': {
      const minOpacity = profile.minOpacity ?? 0.5
      keyframes = sineKeyframes((wave) => ({ opacity: String(minOpacity + (1 - minOpacity) * wave) }))
      break
    }
    case 'wobble': {
      const skewDegrees = profile.skewDegrees ?? 4
      // Kotlin's wave here has no phase offset (phase = 0.0) but is centered differently --
      // rotationZ/scaleY swing through zero, not 0..1, so remap the shared 0..1 wave to -1..1.
      keyframes = sineKeyframes((wave) => {
        const signed = wave * 2 - 1
        return { transform: `rotate(${skewDegrees * signed}deg) scaleY(${1 + 0.05 * signed})` }
      })
      break
    }
  }

  const anim = safeAnimate(el, keyframes, {
    duration: period,
    easing: 'linear',
    iterations: Infinity,
    iterationStart,
  })

  return {
    stop: () => {
      anim?.cancel()
      el.style.transform = ''
      el.style.opacity = ''
    },
  }
}

function defaultPeriod(kind: ConveyLifeProfile['kind']): number {
  switch (kind) {
    case 'breathe':
      return 2600
    case 'twinkle':
      return 2200
    case 'wobble':
      return 4500
    default:
      return 2600
  }
}

/**
 * Plays a one-shot amplified motion — the web port of `ConveyLife.Burst`/
 * `Modifier.conveyLifeBurst`: the "delight" moment when a living element is deliberately
 * struck (tapped, achieved, completed). Call this after setting up `applyConveyLife` so the
 * burst reads as an amplification of the idle motion, not a replacement for it.
 *
 * Imperative, not trigger-value-watching: the Kotlin original keys off a `trigger` value
 * changing via `LaunchedEffect(trigger)`, special-casing `trigger == 0 || trigger == false`
 * to avoid firing on first composition with a default sentinel value. There's no composition
 * lifecycle here to hook a value-change comparison into, so this just fires immediately when
 * called — call it yourself exactly when you want the burst to play, with no sentinel to
 * avoid (there's no "first call" ambiguity for an imperative function the way there is for a
 * reactive trigger prop).
 */
export function triggerConveyLifeBurst(
  el: HTMLElement,
  options: { peakScale?: number; grammar?: ConveyGrammar; meaning?: string } = {},
): void {
  const peakScale = options.peakScale ?? 1.35
  const grammar = options.grammar ?? ConveyGrammar.Default
  const recovery = toCss(grammar.get(options.meaning ?? 'delight'))

  const up = safeAnimate(el, [{ transform: el.style.transform || 'scale(1)' }, { transform: `scale(${peakScale})` }], {
    duration: 160,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    fill: 'forwards',
  })
  if (up === undefined) return // no WAAPI: safeAnimate already applied scale(peakScale); nothing to chain
  up.addEventListener('finish', () => {
    safeAnimate(el, [{ transform: `scale(${peakScale})` }, { transform: 'scale(1)' }], {
      duration: recovery.durationMs,
      easing: recovery.easing,
      fill: 'forwards',
    })
  })
}
