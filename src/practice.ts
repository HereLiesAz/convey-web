import type { AnimationSpec, SpringSpec, TweenSpec } from './tokens/motion.js'
import { applyConveyAffordance, ConveyAffordance, type ConveyAffordanceHandle, type ConveyAffordanceKind } from './affordance.js'
import { ConveyGrammar } from './grammar.js'

/**
 * Practice-decay (§6.3): "The person who has seen it four thousand times wants speed, not
 * pedagogy... its ceremony attenuates with familiarity, in the same way a skilled musician's
 * motions get smaller." The web port of convey's `ConveyPracticeRegistry`/
 * `conveyPracticeDecay`/`decayed`.
 *
 * Elements track their own operation count; `ConveyPracticeRegistry` is where that count
 * lives, `conveyPracticeDecay()` turns a count into a `1..floor` multiplier, and `decayed()`
 * is where that multiplier gets spent: shortening a motion's ceremony.
 *
 * Scoped to the current session — in-memory only, the same as every other Convey registry
 * (`ConveyWeightRegistry`, `ConveyEmploymentRegistry`). Whether practice should survive a page
 * reload (so a returning user's first minute back doesn't reset ceremony to first-time levels)
 * is a real product decision this package does not make for you — `seed()` a key's count from
 * your own persistence layer (e.g. `localStorage`) if you want that.
 *
 * Also here: `conveyPracticedAffordance`, the practice-gated web port of Kotlin's
 * `Modifier.conveyPracticedAffordance` — once `key` has recorded an operation, the Tell has
 * already taught its lesson once, so it's silently replaced with `ConveyAffordance.None` before
 * being applied. Teaching it again is not compassion, it's noise.
 */
export class ConveyPracticeRegistry {
  private readonly counts = new Map<unknown, number>()

  /**
   * Records one genuine operation of the element identified by `key`. Call this from the
   * actual interaction handler (e.g. inside a click listener) — not from a render/layout
   * pass, since a re-render is not a person doing the thing.
   */
  recordOperation(key: unknown): void {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)
  }

  /** The number of recorded operations for `key`. Zero for a key that has never operated. */
  operationCount(key: unknown): number {
    return this.counts.get(key) ?? 0
  }

  /** Sets `key`'s operation count directly, e.g. restored from your own persistence layer. */
  seed(key: unknown, count: number): void {
    this.counts.set(key, count)
  }
}

/**
 * The decay curve: exponential falloff from `1` (first time, full ceremony) toward `floor` as
 * `operationCount` grows, roughly halfway there at `halfLife` operations. `floor` is where a
 * skilled musician's motions stop getting smaller — practice-decay attenuates ceremony, it
 * does not remove motion's meaning entirely (see `ConveyGrammar` — the world's grammar never
 * changes).
 */
export function conveyPracticeDecay(operationCount: number, floor = 0.4, halfLife = 5): number {
  if (floor < 0 || floor > 1) throw new Error(`floor must be in 0..1, was ${floor}`)
  if (halfLife <= 0) throw new Error(`halfLife must be positive, was ${halfLife}`)
  const raw = Math.pow(0.5, operationCount / halfLife)
  return floor + (1 - floor) * raw
}

/**
 * Applies `decay` (see `conveyPracticeDecay`) to an animation spec's ceremony: a `TweenSpec`
 * gets proportionally shorter, never below `minDurationMillis`; a `SpringSpec` gets
 * proportionally stiffer (snappier), never above `maxStiffness`. `decay = 1` (unpracticed)
 * leaves the spec unchanged. A `SnapSpec` (no ceremony to remove) is returned unchanged —
 * there is no universal "less ceremony" transform for every spec shape.
 */
export function decayed(
  spec: AnimationSpec,
  decay: number,
  minDurationMillis = 80,
  maxStiffness = 10_000 * 4, // Spring.StiffnessHigh (Compose) * 4, ported as a literal constant
): AnimationSpec {
  switch (spec.kind) {
    case 'tween': {
      const tween = spec as TweenSpec
      return {
        kind: 'tween',
        durationMillis: Math.max(minDurationMillis, Math.trunc(tween.durationMillis * decay)),
        easing: tween.easing,
      }
    }
    case 'spring': {
      const springSpec = spec as SpringSpec
      return {
        kind: 'spring',
        dampingRatio: springSpec.dampingRatio,
        stiffness: Math.min(maxStiffness, springSpec.stiffness / decay),
      }
    }
    default:
      return spec
  }
}

/**
 * Applies `affordance` to `el`, but only if `key` has never recorded an operation in `registry`
 * — the web port of Kotlin's `Modifier.conveyPracticedAffordance`. Once the person has done the
 * thing for real (`registry.recordOperation(key)` called from your click handler), the Tell has
 * done its job; further reminders read as noise, not compassion, so this substitutes
 * `ConveyAffordance.None` instead.
 */
export function conveyPracticedAffordance(
  el: HTMLElement,
  key: unknown,
  affordance: ConveyAffordanceKind,
  registry: ConveyPracticeRegistry,
  grammar: ConveyGrammar = ConveyGrammar.Default,
): ConveyAffordanceHandle {
  const practiced = registry.operationCount(key) > 0
  const effectiveAffordance = practiced ? ConveyAffordance.None : affordance
  return applyConveyAffordance(el, effectiveAffordance, grammar)
}
