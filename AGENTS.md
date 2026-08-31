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
component and mechanism in this package — tokens, weight enforcement, all nine visual
components, Escort/Reversal/Yield/Migration/Offer, affordance/interaction/life. It imports the
library directly via `<script type="module">` from `./convey-web.js`/`./convey-web.css` (no
bundler of its own), so it only works once those sit next to it — which is exactly what
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) does: build the library, copy
`dist/convey-web.js`/`dist/convey-web.css` alongside a copy of `demo/index.html` as `index.html`,
and deploy that directory to GitHub Pages on every push to `main` that touches `demo/`, `src/`,
or the build config. Live at <https://hereliesaz.github.io/convey-web/> (requires the repo's
Pages source set to "GitHub Actions" under Settings → Pages, a one-time manual step this
workflow can't perform on its own).

To preview `demo/index.html` locally: `npm run build`, then copy `dist/convey-web.js` and
`dist/convey-web.css` next to it (or symlink) and serve the directory with any static file
server — opening it via `file://` won't work, since module scripts require an HTTP origin.

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
Employment (Law 4)/Practice-decay (§6.3) enforcement, and the remaining supporting primitives —
`ConveyAffordance`, `ConveyInteraction`, `ConveyTransform`, `ConveyMorph`, `ConveyLife` — 177
tests, `npm run build` and `npm test` both pass clean, 0 `npm audit` vulnerabilities.

**Not yet done:** the WordNet/VerbNet-backed kinetic typography layer (`ConveyVerb`/`ConveyNoun`/
`ConveyKineticText`/`ConveySvoScene`) — a large, genuinely separate undertaking (real linguistic
data and a from-scratch 2D force-physics port, not just a UI port) and hasn't been started.

## License

[Apache License 2.0](LICENSE).
