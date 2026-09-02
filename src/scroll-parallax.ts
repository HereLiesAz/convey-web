/**
 * The scroll-linked-animation infrastructure Part XII (§12.5, "The Body Block") of the
 * Conveyance Manifesto calls for — neither the DOM's `scroll` event model nor any part of this
 * library had a ready-made way to continuously map scroll position to a transform (CSS's own
 * `scroll-timeline`/`animation-timeline` covers similar ground in the newest browsers, but this
 * is a from-scratch, broadly-compatible implementation rather than a wrapper over that still-new
 * API). This is genuinely new infrastructure, not a port of something that already existed.
 */
export type ConveyParallaxDirection = 'horizontal' | 'vertical'

interface ConveyScrollParallaxApi {
  readonly DEFAULT_ENTRANCE_ZONE_FRACTION: number
  entranceProgress(itemTopInViewport: number, viewportHeight: number, entranceZoneFraction?: number): number
  translation(progress: number, distance: number): number
}

/**
 * Pure, dependency-free math for §12.5's scroll-linked entrance — identical in shape to
 * `convey`'s own `ConveyScrollParallax.kt`, so the two platforms agree on what "entrance
 * progress" means even though their rendering mechanics differ.
 */
export const ConveyScrollParallax: ConveyScrollParallaxApi = {
  /** How much of the viewport's own height counts as the "entering" zone, measured up from its bottom edge. */
  DEFAULT_ENTRANCE_ZONE_FRACTION: 0.5,

  /**
   * 0 when `itemTopInViewport` sits at or below the bottom of the entrance zone (not yet
   * entered), 1 once it has crossed entirely into the settled zone above it, linear in
   * between. Linear, not eased — matches the rest of the framework's preference for a legible,
   * literal relationship between the input (scroll position) and the output (progress) over a
   * stylized curve.
   */
  entranceProgress(itemTopInViewport: number, viewportHeight: number, entranceZoneFraction = ConveyScrollParallax.DEFAULT_ENTRANCE_ZONE_FRACTION): number {
    if (viewportHeight <= 0) return 1
    const zoneHeight = viewportHeight * entranceZoneFraction
    const zoneBottom = viewportHeight
    const zoneTop = viewportHeight - zoneHeight
    if (itemTopInViewport <= zoneTop) return 1
    if (itemTopInViewport >= zoneBottom) return 0
    return (zoneBottom - itemTopInViewport) / zoneHeight
  },

  /** The entrance transform's magnitude at `progress` -- `distance` at progress 0, 0 at progress 1. */
  translation(progress: number, distance: number): number {
    const clamped = Math.min(1, Math.max(0, progress))
    return distance * (1 - clamped)
  },
}

export interface ConveyScrollParallaxItem {
  element: HTMLElement
  direction: ConveyParallaxDirection
  distancePx: number
}

/**
 * Owns one scrolling container's §12.5 entrance effect for every registered item: a single
 * `scroll` listener (rAF-throttled, so a fast scroll doesn't queue more than one recompute per
 * frame) reads each item's live `getBoundingClientRect()` against the container's own and writes
 * `transform`/`opacity` directly — the same "read position, write a transform, skip
 * recomposition/re-render" discipline `convey`'s own `Modifier.conveyScrollParallax` uses via
 * `graphicsLayer`.
 */
export class ConveyScrollParallaxController {
  #container: HTMLElement
  #entranceZoneFraction: number
  #items: ConveyScrollParallaxItem[] = []
  #rafHandle: number | null = null
  #scheduleUpdate = (): void => {
    if (this.#rafHandle !== null) return
    this.#rafHandle = requestAnimationFrame(() => {
      this.#rafHandle = null
      this.#update()
    })
  }

  constructor(container: HTMLElement, entranceZoneFraction: number = ConveyScrollParallax.DEFAULT_ENTRANCE_ZONE_FRACTION) {
    this.#container = container
    this.#entranceZoneFraction = entranceZoneFraction
    container.addEventListener('scroll', this.#scheduleUpdate, { passive: true })
  }

  /** Registers `item` for the entrance effect. Returns an unregister function. */
  register(item: ConveyScrollParallaxItem): () => void {
    this.#items.push(item)
    this.#scheduleUpdate()
    return () => {
      this.#items = this.#items.filter((existing) => existing !== item)
    }
  }

  #update(): void {
    const viewportRect = this.#container.getBoundingClientRect()
    for (const item of this.#items) {
      const itemRect = item.element.getBoundingClientRect()
      const itemTopInViewport = itemRect.top - viewportRect.top
      const progress = ConveyScrollParallax.entranceProgress(itemTopInViewport, viewportRect.height, this.#entranceZoneFraction)
      const offset = ConveyScrollParallax.translation(progress, item.distancePx)
      const clampedProgress = Math.min(1, Math.max(0, progress))
      item.element.style.opacity = String(clampedProgress)
      item.element.style.transform = item.direction === 'horizontal' ? `translateX(${offset}px)` : `translateY(${offset}px)`
    }
  }

  /** Forces an immediate recompute (e.g. right after registering new items whose layout just settled). */
  recompute(): void {
    this.#update()
  }

  destroy(): void {
    this.#container.removeEventListener('scroll', this.#scheduleUpdate)
    if (this.#rafHandle !== null) {
      cancelAnimationFrame(this.#rafHandle)
      this.#rafHandle = null
    }
    this.#items = []
  }
}
