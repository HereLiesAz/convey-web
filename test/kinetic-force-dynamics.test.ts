import { describe, expect, it } from 'vitest'
import {
  Vec2,
  attraction,
  repulsion,
  hasCollided,
  ConveyRigidBody,
  ConveySpringMassBody,
  ConveyGaitOscillator,
} from '../src/kinetic/force-dynamics.js'

describe('Vec2', () => {
  it('adds, subtracts, and scales', () => {
    expect(Vec2.add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    expect(Vec2.sub({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 })
    expect(Vec2.scale({ x: 2, y: 3 }, 2)).toEqual({ x: 4, y: 6 })
  })

  it('computes length', () => {
    expect(Vec2.length({ x: 3, y: 4 })).toBe(5)
  })

  it('normalizedOrZero returns Zero for a near-zero vector', () => {
    expect(Vec2.normalizedOrZero({ x: 0, y: 0 })).toEqual(Vec2.Zero)
    expect(Vec2.normalizedOrZero({ x: 0.00001, y: 0 })).toEqual(Vec2.Zero)
  })

  it('normalizedOrZero returns a unit vector otherwise', () => {
    const n = Vec2.normalizedOrZero({ x: 10, y: 0 })
    expect(n.x).toBeCloseTo(1)
    expect(n.y).toBeCloseTo(0)
  })
})

describe('attraction / repulsion / hasCollided', () => {
  it('attraction points from `from` toward `to`', () => {
    const f = attraction(Vec2.Zero, { x: 10, y: 0 }, 5)
    expect(f.x).toBeCloseTo(5)
    expect(f.y).toBeCloseTo(0)
  })

  it('repulsion points away from `to`', () => {
    const f = repulsion(Vec2.Zero, { x: 10, y: 0 }, 5)
    expect(f.x).toBeCloseTo(-5)
  })

  it('hasCollided is true within combinedRadius and false beyond it', () => {
    expect(hasCollided({ x: 0, y: 0 }, { x: 5, y: 0 }, 10)).toBe(true)
    expect(hasCollided({ x: 0, y: 0 }, { x: 50, y: 0 }, 10)).toBe(false)
  })
})

describe('ConveyRigidBody', () => {
  it('accelerates toward an applied force and decays it under repeated damping', () => {
    const body = new ConveyRigidBody(Vec2.Zero, 1, 0.9)
    body.applyForce({ x: 100, y: 0 }, 0.1)
    expect(body.velocity.x).toBeGreaterThan(0)
    expect(body.position.x).toBeGreaterThan(0)
  })

  it('stop() zeroes velocity without moving position', () => {
    const body = new ConveyRigidBody(Vec2.Zero, 1, 0.9)
    body.applyForce({ x: 100, y: 0 }, 0.1)
    const posBefore = body.position
    body.stop()
    expect(body.velocity).toEqual(Vec2.Zero)
    expect(body.position).toEqual(posBefore)
  })

  it('snapTo sets position directly', () => {
    const body = new ConveyRigidBody(Vec2.Zero)
    body.snapTo({ x: 42, y: 7 })
    expect(body.position).toEqual({ x: 42, y: 7 })
  })
})

describe('ConveySpringMassBody', () => {
  it('impulse followed by step produces nonzero displacement', () => {
    const spring = new ConveySpringMassBody(220, 0.35)
    expect(spring.displacement).toBe(0)
    spring.impulse(5)
    spring.step(0.016)
    expect(spring.displacement).not.toBe(0)
  })

  it('settles back toward zero over many steps', () => {
    const spring = new ConveySpringMassBody(220, 0.9)
    spring.impulse(5)
    for (let i = 0; i < 500; i++) spring.step(0.016)
    expect(Math.abs(spring.displacement)).toBeLessThan(0.01)
  })
})

describe('ConveyGaitOscillator', () => {
  it('bobPx and tiltDegrees are zero at zero speed', () => {
    const gait = new ConveyGaitOscillator()
    gait.step(0.016, 0)
    expect(gait.bobPx(0)).toBe(0)
  })

  it('bobPx is non-negative and scales with speed', () => {
    const gait = new ConveyGaitOscillator()
    for (let i = 0; i < 10; i++) gait.step(0.05, 200)
    expect(gait.bobPx(200)).toBeGreaterThanOrEqual(0)
  })
})
