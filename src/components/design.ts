import { ConveyColor } from '../tokens/color.js'
import { ConveyType, ConveyTypeAxes, fontVariationSettings } from '../tokens/type.js'

/**
 * The framework's automatic-composition primitive — Part XI of the Conveyance Manifesto,
 * "The Design Block" (`docs/CONVEYANCE-FRAMEWORK.md` in `HereLiesAz/Conveyance`). The web port
 * of convey's `ConveyDesign`.
 *
 * `<convey-design>` is a container of lines, each carrying a semantic level (`title`/`header1`/
 * `header2`/`header3`/`body`, analogous to an HTML heading level) and an alignment.
 * {@link ConveyDesignSolver} adjusts size, weight, condensation, and tracking across the block
 * so its silhouette reads as an intentionally balanced — not necessarily symmetric —
 * composition: a freestanding line takes its nominal, modular-scale size (hierarchy-balance
 * mode, §11.4); a line that inherits a column carved by an earlier line's natural width resizes
 * to fill it (column-fill mode); a line whose inherited column is too narrow to hold it
 * reasonably mirrors the earlier line's whole shape to the opposite edge instead of forcing an
 * unreadable fit (the mirror-fallback rule, §11.6).
 *
 * {@link ConveyDesignSolver.solvePage} promotes the same rules one level, §11.7: multiple
 * blocks on one page relate to each other the way lines within one block do (a block that
 * doesn't span the full width becomes the measure the next block balances against; a shorter
 * block's height pulls toward the accumulated height of the blocks before it), reusing the
 * exact same column-targeting and mirror-fallback logic rather than a separate mechanism.
 * `<convey-design-page>` is its element.
 *
 * **Implementation status:** {@link ConveyDesignSolver} is pure, dependency-free math, exercised
 * directly by `test/design.test.ts` — it does not depend on the custom elements below. They take
 * the available width as an explicit `fullWidthSp` property (in the same approximate
 * "advance-width units" the solver uses) rather than measuring the actual rendered width of
 * content — real glyph metrics via `Canvas2D`'s `measureText` (or a `ResizeObserver` against
 * real DOM layout) are documented future work, not yet done here. Condensation and weight now
 * render through real Azrienoch variable-font axes (`wdth`/`wght`, via `fontVariationSettings`
 * from `tokens/type.ts`) rather than a `transform: scaleX()` approximation.
 *
 * **Motion (§4.2 of the manifesto):** every line defaults to `'none'` — static, solved layout
 * only. A line may opt into `'kinetic'` (per-glyph, via `<convey-kinetic-text>`) or `'sentence'`
 * (per-word, verb-driven, via `<convey-kinetic-sentence>`) — this element never picks a motion
 * for a line on its own. Both are registered by the separate `@hereliesaz/convey-web/kinetic`
 * entry point (opt-in, since its WordNet/VerbNet data is large); if that entry point has not
 * been loaded, a line requesting motion degrades to plain static text rather than throwing —
 * `<convey-kinetic-text>`/`<convey-kinetic-sentence>` are created via `document.createElement`
 * here (never statically imported) so this component never pulls the kinetic bundle in on its
 * own, the same pattern `<convey-svo-scene>` already uses for its own `<convey-kinetic-sentence>`
 * fallback. A line with `isAct` set ignores `motion` and always renders through
 * `<convey-act-text>` (`decoration.ts`) instead — the persistent Decoration channel plus a
 * one-time Tell burst, per §4.2 ("text as an Act").
 *
 * ```html
 * <convey-design></convey-design>
 * <script>
 *   const el = document.querySelector('convey-design')
 *   el.fullWidthSp = 400
 *   el.lines = [
 *     { text: 'Co', level: 'header1', alignment: 'left' },
 *     { text: 'A modest location name', level: 'body', alignment: 'left', motion: 'sentence' },
 *   ]
 * </script>
 * ```
 */
export type ConveyDesignLevel = 'title' | 'header1' | 'header2' | 'header3' | 'body'
export type ConveyDesignAlignment = 'left' | 'right' | 'center' | 'justify'
export type ConveyDesignMotion = 'none' | 'kinetic' | 'sentence'

