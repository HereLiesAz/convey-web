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

export { ConveyBadgeElement } from './components/badge.js'
export { ConveyChipElement } from './components/chip.js'
export { ConveySwitchElement } from './components/switch.js'
export { ConveyAvatarElement } from './components/avatar.js'
export { ConveyListItemElement } from './components/list-item.js'
export { ConveyCardElement } from './components/card.js'
