/**
 * Shape vocabulary for the Conveyance system — the web port of convey's `ConveyShape`.
 *
 * Shape is not decoration. Shape is a signal.
 *
 * The Manifesto says: "Use varied corner radii and forms to direct focus without literal
 * arrows." This is the implementation of that principle as CSS tokens.
 *
 * Hierarchy of shape signals (most to least interactive-seeming):
 *   Circle (50%) > Squircle (35%) > ExtraLarge (28px) > Large (16px) > Medium (12px)
 *   > Small (8px) > None (0px) > Cut (mechanical)
 *
 * A circle invites touch more than a rounded rectangle.
 * A rounded rectangle invites touch more than a sharp rectangle.
 * A cut corner signals precision and structure over warmth.
 *
 * Use these as semantic tokens, not as numeric radius preferences. "I want 14px radius"
 * is not a design decision. "This element should feel approachable but not primary" —
 * that's a design decision. The answer might be Medium.
 *
 * `radius` values port `RoundedCornerShape`'s px values 1:1 (Compose's dp is already a
 * density-independent px). `Cut`/`CutSmall` port `CutCornerShape` as a `clip-path`
 * polygon, since CSS `border-radius` cannot express a chamfered corner.
 */

export interface ConveyShapeToken {
  readonly name: string
  /** A valid CSS `border-radius` value, or `undefined` when `clipPath` is used instead. */
  readonly borderRadius?: string
  /** A valid CSS `clip-path` value, for shapes `border-radius` cannot express (chamfers). */
  readonly clipPath?: string
}

function rounded(name: string, borderRadius: string): ConveyShapeToken {
  return { name, borderRadius }
}

/** A 45° chamfer of `size` on every corner, as a CSS `clip-path: polygon(...)`. */
function cutCorners(name: string, size: string): ConveyShapeToken {
  return {
    name,
    clipPath: `polygon(${size} 0, calc(100% - ${size}) 0, 100% ${size}, 100% calc(100% - ${size}), calc(100% - ${size}) 100%, ${size} 100%, 0 calc(100% - ${size}), 0 ${size})`,
  }
}

export const ConveyShape = {
  /**
   * 50% radius.
   * Maximum interactivity signal. "Touch me."
   * Use for: FABs, icon buttons, avatar indicators, the single most touchable element.
   * Do not use for anything that is not strongly interactive.
   */
  Circle: rounded('Circle', '50%'),

  /**
   * ~35% radius. Superellipse approximation.
   * Friendly and approachable without commanding primary attention.
   * Use for: chips, tags, status badges, pill-shaped secondary actions.
   */
  Squircle: rounded('Squircle', '35%'),

  /**
   * 28px radius.
   * Prominent cards and large interactive surfaces.
   * Use for: bottom sheets, dialogs, hero cards, feature tiles.
   */
  ExtraLarge: rounded('ExtraLarge', '28px'),

  /**
   * 16px radius.
   * Standard cards and most containers.
   * Use for: list cards, input containers, navigation items.
   */
  Large: rounded('Large', '16px'),

  /**
   * 12px radius.
   * Medium interactive elements.
   * Use for: chips, filters, segmented buttons, small cards.
   */
  Medium: rounded('Medium', '12px'),

  /**
   * 8px radius.
   * Small elements and compact surfaces.
   * Use for: badges, small chips, snackbars.
   */
  Small: rounded('Small', '8px'),

  /**
   * 4px radius.
   * Near-sharp elements that still feel slightly finished.
   * Use for: dense data tables, compact list items, code blocks.
   */
  XSmall: rounded('XSmall', '4px'),

  /**
   * 0px radius.
   * Full-bleed and structural.
   * Use for: edge-to-edge surfaces, structural dividers, backgrounds.
   * Not for interactive elements — sharp corners signal "this is not for touching."
   */
  None: rounded('None', '0px'),

  /**
   * Cut corners (45° chamfer, 12px).
   * Mechanical, precise, systematic. Not warm.
   * Use for: settings panels, developer tools, system UI, anything that signals
   * "this is infrastructure, not content." If your product is warm and human,
   * you probably do not need this.
   */
  Cut: cutCorners('Cut', '12px'),

  /**
   * Cut corners, small chamfer (6px).
   * Subtle mechanical signal.
   */
  CutSmall: cutCorners('CutSmall', '6px'),

  /**
   * Top-rounded only. For elements attached to a bottom edge.
   * Use for: bottom sheets before they fully expand, sticky bottom panels.
   */
  TopLarge: rounded('TopLarge', '16px 16px 0 0'),
  TopExtraLarge: rounded('TopExtraLarge', '28px 28px 0 0'),

  /**
   * Bottom-rounded only. For elements attached to a top edge.
   */
  BottomLarge: rounded('BottomLarge', '0 0 16px 16px'),
} as const satisfies Record<string, ConveyShapeToken>

/** All shapes in ascending radius order. Use for interpolating between shape tokens. */
export const shapeScale: readonly ConveyShapeToken[] = [
  ConveyShape.None,
  ConveyShape.XSmall,
  ConveyShape.Small,
  ConveyShape.Medium,
  ConveyShape.Large,
  ConveyShape.ExtraLarge,
  ConveyShape.Squircle,
  ConveyShape.Circle,
]

/**
 * The shape that sits one level above `shapeValue` in the hierarchy.
 * Returns `Circle` if `shapeValue` is already `Circle` or not in the scale.
 * Used for expanding elements — a card expanding to full-screen should progress
 * from Large toward ExtraLarge, not toward Circle.
 */
export function escalate(shapeValue: ConveyShapeToken): ConveyShapeToken {
  const idx = shapeScale.indexOf(shapeValue)
  const last = shapeScale[shapeScale.length - 1]!
  if (idx < 0 || idx >= shapeScale.length - 1) return last
  return shapeScale[idx + 1]!
}

export function deescalate(shapeValue: ConveyShapeToken): ConveyShapeToken {
  const idx = shapeScale.indexOf(shapeValue)
  if (idx <= 0) return shapeScale[0]!
  return shapeScale[idx - 1]!
}

/** Applies a `ConveyShapeToken` to an element's `border-radius`/`clip-path` as appropriate. */
export function applyShape(el: HTMLElement, shapeValue: ConveyShapeToken): void {
  el.style.borderRadius = shapeValue.borderRadius ?? ''
  el.style.clipPath = shapeValue.clipPath ?? ''
}