export interface ConveyDesignColumn {
  start: number
  end: number
}

export function columnWidth(column: ConveyDesignColumn): number {
  return Math.max(0, column.end - column.start)
}

export interface ConveyDesignLine {
  text: string
  level?: ConveyDesignLevel
  alignment?: ConveyDesignAlignment
  /** Rule 1 of the column-targeting tree (§11.5): an explicit column always wins. */
  explicitColumn?: ConveyDesignColumn
  /** See the file doc comment's "Motion" section. Defaults to `'none'`. Ignored when `isAct` is set. */
  motion?: ConveyDesignMotion
  /** §4.2: this line is itself an Act, not merely descriptive text. Renders via `<convey-act-text>`. */
  isAct?: boolean
  /** Fired on `convey-click` when `isAct` is set. */
  onClick?: () => void
}

export interface ConveyDesignAxes {
  fontSizeSp: number
  weight: number
  /** Percent; 100 = normal width, below 100 = condensed. */
  condensation: number
  trackingSp: number
}

export interface ConveyDesignSolvedLine {
  line: ConveyDesignLine
  axes: ConveyDesignAxes
  naturalWidth: number
  column: ConveyDesignColumn
  /** True when the mirror-fallback rule (§11.6) fired for this line. */
  mirrored: boolean
}

const LEVEL_STEP: Record<ConveyDesignLevel, number> = {
  body: 0,
  header3: 1,
  header2: 2,
  header1: 3,
  title: 4,
}

const LEVEL_WEIGHT: Record<ConveyDesignLevel, number> = {
  body: 400,
  header3: 550,
  header2: 600,
  header1: 650,
  title: 700,
}

const SPACE_ADVANCE = 0.28
const AVG_ADVANCE = 0.52

function advanceUnits(text: string): number {
  let sum = 0
  for (const ch of text) sum += ch === ' ' ? SPACE_ADVANCE : AVG_ADVANCE
  return sum
}

interface ConveyDesignSolverApi {
  readonly DEFAULT_RATIO: number
  readonly DEFAULT_BASE_SIZE_SP: number
  readonly MIN_REASONABLE_SIZE_SP: number
  readonly MIN_CONDENSATION: number
  nominalSize(level: ConveyDesignLevel, baseSizeSp?: number, ratio?: number): number
  nominalWeight(level: ConveyDesignLevel): number
  inkScore(text: string, fontSizeSp: number, weight: number): number
  naturalWidth(text: string, fontSizeSp: number, condensation?: number, trackingSp?: number): number
  solveToWidth(
    text: string,
    nominal: ConveyDesignAxes,
    targetWidth: number,
    opts?: { minSizeSp?: number; maxSizeSp?: number; minCondensation?: number; maxCondensation?: number; maxTrackingSp?: number },
  ): ConveyDesignAxes | null
  solveBlock(lines: ConveyDesignLine[], fullWidth: number, baseSizeSp?: number, ratio?: number): ConveyDesignSolvedLine[]
  solvePage(blocks: ConveyDesignLine[][], fullWidth: number, baseSizeSp?: number, ratio?: number): ConveyDesignSolvedLine[][]
}

