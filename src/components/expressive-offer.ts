import { ConveyOfferElement, type ConveyOfferPhase } from '../offer.js'
import { ConveyExpressiveShape } from '../tokens/expressive-shape.js'
import { ConveyShape } from '../tokens/shape.js'

/**
 * `<convey-expressive-offer>` — the web port of convey's own `ConveyExpressiveOffer`, itself
 * a re-parametrization of `conveyance-expressive`'s `MorphControl` template
 * (`expressive.control.morph`) onto this library's `ConveyOffer`/`ConveyOfferPhase`
 * vocabulary rather than that library's own `Act`/`ActState`.
 *
 * A plain subclass of `ConveyOfferElement` (a distinct tag, registered separately — this is
 * an ordinary autonomous custom element, not a customized built-in) that sets the inherited
 * `shape` property to a different `ConveyExpressiveShape` per `phase`: `rest-shape` (default
 * `circle`) at `invite`/`failure`/`interrupted`, `busy-shape` (default `cookie9Sided`) at
 * `progress`, `resolved-shape` (default `heart`) at `success`.
 *
 * Unlike the Kotlin original's very first draft, this does not attempt a continuous,
 * self-driven pulse between shapes during `progress` — Kotlin's own version of that pulse
 * turned out to fight `ConveyStateHost`'s own morph animation and never visually settled (see
 * `ConveyExpressiveOffer.kt`'s doc comment for the full account once a real screenshot caught
 * it). The web side has an even more basic version of the same ceiling: CSS cannot interpolate
 * between two different `clip-path: url(#...)` references at all (unlike `border-radius` or a
 * same-shaped `clip-path: polygon(...)`, which `ConveyMorphController` already relies on) — so
 * a shape change here is always a discrete swap, never a smooth morph, regardless of how the
 * progress value driving it is computed. `<convey-offer>`'s own color/size *do* still animate
 * through `#applyStyle`'s existing WAAPI transitions; only the polygon outline itself snaps.
 *
 * Attributes (beyond `ConveyOfferElement`'s own `phase`/`weight`/...): `rest-shape`,
 * `busy-shape`, `resolved-shape`. `target-color`/`target-content-color` are not required —
 * unset, this element defaults to `weight`'s own container/content color (a shape with no
 * fill has nothing for the swap to visibly read against), same reasoning as the Kotlin side.
 */
export class ConveyExpressiveOfferElement extends ConveyOfferElement {
  static get observedAttributes(): string[] {
    return [...ConveyOfferElement.observedAttributes, 'rest-shape', 'busy-shape', 'resolved-shape']
  }

  connectedCallback(): void {
    super.connectedCallback()
    void this.#applyExpressiveShape()
  }

  attributeChangedCallback(name: string): void {
    super.attributeChangedCallback(name)
    if (!this.isConnected) return
    if (name === 'phase' || name === 'rest-shape' || name === 'busy-shape' || name === 'resolved-shape') {
      void this.#applyExpressiveShape()
    }
  }

  #phase(): ConveyOfferPhase {
    const raw = this.getAttribute('phase')
    return raw === 'progress' || raw === 'success' || raw === 'failure' || raw === 'interrupted' ? raw : 'invite'
  }

  async #applyExpressiveShape(): Promise<void> {
    await ConveyExpressiveShape.ensureLoaded()
    const restName = this.getAttribute('rest-shape') ?? 'circle'
    const busyName = this.getAttribute('busy-shape') ?? 'cookie9Sided'
    const resolvedName = this.getAttribute('resolved-shape') ?? 'heart'

    const name = this.#phase() === 'progress' ? busyName : this.#phase() === 'success' ? resolvedName : restName
    this.shape = name ? ConveyExpressiveShape.shapeOfIn(this.shadowRoot!, name) : ConveyShape.Medium
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-expressive-offer')) {
  customElements.define('convey-expressive-offer', ConveyExpressiveOfferElement)
}
