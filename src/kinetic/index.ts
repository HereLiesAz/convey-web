/**
 * The kinetic-typography subsystem -- a WordNet+VerbNet-backed natural-language layer that
 * drives verb/noun-aware kinetic typography and physics. Separate entry point
 * (`@hereliesaz/convey-web/kinetic`) from the rest of the package: its data assets
 * (~1.5MB verb, ~10MB noun, both WordNet-derived) are opt-in, not part of the main bundle.
 *
 * See `data/README.md` for what the data is and how it was generated, and
 * `THIRD_PARTY_NOTICES.md` for its license (Princeton WordNet 3.0 -- redistribution requires
 * carrying that notice, satisfied by this package including it; VerbNet 3.3 is a build-time-
 * only input, never redistributed as raw data).
 *
 * Call `loadConveyVerbData()`/`loadConveyNounData()` (or `ConveyVerbLexicon.loadData()`/
 * `ConveyNounLexicon.loadData()`) once, early, before using anything else here --
 * `classify`/`lemmatize`/the kinetic components all throw or silently fall back to
 * "Unclassified"/`null` until their data has loaded.
 */

export {
  ConveyVerbLexicon,
  loadConveyVerbData,
  classify as classifyVerb,
  lemmatize as lemmatizeVerb,
  topographicalCategory,
  isDescent,
  toEventTimeline,
  toConveyLife,
} from './verb.js'
export type { ConveyVerbClass, ConveyTopographicalCategory, ConveyVerbEventTimeline } from './verb.js'

export {
  ConveyNounLexicon,
  loadConveyNounData,
  classify as classifyNoun,
  lemmatize as lemmatizeNoun,
} from './noun.js'
export type { ConveyNounAnimacy, ConveyNounCountability, ConveyNounProperties } from './noun.js'

export {
  Vec2,
  attraction,
  repulsion,
  hasCollided,
  ConveyRigidBody,
  ConveySpringMassBody,
  ConveyGaitOscillator,
} from './force-dynamics.js'

export { ConveyKineticTextElement, ConveyKineticSentenceElement } from './kinetic-text.js'
export { ConveySvoSceneElement, parseSvoHeuristic } from './svo-scene.js'
export type { ConveySvoParts } from './svo-scene.js'
