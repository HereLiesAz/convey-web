import type { ConveyShapeToken } from './shape.js'

/**
 * The real Material 3 Expressive 35-polygon shape vocabulary for the web — the TypeScript
 * counterpart to convey's own `ConveyExpressiveShape.kt`.
 *
 * Rather than reimplementing AndroidX Graphics Shapes' rounded-polygon-to-cubic-curve geometry
 * engine from scratch in TypeScript (a substantial undertaking: corner rounding/smoothing,
 * per-side cut-space allocation, convexity detection — see `RoundedPolygon.kt`'s own ~700 lines),
 * this wraps [`material-shapes-ts`](https://github.com/ruanspies/material-shapes-ts) (Apache 2.0,
 * zero runtime dependencies) — an existing, faithful TypeScript port of that same AndroidX source,
 * verified for real in this repo: rendered a handful of its shapes (circle, heart, cookie9Sided,
 * sunny, pill, clover4Leaf, burst) to SVG in headless Chromium and confirmed the output visually
 * matches the same shapes rendered by `convey`'s own Kotlin port.
 *
 * CSS `clip-path: path(...)` does not scale path data to an element's box the way SVG's
 * `clipPathUnits="objectBoundingBox"` does — a raw `path()` clip-path is interpreted in the
 * element's own pixel coordinate system, while `material-shapes-ts` emits path data normalized
 * to a 0..1 box. So each shape gets one `<clipPath>` def (created lazily, once, in a shared
 * hidden `<svg>`) with `clipPathUnits="objectBoundingBox"`, and `shapeOf()` returns a
 * `ConveyShapeToken` whose `clipPath` is `url(#...)` pointing at it — that one def then clips
 * any element at any size, matching `material-shapes-ts`'s own Vue `v-material-shape` directive's
 * approach.
 *
 * A `url(#...)` fragment reference does not cross a shadow root boundary — an element inside a
 * custom element's shadow DOM cannot resolve a `clip-path: url(#foo)` pointing at a `<clipPath>`
 * living in the main document (verified for real in headless Chromium: `shapeOf()`'s document-level
 * def silently fails to clip a shadow-DOM element, no error, just an unclipped box). Any component
 * with its own shadow root (`components/expressive-badge.ts`, `components/expressive-offer.ts`)
 * must register its `<clipPath>` defs inside that same shadow root instead — `shapeOfIn()` is that
 * shadow-root-scoped counterpart to `shapeOf()`, keyed by root rather than always the document.
 */

const registered = new WeakMap<Document | ShadowRoot, Set<string>>()
let materialShapesModule: typeof import('material-shapes-ts') | null = null

async function loadModule(): Promise<typeof import('material-shapes-ts')> {
  if (!materialShapesModule) {
    materialShapesModule = await import('material-shapes-ts')
  }
  return materialShapesModule
}

function ensureDefsHost(root: Document | ShadowRoot): SVGSVGElement {
  const existing = root.querySelector('svg[data-convey-expressive-defs]') as SVGSVGElement | null
  if (existing) return existing
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('data-convey-expressive-defs', '')
  svg.style.position = 'absolute'
  svg.style.overflow = 'hidden'
  if (root instanceof Document) {
    root.body.appendChild(svg)
  } else {
    root.appendChild(svg)
  }
  return svg
}

function registerClipPath(root: Document | ShadowRoot, idPrefix: string, name: string, pathData: string): string {
  const id = `${idPrefix}-${name}`
  let seen = registered.get(root)
  if (!seen) {
    seen = new Set()
    registered.set(root, seen)
  }
  if (!seen.has(id) || !root.querySelector(`[id="${id}"]`)) {
    const svg = ensureDefsHost(root)
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
    clipPath.setAttribute('id', id)
    clipPath.setAttribute('clipPathUnits', 'objectBoundingBox')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData)
    clipPath.appendChild(path)
    svg.appendChild(clipPath)
    seen.add(id)
  }
  return `url(#${id})`
}

export const ConveyExpressiveShape = {
  /** Loads `material-shapes-ts` (idempotent) — call once before the functions below. */
  ensureLoaded: loadModule,

  /** The raw, normalized (0..1 box) SVG path data for a shape name (M3's own constant names, lowercased-first-letter). */
  pathDataOf(name: string): string {
    if (!materialShapesModule) {
      throw new Error('ConveyExpressiveShape.ensureLoaded() must resolve before pathDataOf()')
    }
    const key = (name.charAt(0).toUpperCase() + name.slice(1)) as Parameters<
      typeof materialShapesModule.MaterialShapes.byName
    >[0]
    const polygon = materialShapesModule.MaterialShapes.byName(key) ?? materialShapesModule.MaterialShapes.Circle
    return materialShapesModule.roundedPolygonToPath(polygon).toSvgPathData()
  },

  /**
   * A `ConveyShapeToken` (`{ name, clipPath }`) usable directly with `applyShape()`, for a
   * non-morphing element in the main document's own tree (light DOM, or a component with no
   * shadow root of its own). For an element inside a shadow root, use `shapeOfIn()` instead.
   */
  shapeOf(name: string): ConveyShapeToken {
    const pathData = ConveyExpressiveShape.pathDataOf(name)
    return { name, clipPath: registerClipPath(document, 'convey-expressive', name, pathData) }
  },

  /**
   * `shapeOf()`'s shadow-root-scoped counterpart: registers the `<clipPath>` def inside `root`
   * itself rather than the main document, so a `clip-path: url(#...)` set on an element inside
   * that same shadow root actually resolves (a `url(#...)` reference cannot cross a shadow
   * boundary — see this module's own doc comment). Pass the owning custom element's `shadowRoot`.
   */
  shapeOfIn(root: ShadowRoot, name: string): ConveyShapeToken {
    const pathData = ConveyExpressiveShape.pathDataOf(name)
    return { name, clipPath: registerClipPath(root, 'convey-expressive-local', name, pathData) }
  },
} as const
