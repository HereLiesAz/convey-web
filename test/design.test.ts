import { describe, expect, it } from 'vitest'
import {
  ConveyDesignSolver,
  columnWidth,
  createDomMeasurer,
  type ConveyDesignAxes,
  type ConveyDesignLine,
  type ConveyDesignMeasure,
} from '../src/components/design.js'

function assertClose(actual: number, expected: number, tolerance = 0.01): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

describe('nominalSize', () => {
  it('is monotonic across levels', () => {
    const body = ConveyDesignSolver.nominalSize('body')
    const h3 = ConveyDesignSolver.nominalSize('header3')
    const h2 = ConveyDesignSolver.nominalSize('header2')
    const h1 = ConveyDesignSolver.nominalSize('header1')
    const title = ConveyDesignSolver.nominalSize('title')
    expect(body).toBeLessThan(h3)
    expect(h3).toBeLessThan(h2)
    expect(h2).toBeLessThan(h1)
    expect(h1).toBeLessThan(title)
  })

  it('falls out of one modular-scale ratio', () => {
    const base = 16
    const ratio = 1.333
    expect(ConveyDesignSolver.nominalSize('body', base, ratio)).toBe(base)
    assertClose(ConveyDesignSolver.nominalSize('header3', base, ratio), base * ratio)
    assertClose(ConveyDesignSolver.nominalSize('title', base, ratio), base * ratio ** 4, 0.05)
  })
})

describe('nominalWeight', () => {
  it('is monotonic across levels', () => {
    expect(ConveyDesignSolver.nominalWeight('body')).toBeLessThan(ConveyDesignSolver.nominalWeight('header3'))
    expect(ConveyDesignSolver.nominalWeight('header1')).toBeLessThan(ConveyDesignSolver.nominalWeight('title'))
  })
})

describe('inkScore', () => {
  it('scales with the square of font size', () => {
    const small = ConveyDesignSolver.inkScore('hello', 10, 400)
    const big = ConveyDesignSolver.inkScore('hello', 20, 400)
    assertClose(big / small, 4)
  })

  it('scales with the stroke weight factor', () => {
    const regular = ConveyDesignSolver.inkScore('hello', 16, 400)
    const bold = ConveyDesignSolver.inkScore('hello', 16, 800)
    assertClose(bold / regular, 2)
  })
})

describe('naturalWidth', () => {
  it('grows linearly with font size', () => {
    const narrow = ConveyDesignSolver.naturalWidth('hello world', 10)
    const wide = ConveyDesignSolver.naturalWidth('hello world', 20)
    assertClose(wide / narrow, 2)
  })

  it('shrinks with condensation', () => {
    const normal = ConveyDesignSolver.naturalWidth('hello world', 16, 100)
    const condensed = ConveyDesignSolver.naturalWidth('hello world', 16, 75)
    expect(condensed).toBeLessThan(normal)
  })
})

describe('solveToWidth', () => {
  it('reaches a close width within lever bounds', () => {
    const nominal: ConveyDesignAxes = { fontSizeSp: 16, weight: 400, condensation: 100, trackingSp: 0 }
    const target = 180
    const fit = ConveyDesignSolver.solveToWidth('a modest headline', nominal, target)
    expect(fit).not.toBeNull()
    const actual = ConveyDesignSolver.naturalWidth('a modest headline', fit!.fontSizeSp, fit!.condensation, fit!.trackingSp)
    expect(Math.abs(actual - target)).toBeLessThanOrEqual(target * 0.12)
  })
})

