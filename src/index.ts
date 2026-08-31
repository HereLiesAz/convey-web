import './styles.css'

export {
  ConveyMotion,
  isElastic,
  isCriticallyDamped,
  estimatedDurationMs,
  springToLinearEasing,
  toCss,
  safeAnimate,
} from './tokens/motion.js'
export type { AnimationSpec, SpringSpec, TweenSpec, SnapSpec } from './tokens/motion.js'

export { ConveyShape, shapeScale, escalate, deescalate, applyShape } from './tokens/shape.js'
export type { ConveyShapeToken } from './tokens/shape.js'

export { ConveyColor, cssVariables, toCssVariableBlock, containerFor, contentFor } from './tokens/color.js'

export { ConveySize } from './tokens/size.js'

export {
  ConveyWeightRegistry,
  ConveyViolationError,
  ConveyWeightElement,
  provideWeightRegistry,
  nearestWeightRegistry,
} from './weight.js'
export type { ConveyWeight } from './weight.js'

export { ConveyGrammar, ConveyGrammarBuilder, buildConveyGrammar } from './grammar.js'
export type { GrammarEntry } from './grammar.js'

export { ConveySystemElement, grammarOf } from './system.js'

export {
  ConveyGate,
  ConveyEscortRegistry,
  ConveyGateLocationElement,
  ConveyEscortedElement,
  provideEscortRegistry,
  nearestEscortRegistry,
} from './escort.js'

export { ConveyReversalState, ConveyReversalElement } from './reversal.js'

export { ConveyYieldElement } from './yield.js'

export { ConveyMigrationElement } from './migration.js'

export { ConveyOfferElement } from './offer.js'
export type { ConveyOfferPhase } from './offer.js'

export {
  ConveyOriginRegistry,
  ConveyOriginElement,
  ConveyEnterElement,
  provideOriginRegistry,
  nearestOriginRegistry,
} from './enter.js'

export {
  ConveyEmploymentRegistry,
  ConveyEmploymentElement,
  provideEmploymentRegistry,
  nearestEmploymentRegistry,
} from './employment.js'
export type { ConveyJob } from './employment.js'

export { ConveyPracticeRegistry, conveyPracticeDecay, decayed } from './practice.js'

export { ConveyAffordance, applyConveyAffordance, ConveyAffordanceElement, conveyInert } from './affordance.js'
export type { ConveyAffordanceKind, ConveyAffordanceHandle } from './affordance.js'

export { conveyRipple, conveyPress, conveyLongPress, conveySwipe } from './interaction.js'
export type { ConveyInteractionHandle, ConveySwipeDirection } from './interaction.js'

export {
  conveyScaleOnPress,
  conveyLiftOnHover,
  conveyRotateOnHover,
  conveyScaleIn,
  conveySlideIn,
} from './transform.js'
export type { ConveyTransformHandle } from './transform.js'

export { ConveyBadgeElement } from './components/badge.js'
export { ConveyChipElement } from './components/chip.js'
export { ConveySwitchElement } from './components/switch.js'
export { ConveyAvatarElement } from './components/avatar.js'
export { ConveyListItemElement } from './components/list-item.js'
export { ConveyCardElement } from './components/card.js'
export { ConveySegmentedControlElement } from './components/segmented-control.js'
export { ConveyTopBarElement } from './components/top-bar.js'
export { ConveyNavigationBarElement } from './components/navigation-bar.js'
