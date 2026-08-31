import { ConveyMotion, type AnimationSpec } from './tokens/motion.js'

/**
 * A motion vocabulary for a convey-web surface — the web port of convey's `ConveyGrammar`.
 *
 * The Conveyance Manifesto says: "Motion is grammar. One meaning per animation signature,
 * used consistently." This class makes that contract structural — not a guideline but a
 * type. You do not pass a raw `AnimationSpec` to convey-web components. You pass a
 * `meaning` string. The grammar maps meanings to specs and enforces that:
 *
 *   - No meaning is declared twice (`Builder.meaning` throws on a duplicate key)
 *   - Unknown meanings fail loudly at the point of use, not silently at render
 *
 * This is not about aesthetics. It is about legibility. A user who has seen "navigate"
 * once knows what "navigate" means everywhere. That is only possible if "navigate"
 * always moves the same way.
 *
 * Usage:
 * ```ts
 * const grammar = buildConveyGrammar((g) => {
 *   g.meaning('navigate', 'Spatial transition.', { kind: 'spring', stiffness: 380, dampingRatio: 0.8 })
 *   g.meaning('reveal', 'New content entered the surface.', { kind: 'spring', stiffness: 200, dampingRatio: 0.9 })
 *   g.meaning('error', 'Something is wrong. Does not animate.', { kind: 'snap' })
 * })
 * ```
 */

export interface GrammarEntry {
  readonly meaning: string
  readonly spec: AnimationSpec
  readonly description: string
}

export class ConveyGrammarBuilder {
  private readonly entries = new Map<string, GrammarEntry>()

  /**
   * Declare what a motion means. `meaning` is a verb in plain language — what is
   * HAPPENING when this animation plays? "navigate", "confirm", "dismiss", "reveal",
   * "error", "reorder". Not "fast-spring" or "smooth". Not parameters. What it MEANS.
   */
  meaning(meaning: string, description: string, spec: AnimationSpec): this {
    if (meaning.trim() === '') {
      throw new Error('ConveyGrammar: meaning cannot be blank.')
    }
    if (this.entries.has(meaning)) {
      throw new Error(`ConveyGrammar: "${meaning}" is already declared. Each meaning is declared once.`)
    }
    this.entries.set(meaning, { meaning, spec, description })
    return this
  }

  build(): ConveyGrammar {
    return new ConveyGrammar(this.entries)
  }
}

export function buildConveyGrammar(block: (builder: ConveyGrammarBuilder) => void): ConveyGrammar {
  const builder = new ConveyGrammarBuilder()
  block(builder)
  return builder.build()
}

export class ConveyGrammar {
  private readonly entries: ReadonlyMap<string, GrammarEntry>

  /** @internal Construct via `ConveyGrammar.builder()`/`buildConveyGrammar`, not directly. */
  constructor(entries: ReadonlyMap<string, GrammarEntry>) {
    this.entries = entries
  }

  /** Retrieve the animation spec for a declared meaning. Fails fast on unknown meanings. */
  get(meaning: string): AnimationSpec {
    const entry = this.entries.get(meaning)
    if (!entry) {
      throw new Error(
        `ConveyGrammar: "${meaning}" is not in this grammar's vocabulary.\n` +
          `Registered: ${[...this.entries.keys()].map((k) => `"${k}"`).join(', ')}\n` +
          'Every animation in a convey-web surface must carry a declared meaning. ' +
          'If you need a new motion, add it to your grammar — do not bypass it.',
      )
    }
    return entry.spec
  }

  entry(meaning: string): GrammarEntry {
    const entry = this.entries.get(meaning)
    if (!entry) throw new Error(`ConveyGrammar: "${meaning}" not found.`)
    return entry
  }

  /** All declared meanings. Useful for tooling and audits. */
  get vocabulary(): ReadonlySet<string> {
    return new Set(this.entries.keys())
  }

  /**
   * Runtime audit: returns a human-readable report of the grammar.
   * In development, call this and log it. Let the team read it.
   * It should be short. If it isn't, the grammar is too complex.
   */
  audit(): string {
    const lines: string[] = []
    lines.push('╔══════════════════════════════════')
    lines.push('║ ConveyGrammar — Motion Vocabulary')
    lines.push('╠══════════════════════════════════')
    for (const entry of this.entries.values()) {
      lines.push(`║  ${entry.meaning.padEnd(16)} → ${entry.description}`)
    }
    lines.push('╚══════════════════════════════════')
    if (this.entries.size > 8) {
      lines.push(
        `⚠ ${this.entries.size} motion meanings is a lot. Conveyance favors fewer, more deliberate ones.`,
      )
    }
    return lines.join('\n')
  }

  static builder(): ConveyGrammarBuilder {
    return new ConveyGrammarBuilder()
  }

  /**
   * The Conveyance default grammar. Start here, override what your product needs.
   * These are not arbitrary — each is named for what it communicates to the user.
   *
   * Assigned just below the class body, not as a static field initializer: a static
   * initializer here would call `ConveyGrammarBuilder.build()` → `new ConveyGrammar(...)`
   * *during* this class's own declaration, while the `ConveyGrammar` binding is still in
   * its temporal dead zone — a real circular-construction hazard, not a style preference.
   */
  static Default: ConveyGrammar
}

ConveyGrammar.Default = new ConveyGrammarBuilder()
  .meaning(
    'navigate',
    'Spatial transition: user moved to a different place in the hierarchy.',
    { kind: 'spring', stiffness: 380, dampingRatio: 0.8 },
  )
  .meaning(
    'reveal',
    'New content entered the surface — user did not navigate, content came to them.',
    { kind: 'spring', stiffness: 200, dampingRatio: 0.88 },
  )
  .meaning(
    'confirm',
    'System acknowledged a user action. Snappy — confirms receipt, never lingers.',
    { kind: 'spring', stiffness: 600, dampingRatio: 0.72 },
  )
  .meaning(
    'dismiss',
    'Content left. Not dramatic — it earned its exit by completing its job.',
    { kind: 'tween', durationMillis: 180, easing: ConveyMotion.Exit.easing },
  )
  .meaning(
    'morph',
    'One element became another. The continuity is the message.',
    { kind: 'spring', stiffness: 280, dampingRatio: 0.78 },
  )
  .meaning(
    'load',
    'System is working. Not anxious — just honest about latency.',
    { kind: 'tween', durationMillis: 300, easing: 'linear' },
  )
  .meaning(
    'error',
    'Something is wrong and needs attention. Does not animate — it interrupts.',
    { kind: 'snap' },
  )
  .meaning(
    'delight',
    'Hero moment. Peak expressiveness. Use once per key user achievement.',
    { kind: 'spring', stiffness: 260, dampingRatio: 0.38 },
  )
  .build()