describe('solveBlock', () => {
  it('renders a single freestanding line at nominal axes', () => {
    const lines: ConveyDesignLine[] = [{ text: 'Only line', level: 'title', alignment: 'left' }]
    const solved = ConveyDesignSolver.solveBlock(lines, 400)

    expect(solved).toHaveLength(1)
    expect(solved[0].axes.fontSizeSp).toBe(ConveyDesignSolver.nominalSize('title'))
    expect(solved[0].mirrored).toBe(false)
  })

  it('has the second line inherit the leftover column from a left-aligned defining line', () => {
    const lines: ConveyDesignLine[] = [
      { text: 'Co', level: 'header1', alignment: 'left' },
      { text: 'A modest location name', level: 'body', alignment: 'left' },
    ]
    const fullWidth = 500
    const solved = ConveyDesignSolver.solveBlock(lines, fullWidth)

    const definingColumn = solved[0].column
    const second = solved[1]
    if (!second.mirrored) {
      assertClose(second.column.start, definingColumn.end)
      assertClose(second.column.end, fullWidth)
    }
  })

  it('triggers the mirror-fallback rule when the leftover column is too narrow', () => {
    const lines: ConveyDesignLine[] = [
      { text: 'A rather long title that spans most of the available width already', level: 'title', alignment: 'left' },
      { text: 'Another full sentence of real content', level: 'body', alignment: 'left' },
    ]
    const fullWidth = 320
    const solved = ConveyDesignSolver.solveBlock(lines, fullWidth)

    const second = solved[1]
    expect(second.mirrored).toBe(true)
    const definingColumn = solved[0].column
    assertClose(second.column.start, fullWidth - definingColumn.end)
    assertClose(second.column.end, fullWidth - definingColumn.start)
  })

  it('makes the next line fill full width too when the defining line is justified', () => {
    const lines: ConveyDesignLine[] = [
      { text: 'A full-width justified headline here', level: 'title', alignment: 'justify' },
      { text: 'Subtitle', level: 'body', alignment: 'left' },
    ]
    const fullWidth = 400
    const solved = ConveyDesignSolver.solveBlock(lines, fullWidth)

    expect(solved[0].column.start).toBe(0)
    expect(solved[0].column.end).toBe(fullWidth)
    if (!solved[1].mirrored) {
      assertClose(solved[1].column.start, 0)
      assertClose(solved[1].column.end, fullWidth)
    }
  })

  it('lets an explicit column override inheritance', () => {
    const explicit = { start: 50, end: 150 }
    const lines: ConveyDesignLine[] = [
      { text: 'Tag', level: 'header1', alignment: 'left' },
      { text: 'Explicit', level: 'body', alignment: 'left', explicitColumn: explicit },
    ]
    const solved = ConveyDesignSolver.solveBlock(lines, 400)

    if (!solved[1].mirrored) {
      expect(solved[1].column).toEqual(explicit)
    }
  })
})

describe('columnWidth', () => {
  it('returns the span between start and end', () => {
    expect(columnWidth({ start: 10, end: 60 })).toBe(50)
  })

  it('never goes negative', () => {
    expect(columnWidth({ start: 60, end: 10 })).toBe(0)
  })
})

describe('solvePage', () => {
  it('makes the second block treat the full screen as its measure when the first block does not span it', () => {
    const fullWidth = 500
    const block1: ConveyDesignLine[] = [{ text: 'Co', level: 'header1', alignment: 'left' }]
    const block2: ConveyDesignLine[] = [{ text: 'A modest location name', level: 'body', alignment: 'left' }]

    const solved = ConveyDesignSolver.solvePage([block1, block2], fullWidth)
    expect(solved).toHaveLength(2)

    const block1RightEdge = Math.max(...solved[0]!.map((l) => l.column.end))
    const secondBlockFirstLine = solved[1]![0]!
    if (!secondBlockFirstLine.mirrored) {
      assertClose(secondBlockFirstLine.column.start, block1RightEdge)
    }
  })

  it('mirrors the whole prior block when the leftover is too narrow', () => {
    // Chosen so block 1's own natural width leaves a real but small (<15% of fullWidth)
    // leftover, triggering the mirror-fallback rather than the ordinary column-fill path.
    const fullWidth = 320
    const block1: ConveyDesignLine[] = [{ text: 'A short line', level: 'title', alignment: 'left' }]
    const block2: ConveyDesignLine[] = [{ text: 'Another full sentence of real content', level: 'body', alignment: 'left' }]

    const solved = ConveyDesignSolver.solvePage([block1, block2], fullWidth)
    expect(solved[1]![0]!.mirrored).toBe(true)
  })

  it('balances a shorter block\'s height toward the prior block\'s height', () => {
    const fullWidth = 400
    const threeLineBlock: ConveyDesignLine[] = [
      { text: 'Tagline here', level: 'header2', alignment: 'justify' },
      { text: 'Company Name', level: 'title', alignment: 'justify' },
      { text: 'Location', level: 'body', alignment: 'justify' },
    ]
    const twoLineBlock: ConveyDesignLine[] = [
      { text: 'Short', level: 'body', alignment: 'justify' },
      { text: 'Two', level: 'body', alignment: 'justify' },
    ]

    const solved = ConveyDesignSolver.solvePage([threeLineBlock, twoLineBlock], fullWidth)
    const threeLineHeight = solved[0]!.reduce((sum, l) => sum + l.axes.fontSizeSp, 0)
    const twoLineHeightUnbalanced = twoLineBlock.reduce((sum, l) => sum + ConveyDesignSolver.nominalSize(l.level ?? 'body'), 0)
    const twoLineHeightBalanced = solved[1]!.reduce((sum, l) => sum + l.axes.fontSizeSp, 0)

    expect(Math.abs(twoLineHeightBalanced - threeLineHeight)).toBeLessThan(Math.abs(twoLineHeightUnbalanced - threeLineHeight))
  })

  it('matches solveBlock on a single block', () => {
    const fullWidth = 400
    const lines: ConveyDesignLine[] = [{ text: 'Only block', level: 'title', alignment: 'left' }]
    const page = ConveyDesignSolver.solvePage([lines], fullWidth)
    const block = ConveyDesignSolver.solveBlock(lines, fullWidth)

    expect(page).toHaveLength(1)
    expect(page[0]).toEqual(block)
  })
})

