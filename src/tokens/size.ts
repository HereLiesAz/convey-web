/**
 * Proportional spacing and sizing scale — the web port of convey's `ConveySize`.
 *
 * This is a geometric progression, not an arbitrary list. Each step is perceptibly
 * different from its neighbors. Values that are "almost the same" are not different
 * enough to mean anything. Values that are "very different" communicate different
 * structural levels.
 *
 * Use these tokens to answer: "How far apart should these things be?" The answer is
 * not a pixel value. The answer is a relationship: "These are in the same group"
 * (Small) or "These are in different groups" (Large).
 *
 * Ported as `rem`, not `px`: Compose's `dp` is already a density-independent unit that
 * scales with the platform's own accessibility settings, and `rem` is that same idea on
 * the web — it scales with the user's root font size, where `px` does not. Every value
 * below is `dp / 16`, matching the same 16-unit baseline convey's own `dp` values assume.
 */
export const ConveySize = {
  // ── Spacing scale ─────────────────────────────────────────────────────────

  None: '0rem',

  /** Hairline gap. Same visual group. */
  Hairline: '0.0625rem', // 1dp

  /** Tight. Elements that belong together. */
  XSmall: '0.25rem', // 4dp

  /** Close. Related elements. */
  Small: '0.5rem', // 8dp

  /** Standard internal padding. Most content within cards. */
  Medium: '1rem', // 16dp

  /** Comfortable. Related sections. */
  Large: '1.5rem', // 24dp

  /** Generous. Different but adjacent sections. */
  XLarge: '2rem', // 32dp

  /** Spacious. Major divisions within a screen. */
  XXLarge: '3rem', // 48dp

  /** Expansive. Between structural page sections. */
  Huge: '4rem', // 64dp

  /** Maximum. For hero sections and major visual breaks. */
  Hero: '6rem', // 96dp

  // ── Component size tokens ─────────────────────────────────────────────────

  Component: {
    // Icon sizes
    IconSmall: '1rem', // 16dp
    IconMedium: '1.5rem', // 24dp
    IconLarge: '2rem', // 32dp
    IconXLarge: '2.5rem', // 40dp

    // Touch targets (accessibility floor: 48dp)
    MinTouchTarget: '3rem', // 48dp

    // Button heights
    ButtonSmall: '2rem', // 32dp
    ButtonMedium: '2.5rem', // 40dp
    ButtonLarge: '3rem', // 48dp

    // FAB sizes
    FabSmall: '2.5rem', // 40dp
    Fab: '3.5rem', // 56dp
    FabLarge: '6rem', // 96dp

    // Navigation
    NavigationBar: '5rem', // 80dp
    TopAppBar: '4rem', // 64dp
    TopAppBarLarge: '9.5rem', // 152dp

    // List items
    ListItemSmall: '3rem', // 48dp
    ListItem: '3.5rem', // 56dp
    ListItemLarge: '4.5rem', // 72dp
    ListItemXLarge: '5.5rem', // 88dp

    // Cards
    CardMinHeight: '4rem', // 64dp

    // Input fields
    InputHeight: '3.5rem', // 56dp

    // Bottom sheet
    BottomSheetPeek: '5.5rem', // 88dp
  },

  // ── Elevation scale (as box-shadow blur radii, px — shadows are not resolution-scaled) ──

  Elevation: {
    /** No elevation. Flat, part of the surface. */
    None: '0px',

    /** Barely lifted. Cards at rest. */
    XSmall: '1px',

    /** Slightly lifted. Hover state. */
    Small: '3px',

    /** Clearly lifted. Raised cards. */
    Medium: '6px',

    /** Floating. Navigation bars, app bars. */
    Large: '8px',

    /** High. FABs, modal surfaces. */
    XLarge: '12px',

    /** Maximum. Menus, dialogs, tooltips. */
    XXLarge: '16px',
  },

  // ── Border widths (px — hairlines should not blur sub-pixel under rem rounding) ──

  Stroke: {
    Hairline: '0.5px',
    Thin: '1px',
    Regular: '1.5px',
    Thick: '2px',
    Heavy: '3px',
  },
} as const
