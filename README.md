# convey-web

A CSS/TypeScript design system built on the [Conveyance Manifesto](https://github.com/HereLiesAz/Conveyance).

The web-native counterpart to [`convey`](https://github.com/HereLiesAz/convey) (Compose
Multiplatform) — same vocabulary, same enforcement rules, framework-agnostic Web Components
instead of Compose composables.

**[Live demo →](https://hereliesaz.github.io/convey-web/)** — every component and mechanism in
this package, running and interactive, built by [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
from [`demo/index.html`](demo/index.html).

```ts
import { ConveyGrammar, ConveyWeightRegistry } from '@hereliesaz/convey-web'

const registry = new ConveyWeightRegistry()
registry.register(sendButtonId, 'hero')
registry.register(cancelButtonId, 'hero') // throws: two heroes has no hero
```

```html
<convey-system>
  <convey-weight weight="hero"><button>Send</button></convey-weight>
</convey-system>
```

## Why this exists

`convey` gives Compose apps the Manifesto's rules as compiler-adjacent constraints — motion
that must carry a declared meaning, hierarchy that throws when violated, disabled controls and
confirm dialogs replaced by mechanisms that respect the person on the other end of the screen.
None of that reaches a web app. `convey-web` is the same argument, ported: not a component kit
first, enforcement first.

- **Motion means something, or it doesn't exist.** `ConveyGrammar` maps a `meaning` string to
  an `AnimationSpec` — `get()` throws on an undeclared meaning, at the call site.
- **Hierarchy is enforced, not suggested.** `ConveyWeightRegistry` throws if a second `hero`
  registers, or too many `primary`s do.
- **CSS has no spring easing, so this gives it one.** `springToLinearEasing()` samples the same
  damped-harmonic-oscillator model Compose's `spring()` animates and emits a CSS `linear()`
  easing function — spring motion via a declarative `transition`, no per-frame JS.

## Getting started

```bash
npm install @hereliesaz/convey-web
```

```ts
import '@hereliesaz/convey-web/style.css'
import { ConveyMotion, springToLinearEasing } from '@hereliesaz/convey-web'

el.style.transitionTimingFunction = springToLinearEasing(ConveyMotion.Snappy)
```

See [AGENTS.md](AGENTS.md) for the full module shape and build instructions.

## What's actually here today

**Built, tested:** the tokens (`ConveyMotion`/`Shape`/`Color`/`Size`), `ConveyGrammar`, and
`ConveyWeight` enforcement layer; every component from `convey`'s first concrete-visual-
component batch — `<convey-avatar>`, `<convey-badge>`, `<convey-card>`, `<convey-chip>`,
`<convey-list-item>`, `<convey-navigation-bar>`, `<convey-segmented-control>`,
`<convey-switch>`, `<convey-top-bar>`; all six framework-named "Replaces X" mechanisms —
`<convey-escorted>`, `<convey-reversal>`, `<convey-yield>`, `<convey-migration>`,
`<convey-offer>`, `<convey-enter>`; Employment (Law 4)/Practice-decay (§6.3) enforcement; and the
remaining supporting primitives — `ConveyAffordance`, `ConveyInteraction`, `ConveyTransform`,
`ConveyMorph`, `ConveyLife`. All ported bit-for-bit from `convey`'s own Kotlin source. 177 tests,
0 `npm audit` vulnerabilities.

**Not yet done:** the WordNet/VerbNet-backed kinetic typography layer
(`ConveyVerb`/`ConveyNoun`/`ConveyKineticText`/`ConveySvoScene`) — see
[AGENTS.md](AGENTS.md) for the honest current-state accounting.

## License

[Apache License 2.0](LICENSE).