describe('measure injection', () => {
  // A measure that ignores text/condensation/tracking and returns fontSizeSp verbatim -- chosen
  // so its output is trivially distinguishable from naturalWidth's (which scales with both
  // character count and fontSize together), proving solveToWidth actually used the injected
  // function rather than silently falling back to the default.
  const identityMeasure: ConveyDesignMeasure = (_text, fontSizeSp) => fontSizeSp

  it('solveToWidth uses an injected measure instead of naturalWidth', () => {
    const nominal: ConveyDesignAxes = { fontSizeSp: 16, weight: 400, condensation: 100, trackingSp: 0 }
    const fit = ConveyDesignSolver.solveToWidth('hello world', nominal, 20, { measure: identityMeasure, maxSizeSp: 40 })

    expect(fit).not.toBeNull()
    assertClose(fit!.fontSizeSp, 20, 1)
  })

  it('solveBlock uses an injected measure for column carving and column-fill alike', () => {
    const lines: ConveyDesignLine[] = [
      { text: 'Defining', level: 'header1', alignment: 'left' },
      { text: 'Second line', level: 'body', alignment: 'left' },
    ]
    const fullWidth = 200
    const solved = ConveyDesignSolver.solveBlock(lines, fullWidth, undefined, undefined, identityMeasure)

    // The defining line's column should equal identityMeasure's output (its own nominal
    // fontSize), not naturalWidth's much larger character-scaled estimate.
    const definingNominalSize = ConveyDesignSolver.nominalSize('header1')
    assertClose(solved[0]!.column.end, Math.min(definingNominalSize, fullWidth), 1)
  })

  it('solvePage threads the injected measure through to every block', () => {
    const block1: ConveyDesignLine[] = [{ text: 'Short', level: 'header1', alignment: 'left' }]
    const block2: ConveyDesignLine[] = [{ text: 'Also short', level: 'body', alignment: 'left' }]
    const fullWidth = 200

    const solved = ConveyDesignSolver.solvePage([block1, block2], fullWidth, undefined, undefined, identityMeasure)
    const definingNominalSize = ConveyDesignSolver.nominalSize('header1')
    assertClose(solved[0]![0]!.column.end, Math.min(definingNominalSize, fullWidth), 1)
  })
})

describe('createDomMeasurer', () => {
  it('returns 0 for empty text without touching the DOM', () => {
    const measure = createDomMeasurer()
    expect(measure('', 16)).toBe(0)
  })

  it('falls back to naturalWidth in a layout-less environment (jsdom reports zero-width rects)', () => {
    const measure = createDomMeasurer()
    const fallback = ConveyDesignSolver.naturalWidth('hello world', 16, 100, 0)
    expect(measure('hello world', 16, 100, 0)).toBe(fallback)
  })

  it('reuses one hidden span across calls rather than leaking a new one each time', () => {
    const countHiddenSpans = () => Array.from(document.body.querySelectorAll('span')).filter((el) => el.style.visibility === 'hidden').length
    const before = countHiddenSpans()

    const measure = createDomMeasurer()
    measure('first', 16)
    measure('second', 16)
    measure('third', 16)

    expect(countHiddenSpans() - before).toBe(1)
  })
})