/** Pure, dependency-free solver math for §11.2–§11.7 of the Design Block spec. */
export const ConveyDesignSolver: ConveyDesignSolverApi = {
  /** A perfect fourth — Bringhurst's modular scale (§11.2), the default hierarchy ratio. */
  DEFAULT_RATIO: 1.333,
  DEFAULT_BASE_SIZE_SP: 16,
  MIN_REASONABLE_SIZE_SP: 9,
  /** Azrienoch's real published `wdth` floor (`ConveyTypeAxes.Width.min`) — condensation cannot go narrower than the font actually supports. */
  MIN_CONDENSATION: ConveyTypeAxes.Width.min,

  /** `base × ratio^n` — one constant produces the whole scale (§11.2). */
  nominalSize(level: ConveyDesignLevel, baseSizeSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP, ratio = ConveyDesignSolver.DEFAULT_RATIO): number {
    return baseSizeSp * ratio ** LEVEL_STEP[level]
  },

  /** Nominal weight per level. Monotonic with level ordering, per §11.2. */
  nominalWeight(level: ConveyDesignLevel): number {
    return LEVEL_WEIGHT[level]
  },

  /** §11.3: `Σ advanceWidth(char) × fontSize² × strokeWeightFactor(weight)`. A ratio tool, not a literal ink-coverage measurement. */
  inkScore(text: string, fontSizeSp: number, weight: number): number {
    const strokeWeightFactor = weight / 400
    return advanceUnits(text) * fontSizeSp * fontSizeSp * strokeWeightFactor
  },

  /**
   * A line's rendered width at the given axes. Weight does not appear here: in this model,
   * weight changes a glyph's ink (stroke mass, §11.3) but not its advance width, so the
   * column-fill solve below skips straight from size to condensation.
   */
  naturalWidth(text: string, fontSizeSp: number, condensation = 100, trackingSp = 0): number {
    const base = advanceUnits(text) * fontSizeSp * (condensation / 100)
    const gaps = Math.max(0, text.length - 1)
    return base + trackingSp * gaps
  },

  /**
   * Solves one line toward `targetWidth` (column-fill mode, §11.4), walking size →
   * condensation → tracking (weight is skipped — see `naturalWidth`'s doc). Returns `null` when
   * even the most extreme settings on every lever cannot reasonably reach the target; the
   * caller applies the mirror-fallback rule (§11.6) in that case.
   */
  solveToWidth(
    text: string,
    nominal: ConveyDesignAxes,
    targetWidth: number,
    opts: { minSizeSp?: number; maxSizeSp?: number; minCondensation?: number; maxCondensation?: number; maxTrackingSp?: number } = {},
  ): ConveyDesignAxes | null {
    const minSizeSp = opts.minSizeSp ?? ConveyDesignSolver.MIN_REASONABLE_SIZE_SP
    const maxSizeSp = opts.maxSizeSp ?? nominal.fontSizeSp * 1.5
    const minCondensation = opts.minCondensation ?? ConveyDesignSolver.MIN_CONDENSATION
    const maxCondensation = opts.maxCondensation ?? 100
    const maxTrackingSp = opts.maxTrackingSp ?? 2
    const weight = nominal.weight

    const size = bisectForTarget(minSizeSp, maxSizeSp, targetWidth, (s) =>
      ConveyDesignSolver.naturalWidth(text, s, nominal.condensation, nominal.trackingSp),
    )
    let width = ConveyDesignSolver.naturalWidth(text, size, nominal.condensation, nominal.trackingSp)
    if (closeEnough(width, targetWidth)) return { fontSizeSp: size, weight, condensation: nominal.condensation, trackingSp: nominal.trackingSp }

    const condensation = bisectForTarget(minCondensation, maxCondensation, targetWidth, (c) =>
      ConveyDesignSolver.naturalWidth(text, size, c, nominal.trackingSp),
    )
    width = ConveyDesignSolver.naturalWidth(text, size, condensation, nominal.trackingSp)
    if (closeEnough(width, targetWidth)) return { fontSizeSp: size, weight, condensation, trackingSp: nominal.trackingSp }

    const remaining = targetWidth - width
    const gaps = Math.max(1, text.length - 1)
    const tracking = clamp(nominal.trackingSp + remaining / gaps, -maxTrackingSp, maxTrackingSp)
    width = ConveyDesignSolver.naturalWidth(text, size, condensation, tracking)

    return closeEnough(width, targetWidth, 0.12) ? { fontSizeSp: size, weight, condensation, trackingSp: tracking } : null
  },

  /**
   * Solves an entire block: the first line is the defining line (hierarchy-balance mode,
   * nominal axes, carves the column grid from its own natural width + alignment); every other
   * line without its own `explicitColumn` inherits a target column from it (§11.5) and either
   * fills it (column-fill mode) or, if too narrow even at every lever's extreme, mirrors the
   * defining line's whole shape to the opposite edge (§11.6).
   */
  solveBlock(
    lines: ConveyDesignLine[],
    fullWidth: number,
    baseSizeSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP,
    ratio = ConveyDesignSolver.DEFAULT_RATIO,
  ): ConveyDesignSolvedLine[] {
    if (lines.length === 0) return []

    const nominals = lines.map((line) => ({
      fontSizeSp: ConveyDesignSolver.nominalSize(line.level ?? 'body', baseSizeSp, ratio),
      weight: ConveyDesignSolver.nominalWeight(line.level ?? 'body'),
      condensation: 100,
      trackingSp: 0,
    }))
    const naturalWidths = lines.map((line, i) => ConveyDesignSolver.naturalWidth(line.text, nominals[i]!.fontSizeSp))

    const definingLine = lines[0]!
    const definingWidth = naturalWidths[0]!
    const definingNominal = nominals[0]!
    const definingColumn = carveDefiningColumn(definingLine, definingWidth, fullWidth)
    const mirroredDefiningColumn: ConveyDesignColumn = { start: fullWidth - definingColumn.end, end: fullWidth - definingColumn.start }

    const solved: ConveyDesignSolvedLine[] = [
      { line: definingLine, axes: definingNominal, naturalWidth: definingWidth, column: definingColumn, mirrored: false },
    ]

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!
      const nominal = nominals[i]!
      const naturalW = naturalWidths[i]!
      const target = line.explicitColumn ?? targetColumnFor(definingLine, definingColumn, fullWidth)

      if (target === null) {
        solved.push({ line, axes: nominal, naturalWidth: naturalW, column: { start: 0, end: fullWidth }, mirrored: false })
        continue
      }

      const obviouslyTooNarrow = columnWidth(target) < naturalW * (ConveyDesignSolver.MIN_REASONABLE_SIZE_SP / nominal.fontSizeSp)
      if (obviouslyTooNarrow) {
        solved.push({ line, axes: definingNominal, naturalWidth: definingWidth, column: mirroredDefiningColumn, mirrored: true })
        continue
      }

      const fit = ConveyDesignSolver.solveToWidth(line.text, nominal, columnWidth(target))
      if (fit === null) {
        solved.push({ line, axes: definingNominal, naturalWidth: definingWidth, column: mirroredDefiningColumn, mirrored: true })
      } else {
        solved.push({
          line,
          axes: fit,
          naturalWidth: ConveyDesignSolver.naturalWidth(line.text, fit.fontSizeSp, fit.condensation, fit.trackingSp),
          column: target,
          mirrored: false,
        })
      }
    }

    return solved
  },

  /**
   * §11.7: cross-block (page-level) propagation, promoted one level from §11.5/§11.6 rather
   * than a separate mechanism — blocks share the same full-width coordinate space lines within
   * one block do, so `targetColumnFor` and the mirror-fallback rule apply unchanged, one level
   * up. Each block after the first relates to the *accumulated* shape of every block before it
   * (running max right edge, running total height), not just the immediately preceding block
   * alone — the working model for "the balancing is spread out" across three or more blocks,
   * while column-targeting itself anchors off the nearest (most recent) block, since that is
   * what §11.5's tree was already built to read.
   */
  solvePage(
    blocks: ConveyDesignLine[][],
    fullWidth: number,
    baseSizeSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP,
    ratio = ConveyDesignSolver.DEFAULT_RATIO,
  ): ConveyDesignSolvedLine[][] {
    if (blocks.length === 0) return []

    const solvedBlocks: ConveyDesignSolvedLine[][] = []
    let referenceBlock = ConveyDesignSolver.solveBlock(blocks[0]!, fullWidth, baseSizeSp, ratio)
    solvedBlocks.push(referenceBlock)
    let accumulatedRightEdge = Math.max(...referenceBlock.map((l) => l.column.end))
    let accumulatedHeight = referenceBlock.reduce((sum, l) => sum + l.axes.fontSizeSp, 0)

    for (let i = 1; i < blocks.length; i++) {
      const blockLines = blocks[i]!
      const spansFull = accumulatedRightEdge >= fullWidth * 0.999

      let solved: ConveyDesignSolvedLine[]
      if (spansFull) {
        solved = ConveyDesignSolver.solveBlock(blockLines, fullWidth, baseSizeSp, ratio)
      } else {
        const anchorLine = referenceBlock[0]!.line
        const anchorColumn = referenceBlock[0]!.column
        const target = targetColumnFor(anchorLine, anchorColumn, fullWidth)
        const tooNarrow = target === null || columnWidth(target) < fullWidth * 0.15

        if (tooNarrow) {
          const bounds = boundingColumn(referenceBlock)
          const mirroredColumn: ConveyDesignColumn = { start: fullWidth - bounds.end, end: fullWidth - bounds.start }
          solved = solveBlockWithinColumn(blockLines, mirroredColumn, baseSizeSp, ratio).map((l) => ({ ...l, mirrored: true }))
        } else {
          solved = solveBlockWithinColumn(blockLines, target!, baseSizeSp, ratio)
        }
      }

      // Height-balancing: a block with fewer lines than its reference scales its lines' sizes
      // so its own total height approaches (never forced exactly to) the accumulated height so
      // far -- the same hierarchy-pull idea used within a block, one level up.
      if (blockLines.length < referenceBlock.length) {
        const ownHeight = solved.reduce((sum, l) => sum + l.axes.fontSizeSp, 0)
        const targetHeight = accumulatedHeight / solvedBlocks.length
        if (ownHeight > 0) {
          const scale = clamp(targetHeight / ownHeight, 0.6, 1.8)
          solved = solved.map((l) => ({ ...l, axes: { ...l.axes, fontSizeSp: l.axes.fontSizeSp * scale } }))
        }
      }

      solvedBlocks.push(solved)
      accumulatedRightEdge = Math.max(accumulatedRightEdge, ...solved.map((l) => l.column.end))
      accumulatedHeight += solved.reduce((sum, l) => sum + l.axes.fontSizeSp, 0)
      referenceBlock = solved
    }

    return solvedBlocks
  },
}

