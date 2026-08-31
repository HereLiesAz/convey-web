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

## What's actually here today

**Built, tested:** the full tokens/grammar/weight enforcement layer above — the foundation
everything else builds on, ported first for the same reason `convey` itself built its enforcement
layer before its visual components: components without it are just another component kit.

**Not yet done:** concrete visual components (list item, card, chip, badge, avatar, switch,
segmented control, top bar, navigation bar — the same first batch `convey` shipped), the
framework-named "Replaces X" mechanisms (Escort/Reversal/Yield/Migration/Offer/Enter), Employment
(Law 4) and Practice-decay (§6.3) enforcement. Being added incrementally, same cadence as `convey`
itself was built.

## License

[Apache License 2.0](LICENSE).
