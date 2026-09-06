/**
 * M3's real fifteen-step type scale — five roles (Display/Headline/Title/Body/Label) times
 * three sizes (Large/Medium/Small), values as specified by Material Design 3, not invented
 * here — the web port of convey's own `ConveyExpressiveType.kt`, ported in turn from
 * `conveyance-expressive`'s own `ExpressiveType.kt`, one of the wider Conveyance ecosystem's
 * real, spec-grounded style systems.
 */
export interface ConveyExpressiveTextStyle {
  readonly fontSize: string
  readonly lineHeight: string
  readonly letterSpacing: string
  readonly fontWeight: number
}

export interface ConveyExpressiveType {
  readonly displayLarge: ConveyExpressiveTextStyle
  readonly displayMedium: ConveyExpressiveTextStyle
  readonly displaySmall: ConveyExpressiveTextStyle
  readonly headlineLarge: ConveyExpressiveTextStyle
  readonly headlineMedium: ConveyExpressiveTextStyle
  readonly headlineSmall: ConveyExpressiveTextStyle
  readonly titleLarge: ConveyExpressiveTextStyle
  readonly titleMedium: ConveyExpressiveTextStyle
  readonly titleSmall: ConveyExpressiveTextStyle
  readonly bodyLarge: ConveyExpressiveTextStyle
  readonly bodyMedium: ConveyExpressiveTextStyle
  readonly bodySmall: ConveyExpressiveTextStyle
  readonly labelLarge: ConveyExpressiveTextStyle
  readonly labelMedium: ConveyExpressiveTextStyle
  readonly labelSmall: ConveyExpressiveTextStyle
}

export const ConveyExpressiveType: ConveyExpressiveType = {
  displayLarge: { fontSize: '57px', lineHeight: '64px', letterSpacing: '-0.2px', fontWeight: 400 },
  displayMedium: { fontSize: '45px', lineHeight: '52px', letterSpacing: '0px', fontWeight: 400 },
  displaySmall: { fontSize: '36px', lineHeight: '44px', letterSpacing: '0px', fontWeight: 400 },
  headlineLarge: { fontSize: '32px', lineHeight: '40px', letterSpacing: '0px', fontWeight: 400 },
  headlineMedium: { fontSize: '28px', lineHeight: '36px', letterSpacing: '0px', fontWeight: 400 },
  headlineSmall: { fontSize: '24px', lineHeight: '32px', letterSpacing: '0px', fontWeight: 400 },
  titleLarge: { fontSize: '22px', lineHeight: '28px', letterSpacing: '0px', fontWeight: 400 },
  titleMedium: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0.2px', fontWeight: 500 },
  titleSmall: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.1px', fontWeight: 500 },
  bodyLarge: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0.5px', fontWeight: 400 },
  bodyMedium: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.2px', fontWeight: 400 },
  bodySmall: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.4px', fontWeight: 400 },
  labelLarge: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.1px', fontWeight: 500 },
  labelMedium: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.5px', fontWeight: 500 },
  labelSmall: { fontSize: '11px', lineHeight: '16px', letterSpacing: '0.5px', fontWeight: 500 },
}

/**
 * Looks up a step by name. Accepts M3's own role names lowerCamelCased (`"titleMedium"`), and
 * the same h2g2-style aliases `conveyance-expressive`'s own `step()` accepts
 * (`hero`/`section`/`lead`/`body`/`eyebrow`/`micro`). Falls back to `bodyMedium` for an
 * unrecognized name.
 */
export function step(name: string): ConveyExpressiveTextStyle {
  switch (name) {
    case 'displayLarge': return ConveyExpressiveType.displayLarge
    case 'displayMedium': case 'hero': return ConveyExpressiveType.displayMedium
    case 'displaySmall': return ConveyExpressiveType.displaySmall
    case 'headlineLarge': case 'section': return ConveyExpressiveType.headlineLarge
    case 'headlineMedium': return ConveyExpressiveType.headlineMedium
    case 'headlineSmall': return ConveyExpressiveType.headlineSmall
    case 'titleLarge': case 'lead': return ConveyExpressiveType.titleLarge
    case 'titleMedium': return ConveyExpressiveType.titleMedium
    case 'titleSmall': case 'capsule': return ConveyExpressiveType.titleSmall
    case 'bodyLarge': return ConveyExpressiveType.bodyLarge
    case 'bodySmall': return ConveyExpressiveType.bodySmall
    case 'labelLarge': case 'eyebrow': return ConveyExpressiveType.labelLarge
    case 'labelMedium': case 'endCap': return ConveyExpressiveType.labelMedium
    case 'labelSmall': case 'micro': return ConveyExpressiveType.labelSmall
    default: return ConveyExpressiveType.bodyMedium
  }
}

/** Applies a `ConveyExpressiveTextStyle` to an element's inline style. */
export function applyExpressiveType(el: HTMLElement, textStyle: ConveyExpressiveTextStyle): void {
  el.style.fontSize = textStyle.fontSize
  el.style.lineHeight = textStyle.lineHeight
  el.style.letterSpacing = textStyle.letterSpacing
  el.style.fontWeight = String(textStyle.fontWeight)
}