/** Solves `lines` against `column`'s own width, then offsets every result back into `column`'s absolute position — the block-level counterpart of a line filling an inherited column. */
function solveBlockWithinColumn(lines: ConveyDesignLine[], column: ConveyDesignColumn, baseSizeSp: number, ratio: number): ConveyDesignSolvedLine[] {
  const relative = ConveyDesignSolver.solveBlock(lines, columnWidth(column), baseSizeSp, ratio)
  return relative.map((l) => ({ ...l, column: { start: column.start + l.column.start, end: column.start + l.column.end } }))
}

/** The smallest column spanning every line's own column in `block` — that block's "whole shape," for the mirror-fallback rule promoted to block level. */
function boundingColumn(block: ConveyDesignSolvedLine[]): ConveyDesignColumn {
  return { start: Math.min(...block.map((l) => l.column.start)), end: Math.max(...block.map((l) => l.column.end)) }
}

function bisectForTarget(lo: number, hi: number, target: number, widthOf: (v: number) => number): number {
  let low = lo
  let high = hi
  const ascending = widthOf(hi) >= widthOf(lo)
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2
    const tooNarrow = ascending ? widthOf(mid) < target : widthOf(mid) > target
    if (tooNarrow) low = mid
    else high = mid
  }
  return (low + high) / 2
}

