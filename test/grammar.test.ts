import { describe, expect, it } from 'vitest'
import { buildConveyGrammar, ConveyGrammar } from '../src/grammar.js'

describe('ConveyGrammar', () => {
  it('Default declares the eight named meanings', () => {
    expect([...ConveyGrammar.Default.vocabulary].sort()).toEqual(
      ['confirm', 'delight', 'dismiss', 'error', 'load', 'morph', 'navigate', 'reveal'].sort(),
    )
  })

  it('get() returns the declared spec', () => {
    const spec = ConveyGrammar.Default.get('navigate')
    expect(spec.kind).toBe('spring')
  })

  it('get() throws on an unknown meaning, listing the real vocabulary', () => {
    expect(() => ConveyGrammar.Default.get('teleport')).toThrowError(/not in this grammar's vocabulary/)
  })

  it('error meaning is a snap — it does not animate', () => {
    expect(ConveyGrammar.Default.get('error')).toEqual({ kind: 'snap' })
  })

  it('Builder rejects a blank meaning', () => {
    expect(() =>
      buildConveyGrammar((g) => {
        g.meaning('', 'x', { kind: 'snap' })
      }),
    ).toThrow(/cannot be blank/)
  })

  it('Builder rejects declaring the same meaning twice', () => {
    expect(() =>
      buildConveyGrammar((g) => {
        g.meaning('navigate', 'a', { kind: 'snap' })
        g.meaning('navigate', 'b', { kind: 'snap' })
      }),
    ).toThrow(/already declared/)
  })

  it('audit() lists every meaning and warns past eight', () => {
    const report = ConveyGrammar.Default.audit()
    expect(report).toContain('navigate')
    expect(report).toContain('delight')
    expect(report).not.toContain('⚠')
  })
})
