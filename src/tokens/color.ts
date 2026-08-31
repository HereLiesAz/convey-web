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
 * These are reference hex values (dark-mode optimized), ported 1:1 from `ConveyColor.kt`.
 * `ConveyColor` is a REFERENCE PALETTE — a semantic vocabulary you implement in your
 * product's actual color scheme via the CSS custom properties in `cssVariables` below.
 * Match your brand colors to these roles, not to arbitrary hex values.
 */
export const ConveyColor = {
  Primary: '#7B56F8',
  OnPrimary: '#FFFFFF',
  PrimaryContainer: '#1B1050',
  OnPrimaryContainer: '#C4AAFF',
  PrimaryFixed: '#EADDFF',
  PrimaryFixedDim: '#D0BCFF',

  Secondary: '#00CBA9',
  OnSecondary: '#002820',
  SecondaryContainer: '#003D33',
  OnSecondaryContainer: '#6DF5D4',

  Tertiary: '#FF8B5E',
  OnTertiary: '#FFFFFF',
  TertiaryContainer: '#4A1800',
  OnTertiaryContainer: '#FFB89A',

  Error: '#FF4D6A',
  OnError: '#690025',
  ErrorContainer: '#3B0013',
  OnErrorContainer: '#FFB3C1',

  Warning: '#FFAD42',
  OnWarning: '#3D2400',
  WarningContainer: '#4A3100',
  OnWarningContainer: '#FFD9A0',

  Success: '#34E89E',
  OnSuccess: '#003923',
  SuccessContainer: '#005237',
  OnSuccessContainer: '#86FAC4',

  Surface: '#04040C',
  OnSurface: '#ECEDF5',
  SurfaceVariant: '#080818',
  OnSurfaceVariant: '#9899BC',
  SurfaceContainer: '#0D0D22',
  SurfaceContainerLow: '#08081A',
  SurfaceContainerHigh: '#131330',
  SurfaceContainerHighest: '#1A1A40',

  Outline: '#3A3A5C',
  OutlineVariant: '#1F1F3A',

  InverseSurface: '#E6E0F8',
  InverseOnSurface: '#04040C',
  InversePrimary: '#5433B8',

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
