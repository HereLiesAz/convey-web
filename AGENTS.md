# convey-web

TypeScript + native Web Components implementation of the [Conveyance Manifesto](https://github.com/HereLiesAz/Conveyance/)
— the web-native counterpart to [`convey`](https://github.com/HereLiesAz/convey) (Compose
Multiplatform). Framework-agnostic on purpose: it ships as plain custom elements plus CSS custom
properties, so it drops into vanilla HTML, React, Vue, Svelte, or anything else without forcing a
framework choice.

## Building

```
npm install
npm run build      # tsc --noEmit, then vite library build -> dist/
npm test           # vitest
npm run typecheck  # tsc --noEmit only
```

CI (`.github/workflows/build.yml`) runs `npm ci && npm run build && npm test` — treat that
workflow as the source of truth for how this project is built if this document and it ever
disagree.

## Demo / repo page

[`demo/index.html`](demo/index.html) is a plain, framework-free HTML page exercising every
component and mechanism in this package — tokens (including a live `ConveyType` specimen with
`wght`/`wdth`/`SERF`/`GRAD` sliders — the whole page itself renders in Azrienoch, loaded via
`@font-face` from `./fonts/Azrienoch-VF.woff2`), weight enforcement, all nine visual
components, Escort/Reversal/Yield/Migration/Offer, affordance/interaction/life, and the
kinetic-typography layer — its ~4MB-gzipped data starts fetching automatically on page load (no
button to click), with the demos below activating live once it resolves: a live
`<convey-kinetic-text>`, a `<convey-kinetic-sentence>` with an editable sentence
input showing each word's real classification, and a `<convey-svo-scene>` with an editable
sentence and four example buttons demonstrating different verb-timeline shapes (continuous
Motion, MannerAgent, Contact, and a no-motion Emotion fallback) — including one documented
example ("The dog carried the stick") that deliberately demonstrates the heuristic chunker's
known limitation live (WordNet really does have a verb sense of "dog"). It imports the library
directly via `<script type="module">` from `./convey-web.js`/`./convey-web.css`/`./kinetic.js`
(no bundler of its own), so it only works once those sit next to it — which is exactly what
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) does: build the library, copy
every `dist/*.js`/`dist/*.css` output (including the kinetic entry point and its data chunks)
and `demo/fonts/` (the vendored `Azrienoch-VF.woff2` + its OFL notice) alongside a copy of
`demo/index.html` as `index.html`, and deploy that directory to GitHub
Pages on every push to `main` that touches `demo/`, `src/`, or the build config. Live at
<https://hereliesaz.github.io/convey-web/> (requires the repo's Pages source set to "GitHub
Actions" under Settings → Pages, a one-time manual step this workflow can't perform on its own).

