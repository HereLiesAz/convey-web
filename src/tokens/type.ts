/**
 * Azrienoch — this library's official typeface, the web port of `ConveyType.kt`'s token
 * model. A multiplex variable font (SIL OFL 1.1, https://github.com/HereLiesAz/Azrienoch):
 * one family, four axes (`wght`/`wdth`/`SERF`/`GRAD`) instead of a family-per-weight or
 * family-per-style set of static files.
 *
 * The compiled font (`Azrienoch-VF.woff2`) ships alongside this package at
 * `fonts/Azrienoch-VF.woff2` — point `toFontFaceCss()`'s `url` argument at wherever your own
 * build serves that file from (this package doesn't assume a bundler, so it can't resolve
 * that path for you the way an `import url from './font.woff2'` would in a project that
 * already has one). See `THIRD_PARTY_NOTICES.md` for the font's own license.
 */
export const ConveyType = {
  FontFamily: 'Azrienoch',
  Source: 'https://github.com/HereLiesAz/Azrienoch',
  License: 'SIL Open Font License, Version 1.1',
} as const

export interface ConveyTypeAxis {
  readonly tag: string
  readonly min: number
  readonly max: number
  readonly default: number
}

/**
 * Azrienoch's four axes. `Weight` and `Width` are registered OpenType axes (`wght`/`wdth`);
 * `Serif` (`SERF`) and `Grade` (`GRAD`) are Azrienoch's own. Unlike most variable fonts,
 * Azrienoch deliberately couples cap-height/x-height to `Weight` rather than leaving them
 * independent — a heavier instance is a genuinely taller one, not just a thicker one at the
 * same proportions. See the font's own README for why.
 */
export const ConveyTypeAxes = {
  Weight: { tag: 'wght', min: 180, max: 900, default: 400 },
  Width: { tag: 'wdth', min: 75, max: 100, default: 100 },
  Serif: { tag: 'SERF', min: 0, max: 100, default: 0 },
  Grade: { tag: 'GRAD', min: -50, max: 50, default: 0 },
} as const satisfies Record<string, ConveyTypeAxis>

export type ConveyTypeVariation = Partial<Record<keyof typeof ConveyTypeAxes, number>>

/** A handful of named points in the axis space — starting points, not a constraint on using the axes directly. */
export const ConveyTypePreset = {
  Thin: { Weight: 180 } as ConveyTypeVariation,
  Regular: { Weight: 400 } as ConveyTypeVariation,
  Medium: { Weight: 500 } as ConveyTypeVariation,
  Bold: { Weight: 700 } as ConveyTypeVariation,
  Black: { Weight: 900 } as ConveyTypeVariation,
  Condensed: { Width: 75 } as ConveyTypeVariation,
  Slab: { Serif: 100 } as ConveyTypeVariation,
} as const

function clampToAxis(axis: ConveyTypeAxis, value: number): number {
  return Math.min(axis.max, Math.max(axis.min, value))
}

/**
 * Builds a CSS `font-variation-settings` value from a partial `ConveyTypeVariation` — any
 * axis not given falls back to its own default, and any given value is clamped into that
 * axis's range.
 *
 * ```ts
 * el.style.fontVariationSettings = fontVariationSettings({ Weight: 700, Serif: 100 })
 * // '"wght" 700, "wdth" 100, "SERF" 100, "GRAD" 0'
 * ```
 */
export function fontVariationSettings(variation: ConveyTypeVariation = {}): string {
  return (Object.keys(ConveyTypeAxes) as (keyof typeof ConveyTypeAxes)[])
    .map((key) => {
      const axis = ConveyTypeAxes[key]
      const value = clampToAxis(axis, variation[key] ?? axis.default)
      return `"${axis.tag}" ${value}`
    })
    .join(', ')
}

/**
 * The `@font-face` CSS block for Azrienoch, ready to inline into a `<style>` or stylesheet.
 * `font-weight`/`font-stretch` are declared as ranges (the variable axes' own min/max) so
 * `font-weight: 700` / `font-stretch: 85%` in ordinary CSS resolve into this one face rather
 * than needing `font-variation-settings` for the common case — reach for
 * `fontVariationSettings()` only for `SERF`/`GRAD`, which have no standard CSS property.
 */
export function toFontFaceCss(url: string): string {
  return [
    '@font-face {',
    `  font-family: '${ConveyType.FontFamily}';`,
    `  src: url('${url}') format('woff2');`,
    `  font-weight: ${ConveyTypeAxes.Weight.min} ${ConveyTypeAxes.Weight.max};`,
    `  font-stretch: ${ConveyTypeAxes.Width.min}% ${ConveyTypeAxes.Width.max}%;`,
    '  font-style: normal;',
    '  font-display: swap;',
    '}',
  ].join('\n')
}