function closeEnough(width: number, target: number, toleranceRatio = 0.04): boolean {
  return Math.abs(width - target) <= target * toleranceRatio
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function carveDefiningColumn(line: ConveyDesignLine, naturalWidth: number, fullWidth: number): ConveyDesignColumn {
  switch (line.alignment ?? 'left') {
    case 'justify':
      return { start: 0, end: fullWidth }
    case 'right': {
      const w = Math.min(naturalWidth, fullWidth)
      return { start: fullWidth - w, end: fullWidth }
    }
    case 'center': {
      const margin = Math.max(0, (fullWidth - naturalWidth) / 2)
      return { start: margin, end: fullWidth - margin }
    }
    case 'left':
    default:
      return { start: 0, end: Math.min(naturalWidth, fullWidth) }
  }
}

/** The column-targeting decision tree, §11.5, rules 2–4 (rule 1 — explicit override — is handled by the caller). */
function targetColumnFor(definingLine: ConveyDesignLine, definingColumn: ConveyDesignColumn, fullWidth: number): ConveyDesignColumn | null {
  switch (definingLine.alignment ?? 'left') {
    case 'justify':
      return { start: 0, end: fullWidth }
    case 'right':
      return { start: 0, end: definingColumn.start }
    case 'center': {
      const leftSlot = definingColumn.start
      const rightSlot = fullWidth - definingColumn.end
      return leftSlot <= 0 && rightSlot <= 0 ? null : { start: 0, end: fullWidth }
    }
    case 'left':
    default:
      return { start: definingColumn.end, end: fullWidth }
  }
}

const BOX_ALIGN: Record<ConveyDesignAlignment, string> = {
  left: 'flex-start',
  right: 'flex-end',
  center: 'center',
  justify: 'flex-start',
}

/**
 * `<convey-design>` — renders a solved block. See the file doc comment above for what
 * `fullWidthSp` means today and what it should become once real glyph-metric measurement is
 * wired in.
 */
export class ConveyDesignElement extends HTMLElement {
  #shadow: ShadowRoot
  #container: HTMLElement
  #lines: ConveyDesignLine[] = []
  #fullWidthSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP * 20
  #baseSizeSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP
  #ratio = ConveyDesignSolver.DEFAULT_RATIO
  #color: string = ConveyColor.OnSurface

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .block { display: flex; flex-direction: column; width: 100%; }
        .row { display: flex; width: 100%; }
      </style>
      <div class="block" part="block"></div>
    `
    this.#container = this.#shadow.querySelector('.block')!
  }

  connectedCallback(): void {
    this.#render()
  }

  get lines(): ConveyDesignLine[] {
    return this.#lines
  }
  set lines(value: ConveyDesignLine[]) {
    this.#lines = value
    if (this.isConnected) this.#render()
  }

  get fullWidthSp(): number {
    return this.#fullWidthSp
  }
  set fullWidthSp(value: number) {
    this.#fullWidthSp = value
    if (this.isConnected) this.#render()
  }

  get baseSizeSp(): number {
    return this.#baseSizeSp
  }
  set baseSizeSp(value: number) {
    this.#baseSizeSp = value
    if (this.isConnected) this.#render()
  }

  get ratio(): number {
    return this.#ratio
  }
  set ratio(value: number) {
    this.#ratio = value
    if (this.isConnected) this.#render()
  }

  get color(): string {
    return this.#color
  }
  set color(value: string) {
    this.#color = value
    if (this.isConnected) this.#render()
  }

  #render(): void {
    const solved = ConveyDesignSolver.solveBlock(this.#lines, this.#fullWidthSp, this.#baseSizeSp, this.#ratio)
    this.#container.innerHTML = ''
    for (const solvedLine of solved) this.#container.appendChild(createSolvedLineRow(solvedLine, this.#color))
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-design')) {
  customElements.define('convey-design', ConveyDesignElement)
}

/** Builds one solved line's `.row` wrapper + text element — shared by `<convey-design>` and `<convey-design-page>`. */
function createSolvedLineRow(solvedLine: ConveyDesignSolvedLine, color: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'row'
  row.style.display = 'flex'
  row.style.width = '100%'
  row.style.justifyContent = BOX_ALIGN[solvedLine.line.alignment ?? 'left']
  row.appendChild(createSolvedLineTextElement(solvedLine, color))
  return row
}

function createSolvedLineTextElement(solvedLine: ConveyDesignSolvedLine, color: string): HTMLElement {
  let el: HTMLElement

  if (solvedLine.line.isAct) {
    const isRegistered = typeof customElements !== 'undefined' && customElements.get('convey-act-text') !== undefined
    el = isRegistered ? document.createElement('convey-act-text') : document.createElement('span')
    if (isRegistered) {
      el.setAttribute('text', solvedLine.line.text)
    } else {
      el.textContent = solvedLine.line.text
      el.style.textDecoration = 'underline'
      el.style.cursor = 'pointer'
    }
    const onClick = solvedLine.line.onClick
    if (onClick) el.addEventListener('convey-click', () => onClick())
  } else {
    const motion = solvedLine.line.motion ?? 'none'
    const tagName = motion === 'kinetic' ? 'convey-kinetic-text' : motion === 'sentence' ? 'convey-kinetic-sentence' : null

    // The kinetic entry point is opt-in and never statically imported here (see the file doc
    // comment) -- a motion request degrades to plain text if that entry point hasn't been
    // loaded, rather than throwing or silently importing a large, separate bundle.
    const isRegistered = tagName !== null && typeof customElements !== 'undefined' && customElements.get(tagName) !== undefined
    el = isRegistered ? document.createElement(tagName as string) : document.createElement('span')
    if (isRegistered) {
      el.setAttribute('text', solvedLine.line.text)
    } else {
      el.textContent = solvedLine.line.text
    }
  }

  el.style.color = color
  el.style.fontSize = `${solvedLine.axes.fontSizeSp}px`
  el.style.fontFamily = `'${ConveyType.FontFamily}'`
  ;(el.style as CSSStyleDeclaration & { fontVariationSettings: string }).fontVariationSettings = fontVariationSettings({
    Weight: solvedLine.axes.weight,
    Width: solvedLine.axes.condensation,
  })
  el.style.letterSpacing = `${solvedLine.axes.trackingSp}px`
  return el
}

/**
 * `<convey-design-page>` — renders multiple `<convey-design>`-style blocks as one page/screen,
 * solved together per §11.7 (see {@link ConveyDesignSolver.solvePage}). `blocks` is a JS
 * property (an array of line arrays), the same reason `lines` is on `<convey-design>`.
 */
export class ConveyDesignPageElement extends HTMLElement {
  #shadow: ShadowRoot
  #container: HTMLElement
  #blocks: ConveyDesignLine[][] = []
  #fullWidthSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP * 20
  #baseSizeSp = ConveyDesignSolver.DEFAULT_BASE_SIZE_SP
  #ratio = ConveyDesignSolver.DEFAULT_RATIO
  #color: string = ConveyColor.OnSurface
  #blockSpacingPx = 24

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: block; }
        .page { display: flex; flex-direction: column; width: 100%; }
        .block { display: flex; flex-direction: column; width: 100%; }
      </style>
      <div class="page" part="page"></div>
    `
    this.#container = this.#shadow.querySelector('.page')!
  }

  connectedCallback(): void {
    this.#render()
  }

  get blocks(): ConveyDesignLine[][] {
    return this.#blocks
  }
  set blocks(value: ConveyDesignLine[][]) {
    this.#blocks = value
    if (this.isConnected) this.#render()
  }

  get fullWidthSp(): number {
    return this.#fullWidthSp
  }
  set fullWidthSp(value: number) {
    this.#fullWidthSp = value
    if (this.isConnected) this.#render()
  }

  get baseSizeSp(): number {
    return this.#baseSizeSp
  }
  set baseSizeSp(value: number) {
    this.#baseSizeSp = value
    if (this.isConnected) this.#render()
  }

  get ratio(): number {
    return this.#ratio
  }
  set ratio(value: number) {
    this.#ratio = value
    if (this.isConnected) this.#render()
  }

  get color(): string {
    return this.#color
  }
  set color(value: string) {
    this.#color = value
    if (this.isConnected) this.#render()
  }

  get blockSpacingPx(): number {
    return this.#blockSpacingPx
  }
  set blockSpacingPx(value: number) {
    this.#blockSpacingPx = value
    if (this.isConnected) this.#render()
  }

  #render(): void {
    const solvedBlocks = ConveyDesignSolver.solvePage(this.#blocks, this.#fullWidthSp, this.#baseSizeSp, this.#ratio)
    this.#container.innerHTML = ''

    solvedBlocks.forEach((solvedBlock, i) => {
      const blockEl = document.createElement('div')
      blockEl.className = 'block'
      if (i > 0) blockEl.style.marginTop = `${this.#blockSpacingPx}px`
      for (const solvedLine of solvedBlock) blockEl.appendChild(createSolvedLineRow(solvedLine, this.#color))
      this.#container.appendChild(blockEl)
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-design-page')) {
  customElements.define('convey-design-page', ConveyDesignPageElement)
}
