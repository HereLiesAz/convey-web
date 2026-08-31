import { ConveyGrammar } from '../grammar.js'
import { classify as classifyVerb, toConveyLife, toEventTimeline } from './verb.js'
import { classify as classifyNoun } from './noun.js'
import { Vec2, attraction, hasCollided, ConveyRigidBody, ConveySpringMassBody, ConveyGaitOscillator } from './force-dynamics.js'
import './kinetic-text.js'
import type { ConveyKineticTextElement } from './kinetic-text.js'

/** The web port of convey's `ConveySvoParts`. */
export interface ConveySvoParts {
  readonly subject: string
  readonly verb: string
  readonly obj: string
}

/**
 * A heuristic subject/verb/object chunker -- the web port of convey's `parseSvoHeuristic`.
 * Explicitly not a real syntactic parser: head-final noun phrases (the last word before/
 * after the verb, ignoring modifiers/articles), and the first word `ConveyVerbLexicon`
 * classifies as a real verb (scanning from index 1, never the first or last word) wins;
 * falls back to assuming the second word is the verb if none classify. Requires
 * `ConveyVerbLexicon`'s data to already be loaded.
 */
export function parseSvoHeuristic(sentence: string): ConveySvoParts | null {
  const words = sentence
    .split(/\s+/)
    .map((w) => w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
    .filter((w) => w.length > 0)
  if (words.length < 3) return null

  let verbIndex = -1
  for (let i = 1; i < words.length - 1; i++) {
    if (classifyVerb(words[i]!, sentence) !== 'Unclassified') {
      verbIndex = i
      break
    }
  }
  if (verbIndex === -1) verbIndex = 1
  if (verbIndex >= words.length - 1) return null

  const subject = words.slice(0, verbIndex).at(-1)
  const obj = words.slice(verbIndex + 1).at(-1)
  if (subject === undefined || obj === undefined) return null

  return { subject, verb: words[verbIndex]!, obj }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * The orchestrating element: splits a sentence into subject/verb/object
 * (`parseSvoHeuristic`), classifies the nouns and verb, and drives the pure-math physics
 * primitives in `force-dynamics.ts` to animate the subject toward the object (translate,
 * collide, squash/stretch, gait bob/tilt for an animate subject) -- the web port of convey's
 * `ConveySvoScene`.
 *
 * Falls back to `<convey-kinetic-sentence>` when the heuristic can't split the sentence, or
 * when the classified verb has no spatial component (`timeline.approaches === false`) --
 * there is no SVO physics to show, so it renders as ordinary per-word kinetic text instead.
 *
 * Requires `ConveyVerbLexicon` and `ConveyNounLexicon` data to be loaded first (see
 * `loadConveyVerbData()`/`loadConveyNounData()`). Renders nothing until both resolve.
 *
 * Word-as-image morphing / real variable-font axis interpolation are out of scope, same as
 * the Kotlin original -- only position/scale/rotation are simulated; subject and object
 * render as plain unmorphed kinetic text.
 */
export class ConveySvoSceneElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['sentence', 'scene-width', 'scene-height']
  }

  #shadow: ShadowRoot
  #box: HTMLElement
  #grammar: ConveyGrammar = ConveyGrammar.Default
  #rafHandle: number | undefined
  #resizeObserver: ResizeObserver | undefined

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .box { position: relative; overflow: hidden; }
        .subject, .object { position: absolute; top: 50%; left: 0; will-change: transform; }
        .verb { position: absolute; left: 0; bottom: 4px; }
      </style>
      <div class="box" part="box"></div>
    `
    this.#box = this.#shadow.querySelector('.box')!
  }

  connectedCallback(): void {
    this.#applyGeometry()
    this.#render()
  }

  disconnectedCallback(): void {
    this.#stopLoop()
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = undefined
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'sentence') this.#render()
    else this.#applyGeometry()
  }

  get grammar(): ConveyGrammar {
    return this.#grammar
  }

  set grammar(value: ConveyGrammar) {
    this.#grammar = value
  }

  #sceneWidthPx(): number {
    const raw = this.getAttribute('scene-width')
    const n = raw === null ? NaN : Number.parseFloat(raw)
    return Number.isFinite(n) ? n : 320
  }

  #sceneHeightPx(): number {
    const raw = this.getAttribute('scene-height')
    const n = raw === null ? NaN : Number.parseFloat(raw)
    return Number.isFinite(n) ? n : 96
  }

  #applyGeometry(): void {
    this.#box.style.width = `${this.#sceneWidthPx()}px`
    this.#box.style.height = `${this.#sceneHeightPx()}px`
  }

  #stopLoop(): void {
    if (this.#rafHandle !== undefined) {
      cancelAnimationFrame(this.#rafHandle)
      this.#rafHandle = undefined
    }
  }

  #renderFallback(sentence: string): void {
    this.#box.innerHTML = ''
    const el = document.createElement('convey-kinetic-sentence')
    el.setAttribute('text', sentence)
    this.#box.appendChild(el)
  }

  #render(): void {
    this.#stopLoop()
    const sentence = this.getAttribute('sentence') ?? ''

    // parseSvoHeuristic and classifyVerb/classifyNoun all throw if their lexicon data hasn't
    // loaded yet (see loadConveyVerbData/loadConveyNounData) -- fall back silently rather
    // than crash a render that fires before the caller's await resolves; the caller is
    // expected to re-set `sentence` (or otherwise trigger a re-render) once loading
    // completes, the same pattern <convey-kinetic-sentence> uses.
    let parts: ConveySvoParts | null
    try {
      parts = parseSvoHeuristic(sentence)
    } catch {
      this.#renderFallback(sentence)
      return
    }
    if (parts === null) {
      this.#renderFallback(sentence)
      return
    }

    const verbClass = classifyVerb(parts.verb, sentence)
    const timeline = toEventTimeline(verbClass)
    if (!timeline.approaches) {
      // No spatial component to this verb -- nothing for the physics simulation to show.
      this.#renderFallback(sentence)
      return
    }

    let subjectProps: ReturnType<typeof classifyNoun>
    let objectProps: ReturnType<typeof classifyNoun>
    try {
      subjectProps = classifyNoun(parts.subject, sentence)
      objectProps = classifyNoun(parts.obj, sentence)
    } catch {
      subjectProps = null
      objectProps = null
    }

    this.#box.innerHTML = ''
    const subjectEl = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    subjectEl.className = 'subject'
    subjectEl.setAttribute('text', parts.subject)
    subjectEl.grammar = this.#grammar

    const objectEl = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    objectEl.className = 'object'
    objectEl.setAttribute('text', parts.obj)
    objectEl.grammar = this.#grammar

    const verbEl = document.createElement('convey-kinetic-text') as ConveyKineticTextElement
    verbEl.className = 'verb'
    verbEl.setAttribute('text', parts.verb)
    verbEl.idle = toConveyLife(verbClass)
    verbEl.grammar = this.#grammar

    this.#box.appendChild(subjectEl)
    this.#box.appendChild(objectEl)
    this.#box.appendChild(verbEl)

    // Wait one frame so the just-appended elements have real layout boxes to measure.
    requestAnimationFrame(() => this.#runSimulation(subjectEl, objectEl, subjectProps, objectProps, timeline))
  }

  #runSimulation(
    subjectEl: HTMLElement,
    objectEl: HTMLElement,
    subjectProps: ReturnType<typeof classifyNoun>,
    objectProps: ReturnType<typeof classifyNoun>,
    timeline: ReturnType<typeof toEventTimeline>,
  ): void {
    const separationPx = this.#sceneWidthPx() * 2.5
    const rigid = new ConveyRigidBody(Vec2.Zero, 1, 0.92)
    const gait = new ConveyGaitOscillator()
    const spring = new ConveySpringMassBody(220, objectProps?.countability === 'Mass' ? 0.12 : 0.9)
    const isSubjectAnimate = subjectProps?.animacy === 'Animate'

    let hasContacted = false
    let lastTimestamp: number | undefined

    const step = (timestampMs: number) => {
      if (lastTimestamp === undefined) {
        lastTimestamp = timestampMs
        this.#rafHandle = requestAnimationFrame(step)
        return
      }
      const dt = clamp((timestampMs - lastTimestamp) / 1000, 0, 0.05)
      lastTimestamp = timestampMs

      const objectPos = Vec2.of(separationPx, 0)
      const subjectWidth = subjectEl.getBoundingClientRect().width
      const objectWidth = objectEl.getBoundingClientRect().width
      const combinedRadius = Math.max((subjectWidth + objectWidth) / 2, 48)

      if (timeline.approaches && !hasContacted) {
        const force = attraction(rigid.position, objectPos, 1400)
        rigid.applyForce(force, dt)
        const distanceToObject = Vec2.length(Vec2.sub(objectPos, rigid.position))

        if (timeline.contactAtEnd && hasCollided(rigid.position, objectPos, combinedRadius)) {
          hasContacted = true
          const impactSpeed = Vec2.length(rigid.velocity)
          rigid.stop()
          spring.impulse(impactSpeed * 0.012)
        } else if (timeline.continuousNoContact && distanceToObject <= combinedRadius * 1.15) {
          rigid.stop()
        }
      }

      spring.step(dt)
      const speed = Vec2.length(rigid.velocity)
      gait.step(dt, speed)

      const bob = isSubjectAnimate ? gait.bobPx(speed) : 0
      const tilt = isSubjectAnimate ? gait.tiltDegrees(speed) : 0
      subjectEl.style.transform =
        `translate(${rigid.position.x}px, calc(-50% + ${rigid.position.y - bob}px)) rotate(${tilt}deg)`

      const squash = spring.displacement
      const scaleX = clamp(1 + squash * 0.35, 0.6, 1.6)
      const scaleY = clamp(1 - squash * 0.5, 0.4, 1.6)
      objectEl.style.transform = `translate(${separationPx}px, -50%) scale(${scaleX}, ${scaleY})`

      this.#rafHandle = requestAnimationFrame(step)
    }

    this.#rafHandle = requestAnimationFrame(step)
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-svo-scene')) {
  customElements.define('convey-svo-scene', ConveySvoSceneElement)
}
