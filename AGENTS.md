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

**Built, tested:** the full tokens/grammar/weight enforcement layer, plus every component from
`convey`'s first concrete-visual-component batch (the same 9 listed in `convey/AGENTS.md`) — 51
tests, `npm run build` and `npm test` both pass clean, 0 `npm audit` vulnerabilities.

**Not yet done:** the framework-named "Replaces X" mechanisms (Escort/Reversal/Yield/Migration/
Offer/Enter), Employment (Law 4) and Practice-decay (§6.3) enforcement, and the WordNet/VerbNet-
backed kinetic typography layer (`ConveyVerb`/`ConveyNoun`/`ConveySvoScene`) — that last one is a
large, genuinely separate undertaking (real linguistic data, not just a UI port) and hasn't been
started. Being added incrementally, same cadence as `convey` itself was built.

## License

[Apache License 2.0](LICENSE).