To preview `demo/index.html` locally: `npm run build`, then copy every `dist/*.js`/`dist/*.css`
file next to it (or symlink the whole `dist/` directory's contents in) and serve the directory
with any static file server — opening it via `file://` won't work, since module scripts require
an HTTP origin.

## Module shape

Mirrors `convey`'s own top-level package shape as closely as the platform allows — same names,
same enforcement rules, ported vocabulary rather than a fresh design:

- `tokens/motion.ts` — `ConveyMotion`: named springs (`Snappy`/`Standard`/`Deliberate`/`Elastic`/
  `Heroic`), tweens (`Exit`/`Enter`), `Interrupt` (a snap), the duration scale, and easing curves —
  values ported bit-for-bit from `convey`'s `ConveyMotion.kt`. CSS has no native spring easing, so
  `springToLinearEasing()` samples a damped harmonic oscillator into a CSS `linear()` easing
  function (Baseline 2023+) — the only way to get spring motion out of a declarative
  `transition`/`animation`, with no per-frame JS stepping.
- `tokens/shape.ts` — `ConveyShape`: the same radius/chamfer hierarchy as `ConveyShape.kt`, as CSS
  `border-radius` values (or `clip-path` polygons for the chamfered `Cut`/`CutSmall` shapes, which
  `border-radius` cannot express).
- `tokens/color.ts` — `ConveyColor`: the same reference hex palette, plus `cssVariables` mapping
  each token to a `--convey-*` custom property and `toCssVariableBlock()` for generating a
  `:root { }` block from a palette override.
- `tokens/size.ts` — `ConveySize`: the same spacing/component/elevation/stroke scale, in `rem`
  (not `px`) — `rem` is the web's own density-independent unit, the direct analog of Compose's
  `dp`; every value is `dp / 16`.
- `tokens/type.ts` — `ConveyType`: this library's official typeface,
  [Azrienoch](https://github.com/HereLiesAz/Azrienoch) — a multiplex variable font (SIL OFL
  1.1) exposing `wght`/`wdth`/`SERF`/`GRAD` as one family instead of a family per weight/style.
  `ConveyTypeAxes` names each axis's real range; `fontVariationSettings(variation)` builds a
  CSS `font-variation-settings` value from a partial override (unspecified axes fall back to
  their own default, given values clamp into range); `ConveyTypePreset` names a few common
  points in the space (`Bold`, `Condensed`, `Slab`, ...); `toFontFaceCss(url)` emits the
  `@font-face` block. The compiled font itself ships at `fonts/Azrienoch-VF.woff2` (also
  exported as the `./fonts/Azrienoch-VF.woff2` subpath) — this module has no bundler of its
  own to resolve that path for you, so `url` is yours to provide, pointed at wherever your own
  build serves the file from. See `THIRD_PARTY_NOTICES.md` for the font's license, which
  travels with it as `fonts/Azrienoch-OFL.txt`.
- `grammar.ts` — `ConveyGrammar`: the meaning→spec vocabulary contract, `ConveyGrammar.Default`
  with the same eight meanings as `ConveyGrammar.kt` (`navigate`/`reveal`/`confirm`/`dismiss`/
  `morph`/`load`/`error`/`delight`), fail-fast `get()` on an undeclared meaning, `audit()`.
- `weight.ts` — `ConveyWeight` (`'hero' | 'primary' | 'secondary' | 'ghost'`) and
  `ConveyWeightRegistry`, the same hierarchy enforcement as `ConveyWeightRegistry.kt` (one Hero,
  `maxPrimary` Primaries, unlimited Secondary/Ghost). Compose enforces this through a
  `CompositionLocal` a `DisposableEffect` registers into; the web has no composition lifecycle, so
  this ships both the imperative registry API (for a framework adapter's own `useEffect`/
  `onMounted`) and a ready-made `<convey-weight weight="hero">` custom element that does the same
  registration via `connectedCallback`/`disconnectedCallback` for framework-free HTML.
- `system.ts` — `ConveySystemElement` (`<convey-system>`): the root that activates enforcement —
  the web port of `ConveyProvider`/`ConveySystem`. A descendant looks up its nearest
  `<convey-system>` ancestor via `closest()`, the DOM's own answer to "ambient current value."

`components/` holds the concrete visual components — every one of `convey`'s first batch, ported
bit-for-bit from the same Kotlin source:

- `avatar.ts` — `<convey-avatar>`: circular identity, falls back to name initials (capped at two)
  when nothing is slotted.
- `badge.ts` — `<convey-badge>`: dot/count indicator anchored to slotted content, morph in/out on
  visibility change, confirm bounce on a genuine count change.
- `card.ts` — `<convey-card>`: weight-aware container surface; `elevation` is a real CSS
  `box-shadow` (`0px` collapses to `none`, not a zero-blur shadow that still paints).
- `chip.ts` — `<convey-chip>`: selectable tag, morphs background/content color on `selected`;
  `convey-remove` is deliberately not wired to any removal mechanism itself.
- `design.ts` — `<convey-design>`/`<convey-design-page>`/`ConveyDesignSolver`: Part XI of the
  Conveyance Manifesto ("The Design Block") — automatic composition for a block of
  semantic-level text lines (`title`/`header1`/`header2`/`header3`/`body`), solving
  size/weight/condensation/tracking so the block's silhouette reads as balanced (hierarchy-balance
  mode for freestanding lines, column-fill mode plus the column-targeting/mirror-fallback rules
  for lines in a column relationship). `<convey-design-page>` promotes the same rules one level
  (§11.7): multiple blocks (`blocks`, a JS property of line arrays) relate to each other the way
  lines within one block do, reusing `targetColumnFor`/the mirror-fallback rule unchanged rather
  than a separate mechanism, plus height-balancing when a block has fewer lines than the blocks
  before it. `ConveyDesignSolver` (`solveBlock`/`solvePage`) is pure, dependency-free math and
  defaults to `naturalWidth`'s fixed per-character advance-width approximation, which is what
  `test/design.test.ts` exercises directly (no DOM to measure against there); both `solveBlock`/
  `solvePage` and `solveToWidth` take an optional trailing `ConveyDesignMeasure` to swap that
  approximation out. `<convey-design>`/`<convey-design-page>` default their own `measure`
  property to `createDomMeasurer()` instead — a real, DOM-based measurer (a hidden, off-screen
  span carrying the exact CSS a solved line will render with, read via
  `getBoundingClientRect().width`, lazily created once and reused) that falls back to
  `naturalWidth` outside a real browser (no `document`, or a layout-less environment like jsdom
  that always reports zero-width rects). Condensation and weight render through real Azrienoch
  `wdth`/`wght` axes via `fontVariationSettings` (`tokens/type.ts`), not a CSS-transform
  approximation. Each line's `motion` (`'none'`/`'kinetic'`/`'sentence'`, default `'none'`)
  optionally routes it through `<convey-kinetic-text>`/`<convey-kinetic-sentence>` from the
  separate `kinetic/` entry point (created via `document.createElement`, never statically
  imported, so this stays in the main bundle) — per §4.2 of the manifesto, text animation is
  offered, never assumed. A line with `isAct` set ignores `motion` and always renders through
  `<convey-act-text>` (`decoration.ts`) instead.
