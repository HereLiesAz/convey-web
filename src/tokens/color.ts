import type { ConveyWeight } from '../weight.js'

/**
 * Semantic color system for the Conveyance design system — the web port of convey's
 * `ConveyColor`.
 *
 * The Manifesto says: "Dynamic color implicitly prioritizes. Primary/secondary/tertiary
 * contrast implicitly prioritizes actions without literal arrows."
 *
 * This is the implementation. Every color has a ROLE, not a value. You do not pick colors
 * because they are beautiful. You pick them because they communicate a position in the
 * hierarchy.
 *
 * The three-level role system:
 *
 * PRIMARY — The most important interactive role on the surface.
 *   Elements in Primary demand attention. There should be few of them.
 *   The eye should immediately identify Primary elements as "what to do next."
 *
 * SECONDARY — Supporting interactive role.
 *   Elements in Secondary are available but not insistent. "You could also do this."
 *
 * TERTIARY — Accent and emphasis.
 *   Tertiary is not a third primary. It is the emotional color — used for hero moments,
 *   delight states, key achievements. It should appear rarely. When it appears, it should
 *   feel special because it has been rare.
 *
 * Container colors (PrimaryContainer, etc.) are for lower-emphasis surfaces that are
 * associated with the role — not the action itself, but its context.
 *
 * The values below are the real Material Design 3 baseline dark color scheme (the published
 * tonal palette generated from seed color `#6750A4`), not invented — deliberate parity with
 * [conveyance-expressive](https://github.com/HereLiesAz/conveyance-expressive)'s own
 * `ExpressiveRole` container colors, one of the Conveyance ecosystem's actual style systems,
 * rather than an arbitrary from-scratch hue choice, ported 1:1 from `ConveyColor.kt`.
 * `ConveyColor` is a REFERENCE PALETTE — a semantic vocabulary you implement in your
 * product's actual color scheme via the CSS custom properties in `cssVariables` below.
 * Match your brand colors to these roles, not to arbitrary hex values.
 */

/** Per-channel hex color lerp — mirrors `ConveyColor.kt`'s use of Compose's `lerp(Color, Color, Float)`. */
function lerpHex(from: string, to: string, t: number): string {
  const f = parseInt(from.slice(1), 16)
  const T = parseInt(to.slice(1), 16)
  const mix = (shift: number) => {
    const a = (f >> shift) & 0xff
    const b = (T >> shift) & 0xff
    return Math.round(a + (b - a) * t)
  }
  const r = mix(16)
  const g = mix(8)
  const b = mix(0)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}

const BaseSurface = '#1C1B1F'
const BasePrimary = '#D0BCFF'

/** `BasePrimary` alpha-blended over `BaseSurface` -- M3's own dark-theme elevation-overlay technique. */
function elevatedSurface(overlayAlpha: number): string {
  return lerpHex(BaseSurface, BasePrimary, overlayAlpha)
}

export const ConveyColor = {
  Primary: BasePrimary,
  OnPrimary: '#381E72',
  PrimaryContainer: '#4F378B',
  OnPrimaryContainer: '#EADDFF',
  PrimaryFixed: '#EADDFF',
  PrimaryFixedDim: '#D0BCFF',

  Secondary: '#CCC2DC',
  OnSecondary: '#332D41',
  SecondaryContainer: '#4A4458',
  OnSecondaryContainer: '#E8DEF8',

  Tertiary: '#EFB8C8',
  OnTertiary: '#492532',
  TertiaryContainer: '#633B48',
  OnTertiaryContainer: '#FFD8E4',

  Error: '#F2B8B5',
  OnError: '#601410',
  ErrorContainer: '#8C1D18',
  OnErrorContainer: '#F9DEDC',

  // M3's baseline scheme has no separate Warning/Success roles (product-specific extensions);
  // kept here as an amber/green pair mixed the same way a real M3 dynamic-color extension
  // would derive them, not an unrelated hue pulled from nowhere.
  Warning: '#FFCA85',
  OnWarning: '#4A2F00',
  WarningContainer: '#6B4700',
  OnWarningContainer: '#FFDDB3',

  Success: '#A6D6A6',
  OnSuccess: '#0F3D14',
  SuccessContainer: '#255128',
  OnSuccessContainer: '#C2F0C2',

  Surface: BaseSurface,
  OnSurface: '#E6E1E5',
  SurfaceVariant: '#49454F',
  OnSurfaceVariant: '#CAC4D0',
  SurfaceContainerLow: elevatedSurface(0.05),
  SurfaceContainer: elevatedSurface(0.08),
  SurfaceContainerHigh: elevatedSurface(0.11),
  SurfaceContainerHighest: elevatedSurface(0.12),

  Outline: '#938F99',
  OutlineVariant: '#49454F',

  InverseSurface: '#E6E1E5',
  InverseOnSurface: '#313033',
  InversePrimary: '#6750A4',

  Scrim: '#000000',
  Shadow: '#000000',
} as const

/** `ConveyColor` keys, camelCase, as the CSS custom property they map to (`--convey-*`). */
export const cssVariables: Readonly<Record<keyof typeof ConveyColor, string>> = Object.fromEntries(
  (Object.keys(ConveyColor) as (keyof typeof ConveyColor)[]).map((key) => [
    key,
    `--convey-${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`,
  ]),
) as Readonly<Record<keyof typeof ConveyColor, string>>

/** A `:root { ... }` CSS text block defining every `ConveyColor` token as a custom property. */
export function toCssVariableBlock(palette: Readonly<Record<keyof typeof ConveyColor, string>> = ConveyColor): string {
  const lines = (Object.keys(ConveyColor) as (keyof typeof ConveyColor)[]).map(
    (key) => `  ${cssVariables[key]}: ${palette[key]};`,
  )
  return `:root {\n${lines.join('\n')}\n}`
}

/**
 * The container color appropriate for an element of the given `ConveyWeight`.
 *
 * Hero and Primary elements use `Primary` and `PrimaryContainer`.
 * Secondary elements use `SecondaryContainer`.
 * Ghost elements use `SurfaceContainer`.
 *
 * This is a starting point. Your product will override this mapping.
 */
export function containerFor(weight: ConveyWeight): string {
  switch (weight) {
    case 'hero':
      return ConveyColor.Primary
    case 'primary':
      return ConveyColor.PrimaryContainer
    case 'secondary':
      return ConveyColor.SecondaryContainer
    case 'ghost':
      return ConveyColor.SurfaceContainer
  }
}

export function contentFor(weight: ConveyWeight): string {
  switch (weight) {
    case 'hero':
      return ConveyColor.OnPrimary
    case 'primary':
      return ConveyColor.OnPrimaryContainer
    case 'secondary':
      return ConveyColor.OnSecondaryContainer
    case 'ghost':
      return ConveyColor.OnSurfaceVariant
  }
}
