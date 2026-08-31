/**
 * Pure-math 2D physics primitives -- the web port of convey's `foundation/ConveyForceDynamics.kt`.
 * A hand-scoped, purpose-built primitive set for `ConveySvoScene`'s subject/object simulation,
 * not a general-purpose physics engine and no external physics dependency, same as the Kotlin
 * original.
 */

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export const Vec2 = {
  Zero: { x: 0, y: 0 } as Vec2,
  of(x: number, y: number): Vec2 {
    return { x, y }
  },
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y }
  },
  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y }
  },
  scale(v: Vec2, scalar: number): Vec2 {
    return { x: v.x * scalar, y: v.y * scalar }
  },
  length(v: Vec2): number {
    return Math.hypot(v.x, v.y)
  },
  /** The unit vector in `v`'s direction, or `Vec2.Zero` if `v` is (near) zero length. */
  normalizedOrZero(v: Vec2): Vec2 {
    const len = Vec2.length(v)
    if (len < 1e-4) return Vec2.Zero
    return { x: v.x / len, y: v.y / len }
  },
}

/** A force pulling `from` toward `to` at `strength` (in `from`'s direction of travel). */
export function attraction(from: Vec2, to: Vec2, strength: number): Vec2 {
  return Vec2.scale(Vec2.normalizedOrZero(Vec2.sub(to, from)), strength)
}

/** A force pushing `from` away from `to` at `strength`. Not currently used by `ConveySvoScene`, ported for parity with the Kotlin original's public API. */
export function repulsion(from: Vec2, to: Vec2, strength: number): Vec2 {
  return Vec2.scale(Vec2.normalizedOrZero(Vec2.sub(to, from)), -strength)
}

export function hasCollided(a: Vec2, b: Vec2, combinedRadius: number): boolean {
  return Vec2.length(Vec2.sub(b, a)) <= combinedRadius
}

/**
 * A single moving body, integrated with semi-implicit (symplectic) Euler: velocity updates
 * from force first, `damping` is applied multiplicatively to velocity every step (not
 * exponential-decay-correct, but simple and stable for small per-frame `dtSeconds`), then
 * position integrates from the newly damped velocity. One integration step per call --
 * the caller drives it once per animation frame with the real measured frame delta.
 */
export class ConveyRigidBody {
  #position: Vec2
  #velocity: Vec2 = Vec2.Zero
  readonly mass: number
  readonly damping: number

  constructor(initialPosition: Vec2, mass = 1, damping = 0.9) {
    this.#position = initialPosition
    this.mass = mass
    this.damping = damping
  }

  get position(): Vec2 {
    return this.#position
  }

  get velocity(): Vec2 {
    return this.#velocity
  }

  applyForce(force: Vec2, dtSeconds: number): void {
    this.#velocity = Vec2.scale(Vec2.add(this.#velocity, Vec2.scale(force, dtSeconds / this.mass)), this.damping)
    this.#position = Vec2.add(this.#position, Vec2.scale(this.#velocity, dtSeconds))
  }

  stop(): void {
    this.#velocity = Vec2.Zero
  }

  snapTo(newPosition: Vec2): void {
    this.#position = newPosition
  }
}

/**
 * A scalar damped harmonic oscillator (`ẍ = -k·x - 2ζ√k·ẋ`), symplectic-Euler-integrated
 * same as `ConveyRigidBody`. `displacement` is read directly as a squash/stretch scale
 * multiplier by `ConveySvoScene` -- it stands in for a true per-vertex spring-mass mesh,
 * which would need glyph vector-mesh access this library doesn't have.
 */
export class ConveySpringMassBody {
  #displacement = 0
  #velocity = 0
  readonly #stiffness: number
  readonly #dampingRatio: number

  constructor(stiffness = 220, dampingRatio = 0.35) {
    this.#stiffness = stiffness
    this.#dampingRatio = dampingRatio
  }

  get displacement(): number {
    return this.#displacement
  }

  impulse(strength: number): void {
    this.#velocity += strength
  }

  step(dtSeconds: number): void {
    const springForce = -this.#stiffness * this.#displacement
    const dampingForce = -2 * this.#dampingRatio * Math.sqrt(this.#stiffness) * this.#velocity
    this.#velocity += (springForce + dampingForce) * dtSeconds
    this.#displacement += this.#velocity * dtSeconds
  }
}

/**
 * A periodic locomotion bob/tilt approximation -- stands in for true multi-bone IK (out of
 * scope: no vector-glyph "limb" mesh to attach IK to). Cadence itself (not just amplitude)
 * scales with speed, floored at 0.4x so a just-started subject doesn't freeze-frame-step;
 * amplitude of both `bobPx` and `tiltDegrees` scales to zero as speed approaches zero, so a
 * stationary word doesn't perpetually fidget.
 */
export class ConveyGaitOscillator {
  #phase = 0
  readonly #strideHz: number
  readonly #referenceSpeedPxPerSec: number

  constructor(strideHz = 2.4, referenceSpeedPxPerSec = 260) {
    this.#strideHz = strideHz
    this.#referenceSpeedPxPerSec = referenceSpeedPxPerSec
  }

  step(dtSeconds: number, speedPxPerSec: number): void {
    const cadence = this.#strideHz * (0.4 + 0.6 * clamp01(speedPxPerSec / this.#referenceSpeedPxPerSec))
    this.#phase += cadence * 2 * Math.PI * dtSeconds
  }

  /** A non-negative bounce (`abs(sin(phase))`), not an oscillation through zero on both sides. */
  bobPx(speedPxPerSec: number, amplitudePx = 4): number {
    const intensity = clamp01(speedPxPerSec / this.#referenceSpeedPxPerSec)
    return amplitudePx * intensity * Math.abs(Math.sin(this.#phase))
  }

  /** A symmetric side-to-side swing (`cos(phase)`). */
  tiltDegrees(speedPxPerSec: number, amplitudeDegrees = 6): number {
    const intensity = clamp01(speedPxPerSec / this.#referenceSpeedPxPerSec)
    return amplitudeDegrees * intensity * Math.cos(this.#phase)
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