- `decoration.ts` — `<convey-act-text>`: Part IV §4.2, "Text as an Act" — the Decoration channel.
  A persistent visual marker (`text-decoration: underline`) on text that is itself an Act, plus a
  one-time Tell burst through `<convey-kinetic-text>` (same opt-in `kinetic/` bundle-boundary
  pattern as `design.ts`'s motion) for an unpracticed instance, gated by a `ConveyPracticeRegistry`
  (own instance by default, or shared via the `registry` property).
- `list-item.ts` — `<convey-list-item>`: the weight-aware row primitive (leading/title/subtitle/
  trailing named slots).
- `navigation-bar.ts` — `<convey-navigation-bar>`: sliding-pill destination switcher, the pill
  fixed at 60% of each destination's width, positioned behind the selected one.
- `segmented-control.ts` — `<convey-segmented-control>`: sliding-indicator selection among
  equal-width segments, positioned with pure `%`-based CSS transforms (no `ResizeObserver`
  needed — it stays correct across container resizes for free).
- `switch.ts` — `<convey-switch>`: toggle with one persistent thumb that slides and morphs color
  rather than being replaced for on/off.
- `top-bar.ts` — `<convey-top-bar>`: thin structural chrome (leading/title/actions slots); the
  title region registers into the nearest `ConveyWeightRegistry`, defaulting to `primary`.

`<convey-list-item>`/`<convey-card>`/`<convey-top-bar>` register themselves (not a wrapped child)
into the nearest ancestor registry via `nearestWeightRegistry()` (exported from `weight.ts`),
since each of them IS the weighted element. `<convey-switch>`/`<convey-chip>`/
`<convey-segmented-control>`/`<convey-navigation-bar>` fire a `convey-change`/`convey-select`
event rather than self-mutating their own `checked`/`selected` attribute — the caller owns the
source of truth, the same contract a controlled input follows.

Every animated component routes through `safeAnimate()` (`tokens/motion.ts`) rather than calling
`Element.animate()` directly: `Element.animate()` (Web Animations API) isn't implemented in
jsdom, so any Vitest/Jest-based consumer test would otherwise crash on mount. `safeAnimate()`
applies the final keyframe as inline styles when WAAPI is unavailable instead of throwing.

The six framework-named "Replaces X" mechanisms, all ported from `convey`'s own `foundation/`
sources:

- `escort.ts` — `ConveyGate`/`ConveyEscortRegistry`/`<convey-gate-location>`/`<convey-escorted>`:
  a blocked control performs a Refuse shake, then scrolls/focuses to its gate's registered
  location, instead of doing nothing or looking disabled.
- `reversal.ts` — `ConveyReversalState`/`<convey-reversal>`: a destroyed item collapses to a
  compact, clickable "undo" residue in place for a configurable window, instead of a confirm
  dialog or a toast that steals space and leaves.
- `yield.ts` — `<convey-yield state="idle|determinate|indeterminate">`: the engaged element
  deforms under load (a proportional or rhythmic fill overlay, plus compression) instead of a
  separate spinner/progress-bar object appearing beside it. The indeterminate loop is a plain
  WAAPI keyframe animation (`iterations: Infinity`, `direction: 'alternate'`) — no manual loop.
- `migration.ts` — `<convey-migration empty corner="bottom-end">`: an empty collection's creation
  control sits full-size and centered, then relocates to its permanent corner and shrinks on
  first use, instead of an empty-state illustration and paragraph. Ports `BiasAlignment`'s own
  math directly as CSS percentages.
- `offer.ts` — `<convey-offer phase="invite|progress|success|failure|interrupted">`: composes
  gate-blocked invocation, interruptible progress, and all five phases rendering from one
  element via named slots, into the one thing product code actually reaches for. Implements the
  behavior directly rather than first porting `ConveyStateHost`/`ConveyConstruct` as separate
  primitives — those exist in Kotlin mainly for internal code reuse.
- `enter.ts` — `<convey-origin key="...">`/`<convey-enter key="...">`: Law 2 continuity for
  navigation — a destination grows from the origin element's last recorded bounds (a scale/
  translate transform), instead of appearing from nowhere. Same honest caveat as the Kotlin
  original: not visually verified against a real display in this environment.

