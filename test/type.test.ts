import { describe, expect, it } from 'vitest'
import { ConveyType, ConveyTypeAxes, ConveyTypePreset, fontVariationSettings, toFontFaceCss } from '../src/tokens/type.js'

describe('ConveyType', () => {
  it('names the font family', () => {
    expect(ConveyType.FontFamily).toBe('Azrienoch')
  })
})

describe('ConveyTypeAxes', () => {
  it('matches Azrienoch\'s published axis ranges', () => {
    expect(ConveyTypeAxes.Weight).toEqual({ tag: 'wght', min: 180, max: 900, default: 400 })
    expect(ConveyTypeAxes.Width).toEqual({ tag: 'wdth', min: 75, max: 100, default: 100 })
    expect(ConveyTypeAxes.Serif).toEqual({ tag: 'SERF', min: 0, max: 100, default: 0 })
    expect(ConveyTypeAxes.Grade).toEqual({ tag: 'GRAD', min: -50, max: 50, default: 0 })
  })
})

describe('fontVariationSettings', () => {
  it('uses every axis default with no arguments', () => {
    expect(fontVariationSettings()).toBe('"wght" 400, "wdth" 100, "SERF" 0, "GRAD" 0')
  })

  it('overrides only the given axes', () => {
    expect(fontVariationSettings({ Weight: 700, Serif: 100 })).toBe('"wght" 700, "wdth" 100, "SERF" 100, "GRAD" 0')
  })

  it('clamps out-of-range values into the axis', () => {
    expect(fontVariationSettings({ Weight: 10000 })).toBe('"wght" 900, "wdth" 100, "SERF" 0, "GRAD" 0')
    expect(fontVariationSettings({ Grade: -999 })).toBe('"wght" 400, "wdth" 100, "SERF" 0, "GRAD" -50')
  })

  it('matches ConveyTypePreset.Bold', () => {
    expect(fontVariationSettings(ConveyTypePreset.Bold)).toBe('"wght" 700, "wdth" 100, "SERF" 0, "GRAD" 0')
  })
})

describe('toFontFaceCss', () => {
  it('embeds the given URL and the weight/width axis ranges', () => {
    const css = toFontFaceCss('/fonts/Azrienoch-VF.woff2')
    expect(css).toContain("font-family: 'Azrienoch'")
    expect(css).toContain("url('/fonts/Azrienoch-VF.woff2') format('woff2')")
    expect(css).toContain('font-weight: 180 900')
    expect(css).toContain('font-stretch: 75% 100%')
  })
})