Plus two enforcement/audit primitives from convey's top-level package:

- `employment.ts` — `ConveyJob`/`ConveyEmploymentRegistry`/`<convey-employment>`: Law 4 — every
  element does at least `minimumJobs` (default 4) declared jobs, or is honestly `ambient`
  (budgeted per surface). Faithfully reproduces a real asymmetry from the Kotlin original:
  unlike `ConveyWeightRegistry`, `<convey-system>` does *not* provide a default
  `ConveyEmploymentRegistry` — an unprovided `<convey-employment>` gets its own fresh, unshared
  registry rather than one shared with siblings, matching
  `staticCompositionLocalOf { ConveyEmploymentRegistry() }`'s own per-reader default.
- `practice.ts` — `ConveyPracticeRegistry`/`conveyPracticeDecay`/`decayed`: §6.3 practice-decay —
  an element's recorded operation count decays a motion's ceremony (a tween shortens, a spring
  stiffens) toward a floor, never fully removing it.

And the remaining supporting primitives, completing `convey`'s enforcement/motion vocabulary:

- `affordance.ts` — `ConveyAffordance`/`applyConveyAffordance`/`<convey-affordance>`:
  self-revealing interactivity — an element teaches its own interactivity once through movement
  (press-hint, swipe-hint, drag-hint, expand-hint), then stops. `conveyPracticedAffordance`
  (Kotlin's practice-gated affordance) lives in `practice.ts` since it also needs
  `ConveyPracticeRegistry`: once `key` has recorded an operation, the Tell has already taught its
  lesson and is silently replaced with `ConveyAffordance.None`.
- `interaction.ts` — `conveyRipple`/`conveyPress`/`conveyLongPress`/`conveySwipe`: the interaction
  layer — ripple teaches WHERE a touch registered, press-scale teaches THAT it was received,
  long-press's SVG progress ring teaches HOW MUCH LONGER to hold, swipe resistance teaches THAT
  there's content beyond the edge.
- `transform.ts` — `conveyScaleOnPress`/`conveyLiftOnHover`/`conveyRotateOnHover`/`conveyScaleIn`/
  `conveySlideIn`: the five named transforms, each attached to an existing element (no Modifier
  chain on the web to compose several through the way `Modifier.conveyTransform { }`'s DSL does).
- `morph.ts` — `ConveyMorphController`: persistent visual identity across state changes — one
  element demonstrating its full range rather than old content vanishing and new content
  appearing. Uses CSS's own native `border-radius`/`clip-path` interpolation rather than the
  Kotlin original's from-scratch path-sampling engine — see the class doc for exactly which shape
  pairs that covers and which it doesn't.
- `life.ts` — `ConveyLife`/`applyConveyLife`/`triggerConveyLifeBurst`: continuous idle motion
  (Breathe/Twinkle/Wobble) for chrome that should never look inert, distinct from
  `ConveyAffordance` (teaches once, then stops) — `ConveyLife` never stops on its own.
- `scroll-parallax.ts` — `ConveyScrollParallax`/`ConveyScrollParallaxController`: Part XII
  (§12.5, "The Body Block") of the Conveyance Manifesto's scroll-linked-animation
  infrastructure — genuinely new, not a port of anything that already existed on either
  platform. `ConveyScrollParallax` is pure, dependency-free math (`entranceProgress`/
  `translation`) identical in shape to `convey`'s own `ConveyScrollParallax.kt`, so both
  platforms agree on what "entrance progress" means even though their rendering mechanics
  differ. `ConveyScrollParallaxController` owns one scrolling container's effect for every
  registered item: a single rAF-throttled `scroll` listener reads each item's live
  `getBoundingClientRect()` against the container's own and writes `transform`/`opacity`
  directly, skipping any framework re-render — the same "read position, write a transform"
  discipline `convey`'s `Modifier.conveyScrollParallax` gets from `graphicsLayer`'s draw-phase
  state reads.

### `kinetic/` — the WordNet+VerbNet-backed kinetic-typography layer

A **separate entry point** (`@hereliesaz/convey-web/kinetic`, `src/kinetic/index.ts`), not
re-exported from the main `index.ts` — its data assets (~1.5MB verb, ~10MB noun, both
WordNet-derived) are opt-in, never part of the default bundle. See
`src/kinetic/data/README.md` for the data format and regeneration steps, and
`THIRD_PARTY_NOTICES.md` for its license (Princeton WordNet 3.0 requires the notice travel
with any redistribution; VerbNet 3.3 is a build-time-only input, never redistributed as raw
data — same discipline `convey`'s own Kotlin data follows).

- `verb.ts` — `ConveyVerbLexicon`/`loadConveyVerbData()`: deterministic verb classification
  (`ConveyVerbClass`, 22 cases — 15 WordNet lexicographer domains plus 7 VerbNet-derived
  refinements plus `Unclassified`) via Simplified Lesk word-sense disambiguation over real
  WordNet 3.0 + VerbNet 3.3 data, plus `toEventTimeline()` (a verb's reduction onto the
  physical-event booleans `svo-scene.ts`'s force simulator drives from) and `toConveyLife()`
  (a verb class's idle-motion profile). Data loads asynchronously (`await
  loadConveyVerbData()`) — the Kotlin original's data is compiled into the binary and can
  afford a synchronous `by lazy`; this port's data is a separate fetched/bundled asset, so
  every classification function throws until loading resolves.
- `noun.ts` — `ConveyNounLexicon`: the same WordNet-data/Simplified-Lesk shape as `verb.ts`,
  classifying animacy and count/mass instead. Returns `null` (not `Unclassified` — nouns have
  no catch-all case) when a word can't be resolved.
- `force-dynamics.ts` — `Vec2`/`ConveyRigidBody`/`ConveySpringMassBody`/`ConveyGaitOscillator`/
  `attraction`/`repulsion`/`hasCollided`: the pure-math 2D physics primitives `svo-scene.ts`
  consumes, symplectic-Euler-integrated, no external physics dependency — same hand-scoped
  primitive set as the Kotlin original's `foundation/ConveyForceDynamics.kt`, ported by direct
  translation (self-contained, no data dependency, no web-platform gap to navigate).
- `kinetic-text.ts` — `<convey-kinetic-text>` (per-glyph idle motion + `triggerBurst()`, the
  imperative equivalent of the Kotlin original's `triggerKey`-change detection since there's no
  composition lifecycle to hook a key comparison into) and `<convey-kinetic-sentence>` (per-word
  motion from `ConveyVerbLexicon`'s classification of each word, each word its own
  `<convey-kinetic-text>` instance so within-word stagger still applies).
- `svo-scene.ts` — `<convey-svo-scene>` and `parseSvoHeuristic()`: splits a sentence into
  subject/verb/object via a heuristic chunker (deliberately not a real syntactic parser — see
  its own doc comment for a live example of the resulting limitation), classifies the nouns
  and verb, and drives `force-dynamics.ts` via a `requestAnimationFrame` loop to animate the
  subject toward the object (translate, collide, squash/stretch, gait bob/tilt for an animate
  subject). Falls back to `<convey-kinetic-sentence>` when the heuristic can't split the
  sentence or the verb has no spatial component.
- `body.ts` — `<convey-body>`/`ConveyBodyClassifier`: Part XII (§12.5) of the Conveyance
  Manifesto, "The Body Block" — a body-prose sibling to `design.ts`'s heading-hierarchy
  primitive, for `paragraph`/`quote` roles rather than semantic levels. Additive only (never
  overrides conventional semantic delegation) and mandatory rather than opt-in: every word
  inside a `<convey-body>` gets one classification pass (reusing `ConveyVerbLexicon`/
  `ConveyNounLexicon`, the same WordNet+VerbNet engine `kinetic-text.ts` already uses) that
  drives both its idle motion (`toConveyLife()`, unchanged from `kinetic-text.ts`'s own
  mapping — "one motion grammar for text, not two") and its font weight, fluidly per word
  rather than fixed per level (`ConveyBodyClassifier.verbWeightDelta`/`nounWeightDelta` are a
  deliberate, coarse three-bucket judgment call, same spirit as `design.ts`'s own
  `inkScore` — not empirically validated). Each line also gets a mandatory §12.5 scroll-linked
  parallax entrance via `scroll-parallax.ts`, direction keyed to role: `paragraph` enters
  horizontal, `quote` vertical. `<convey-body>` brings its own scroll container (an internal
  `.viewport` div wired to a `ConveyScrollParallaxController`) rather than reading an
  externally-supplied scroll state. Unlike `design.ts`'s motion (optional, only opportunistically
  touching the kinetic bundle via a runtime `customElements.get()` check), classification here
  is load-bearing for the block's own layout, so `body.ts` lives in the `kinetic/` entry point
  as a hard dependency, not the main bundle — matching the async-data reality below: it renders
  plain text immediately, then re-renders once `Promise.all([loadConveyVerbData(),
  loadConveyNounData()])` resolves. Wired into `demo/index.html`'s `#body` section and actually
  visually verified: a headless-Chromium screenshot (Playwright's bundled Chromium, no display)
  of the built demo page shows real per-word weight variation once the kinetic engine finishes
  loading — heavy-verb-class words ("sprints", "chasing") render bolder than cognition-verb-class
  words ("considered", "weighing") within the same rendered line, matching the Kotlin sibling's
  own verified output.

The data-generation pipeline (`scripts/generate-lexicon-data.mjs`) is a from-scratch
reconstruction of `convey`'s own (undocumented, not-checked-into-that-repo) `codegen.py` --
built from that repo's docs' prose description of the algorithm plus direct inspection of the
raw WordNet/VerbNet file formats, not a port of code that was never available to read. Its
output was validated against every specific example `convey`'s own docs cite (breathe→Body
overridden to SubtleBody via VerbNet's `breathe-40.1.2`, run→MannerAgent via `run-51.3`,
person/animal as the animacy roots, water as a Mass noun) and its synset/lemma counts land
almost exactly on the noun counts convey's own SVO doc cites — see
`src/kinetic/data/README.md`'s own "fidelity" section for the full account, including where
this reconstruction is a good-faith approximation rather than a guaranteed byte-for-byte match
(the VerbNet-refinement priority rule in particular).

Several real jsdom-vs-real-browser gaps were found and fixed while writing these mechanisms'
tests, all guarded the same way `safeAnimate()` guards `Element.animate()`: `scrollIntoView()`
isn't implemented in jsdom either (`escort.ts` feature-detects it); neither is pointer capture
(`interaction.ts`'s `conveySwipe`); jsdom has no global `PointerEvent` constructor at all (a
test-infrastructure gap only — production code only listens for pointer events, never
constructs one); `getComputedStyle(el).position` returns `''` rather than the real default
`'static'` for an unset position (`interaction.ts`'s hover-lift/long-press ring positioning
guards against both); and setting `.style.width = '0'` round-trips as `'0px'` per the CSSOM
spec's own serialization (not a bug — `yield.ts` just sets `'0px'` directly).

## A real platform difference from Compose, found while testing this

Per the WHATWG custom elements spec, an exception thrown inside a reaction callback
(`connectedCallback`, etc.) is *reported* — the DOM's own "uncaught error," visible in the
console/devtools and to a `window.addEventListener('error', ...)` listener — not propagated to
whatever DOM call triggered the connection (`appendChild`, `innerHTML`, ...). Confirmed against
jsdom's own spec-correct implementation while writing `<convey-list-item>`'s weight-enforcement
test, not assumed. Compose crashes composition synchronously on the same `ConveyWeightRegistry`
violation; the web port still fails loud, just asynchronously rather than by unwinding the call
stack. Documented directly on `ConveyWeightRegistry.register()`.

## What's actually here today

**Built, tested:** the full tokens/grammar/weight enforcement layer, every component from
`convey`'s first concrete-visual-component batch (the same 9 listed in `convey/AGENTS.md`), all
six framework-named "Replaces X" mechanisms (Escort/Reversal/Yield/Migration/Offer/Enter),
Employment (Law 4)/Practice-decay (§6.3) enforcement, the remaining supporting primitives —
`ConveyAffordance`, `ConveyInteraction`, `ConveyTransform`, `ConveyMorph`, `ConveyLife` — and
now the WordNet/VerbNet-backed kinetic-typography layer (`ConveyVerbLexicon`/`ConveyNounLexicon`,
the pure-math force-physics primitives, `<convey-kinetic-text>`/`<convey-kinetic-sentence>`/
`<convey-svo-scene>`) as a separate `@hereliesaz/convey-web/kinetic` entry point,
`ConveyType` — this library's official typeface (Azrienoch, a multiplex variable font),
the from-scratch scroll-linked-animation infrastructure (`scroll-parallax.ts`), and Part XII's
`<convey-body>` (`kinetic/body.ts`) — 302 tests, `npm run build` and `npm test` both pass
clean, 0 `npm audit` vulnerabilities.

**Not yet done:** nothing from `convey`'s current inventory — every mechanism/enforcement
primitive and the kinetic-typography layer are now ported. Two honest, documented gaps within
what IS built: `ConveyMorph` uses CSS's native shape interpolation rather than a from-scratch
path-sampling engine (covers fewer shape-pair transitions than the Kotlin original — see its
own doc comment), and the kinetic layer's data-generation pipeline
(`scripts/generate-lexicon-data.mjs`) is a from-scratch reconstruction of `convey`'s own
undocumented `codegen.py` rather than a port of it (that script was never checked into the
Kotlin repo to read) — validated against every specific example the Kotlin docs cite, but not
diffed synset-by-synset against real `codegen.py` output. See `src/kinetic/data/README.md`.

## License

[Apache License 2.0](LICENSE).
