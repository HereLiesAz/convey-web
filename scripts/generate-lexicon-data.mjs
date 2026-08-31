#!/usr/bin/env node
// Regenerates src/kinetic/data/verb-data.txt and src/kinetic/data/noun-data.txt from raw
// Princeton WordNet 3.0 + VerbNet 3.3 corpora -- the TypeScript equivalent of convey's own
// (undocumented, not-checked-in) `codegen.py` pipeline. See convey's
// convey/docs/kinetic-text-verb-classification.md and
// convey/docs/"Procedural Animation of Subject-Verb-Object Typography.md" ("Generation
// pipeline" sections) for the algorithm this reproduces -- neither that script nor the raw
// corpora are checked into the Kotlin repo, so this is a from-scratch reconstruction from
// those docs' description plus direct inspection of the WordNet/VerbNet file formats.
//
// Usage:
//   node scripts/generate-lexicon-data.mjs --wordnet <dir> --verbnet <dir>
//
// <dir>/wordnet must contain index.verb, data.verb, verb.exc, index.noun, data.noun,
// noun.exc, index.sense (Princeton WordNet 3.0's own directory layout, unzipped).
// <dir>/verbnet3 must contain the VerbNet 3.3 class XML files (unzipped).
//
// Both corpora are fetchable from the NLTK data mirrors documented in convey's own
// THIRD_PARTY_NOTICES.md:
//   https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip
//   https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/verbnet3.zip

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1]
  }
  if (!out.wordnet || !out.verbnet) {
    console.error('Usage: node generate-lexicon-data.mjs --wordnet <dir> --verbnet <dir>')
    process.exit(1)
  }
  return out
}

// ── WordNet lexicographer-file domain order (verbs) ─────────────────────────────────────
// Matches ConveyVerbClass's declared enum order exactly (Kotlin: Body..Weather, 15 cases) --
// a port MUST preserve this exact order, since ##SYN lines encode domain as an array index.
const VERB_DOMAINS = [
  'Body', 'Change', 'Cognition', 'Communication', 'Competition', 'Consumption', 'Contact',
  'Creation', 'Emotion', 'Motion', 'Perception', 'Possession', 'Social', 'Stative', 'Weather',
]
// WordNet's own verb lexicographer-file numbers (see lexnames) are 29-43 in this exact order.
const VERB_LEXFILE_BASE = 29

// VerbNet-refinement tier, 9 entries (matches ConveyVerbClass's REFINEMENT_BY_CODE order).
const REFINEMENTS = [
  'PurePath', 'MannerAgent', 'SubtleBody', 'StateMetaphor', 'Contact', 'Punctual', 'Scalar',
  'Emotion', 'Perception',
]

const PERSON_OFFSET = '00007846'
const ANIMAL_OFFSET = '00015388'
const NOUN_SUBSTANCE_LEXFILE = 27 // "noun.substance" per lexnames

function readLines(path) {
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim().length > 0)
}

// data.verb / data.noun line format (WordNet database format):
//   synset_offset lex_filenum pos w_cnt word lex_id [word lex_id...] p_cnt [ptr...]
//   [frames_cnt [+ f_num w_num]...] | gloss
// We only need: offset, lex_filenum, the pointer list's '@'/'@i' entries (hypernym, for
// nouns), and the gloss (text after ' | ').
function parseDataLine(line) {
  const barIdx = line.indexOf(' | ')
  const gloss = barIdx >= 0 ? line.slice(barIdx + 3).trim() : ''
  const head = barIdx >= 0 ? line.slice(0, barIdx) : line
  const fields = head.split(/\s+/)
  const offset = fields[0]
  const lexFilenum = Number.parseInt(fields[1], 10)
  const wCnt = Number.parseInt(fields[3], 16)
  let idx = 4 + wCnt * 2
  const pCnt = Number.parseInt(fields[idx], 10)
  idx += 1
  const hypernyms = []
  for (let i = 0; i < pCnt; i++) {
    const symbol = fields[idx]
    const targetOffset = fields[idx + 1]
    if (symbol === '@' || symbol === '@i') hypernyms.push(targetOffset)
    idx += 4
  }
  return { offset, lexFilenum, hypernyms, gloss }
}

// index.verb / index.noun line format:
//   lemma pos synset_cnt p_cnt [ptr_symbol...] sense_cnt tagsense_cnt synset_offset...
function parseIndexLine(line) {
  const fields = line.split(/\s+/)
  const lemma = fields[0].replace(/_/g, ' ')
  const synsetCnt = Number.parseInt(fields[2], 10)
  const pCnt = Number.parseInt(fields[3], 10)
  // fields[4 .. 4+pCnt-1] are pointer symbols, then sense_cnt, tagsense_cnt, then offsets.
  const offsetsStart = 4 + pCnt + 2
  const offsets = fields.slice(offsetsStart, offsetsStart + synsetCnt)
  return { lemma, offsets }
}

function parseExcFile(path) {
  const map = new Map()
  for (const line of readLines(path)) {
    const [inflected, base] = line.split(/\s+/)
    if (inflected && base) map.set(inflected.replace(/_/g, ' '), base.replace(/_/g, ' '))
  }
  return map
}

// index.sense line format: sense_key offset sense_number tag_cnt
// sense_key: lemma%ss_type:lex_filenum:lex_id:head_word:head_id
function buildSenseKeyIndex(wordnetDir) {
  const map = new Map()
  for (const line of readLines(join(wordnetDir, 'index.sense'))) {
    const spaceIdx = line.indexOf(' ')
    const key = line.slice(0, spaceIdx)
    const rest = line.slice(spaceIdx + 1).trim().split(/\s+/)
    map.set(key, rest[0])
  }
  return map
}

// ── VerbNet: minimal recursive-descent XML reader (no DOM dependency) ──────────────────
// We only need <MEMBER wn="..."/> and <PRED value="..."/> across a class and all its
// (nested) <VNSUBCLASS>es -- a tiny regex-based extraction is sufficient and avoids adding
// an XML dependency to this script.
function extractAttrs(xml, tag, attr) {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"`, 'g')
  const out = []
  let m
  while ((m = re.exec(xml))) out.push(m[1])
  return out
}

function classifyRefinement(classId, predValues) {
  // Priority 1: known Levin-chapter class-ID prefixes (exact top-level class file names).
  const idPrefixTable = {
    'escape-51.1': 'PurePath',
    'leave-51.2': 'PurePath',
    'run-51.3.2': 'MannerAgent',
    'waltz-51.5': 'MannerAgent',
    'body_internal_states-40.6': 'SubtleBody',
    'body_internal_motion-49.1': 'SubtleBody',
    'breathe-40.1.2': 'SubtleBody',
    'cooking-45.3': 'StateMetaphor',
    'break-45.1': 'Punctual',
    'calibratable_cos-45.6': 'Scalar',
    'other_cos-45.4': 'Scalar',
  }
  if (idPrefixTable[classId]) return idPrefixTable[classId]

  // Priority 2: predicate-based fallback, in this exact order.
  const preds = new Set(predValues)
  if (preds.has('degradation_material_integrity')) return 'Punctual'
  if (preds.has('emotional_state')) return 'Emotion'
  if (preds.has('perceive')) return 'Perception'
  if (preds.has('contact') && preds.has('exert_force')) return 'Contact'
  return null
}

function loadVerbNetRefinements(verbnetDir, senseKeyIndex) {
  const refinementByOffset = new Map() // offset -> refinement name
  const files = readdirSync(verbnetDir).filter((f) => f.endsWith('.xml'))
  for (const file of files) {
    const xml = readFileSync(join(verbnetDir, file), 'utf8')
    const classId = file.replace(/\.xml$/, '')
    const wnSenseAttrs = extractAttrs(xml, 'MEMBER', 'wn')
    const predValues = extractAttrs(xml, 'PRED', 'value')
    const refinement = classifyRefinement(classId, predValues)
    if (!refinement) continue
    for (const wnField of wnSenseAttrs) {
      if (!wnField) continue
      for (const senseKey of wnField.split(/\s+/)) {
        if (!senseKey) continue
        const fullKey = senseKey.includes('::') ? senseKey : `${senseKey}::`
        const offset = senseKeyIndex.get(fullKey)
        if (offset) refinementByOffset.set(offset, refinement)
      }
    }
  }
  return refinementByOffset
}

// ── Verb data ────────────────────────────────────────────────────────────────────────────
function generateVerbData(wordnetDir, verbnetDir) {
  const synsets = new Map() // offset -> { domainIndex, gloss }
  for (const line of readLines(join(wordnetDir, 'data.verb'))) {
    const { offset, lexFilenum, gloss } = parseDataLine(line)
    const domainIndex = lexFilenum - VERB_LEXFILE_BASE
    if (domainIndex < 0 || domainIndex >= VERB_DOMAINS.length) continue
    synsets.set(offset, { domainIndex, gloss: gloss.replace(/"/g, "'") })
  }

  const lemmas = new Map() // lemma -> [offsets]
  for (const line of readLines(join(wordnetDir, 'index.verb'))) {
    const { lemma, offsets } = parseIndexLine(line)
    lemmas.set(lemma, offsets)
  }

  const exceptions = parseExcFile(join(wordnetDir, 'verb.exc'))

  const senseKeyIndex = buildSenseKeyIndex(wordnetDir)
  const refinementByOffset = loadVerbNetRefinements(verbnetDir, senseKeyIndex)

  const lines = ['##SYN']
  for (const [offset, { domainIndex, gloss }] of synsets) {
    lines.push(`${offset}\t${domainIndex}\t${gloss}`)
  }
  lines.push('##LEM')
  for (const [lemma, offsets] of lemmas) {
    lines.push(`${lemma}\t${offsets.join(',')}`)
  }
  lines.push('##EXC')
  for (const [inflected, base] of exceptions) {
    lines.push(`${inflected}\t${base}`)
  }
  lines.push('##REF')
  for (const [offset, refinement] of refinementByOffset) {
    const code = REFINEMENTS.indexOf(refinement)
    if (code < 0) continue
    lines.push(`${offset}\t${code}`)
  }

  return { blob: lines.join('\n'), synsetCount: synsets.size, lemmaCount: lemmas.size, refCount: refinementByOffset.size }
}

// ── Noun data ────────────────────────────────────────────────────────────────────────────
function generateNounData(wordnetDir) {
  const raw = new Map() // offset -> { lexFilenum, hypernyms, gloss }
  for (const line of readLines(join(wordnetDir, 'data.noun'))) {
    const { offset, lexFilenum, hypernyms, gloss } = parseDataLine(line)
    raw.set(offset, { lexFilenum, hypernyms, gloss: gloss.replace(/"/g, "'") })
  }

  // Animacy: memoized hypernym-chain walk to person.n.01 / animal.n.01, cycle-guarded.
  const animacyCache = new Map()
  function isAnimate(offset, seen = new Set()) {
    if (animacyCache.has(offset)) return animacyCache.get(offset)
    if (offset === PERSON_OFFSET || offset === ANIMAL_OFFSET) {
      animacyCache.set(offset, true)
      return true
    }
    if (seen.has(offset)) return false // cycle guard
    seen.add(offset)
    const entry = raw.get(offset)
    if (!entry) return false
    for (const parent of entry.hypernyms) {
      if (isAnimate(parent, seen)) {
        animacyCache.set(offset, true)
        return true
      }
    }
    animacyCache.set(offset, false)
    return false
  }

  const synsets = new Map() // offset -> { domainIndex, animate, mass, gloss }
  for (const [offset, entry] of raw) {
    const animate = isAnimate(offset)
    const mass = entry.lexFilenum === NOUN_SUBSTANCE_LEXFILE
    synsets.set(offset, { domainIndex: entry.lexFilenum, animate, mass, gloss: entry.gloss })
  }

  const lemmas = new Map()
  for (const line of readLines(join(wordnetDir, 'index.noun'))) {
    const { lemma, offsets } = parseIndexLine(line)
    lemmas.set(lemma, offsets)
  }

  const exceptions = parseExcFile(join(wordnetDir, 'noun.exc'))

  const lines = ['##SYN']
  for (const [offset, { domainIndex, animate, mass, gloss }] of synsets) {
    lines.push(`${offset}\t${domainIndex}\t${animate ? 1 : 0}\t${mass ? 1 : 0}\t${gloss}`)
  }
  lines.push('##LEM')
  for (const [lemma, offsets] of lemmas) {
    lines.push(`${lemma}\t${offsets.join(',')}`)
  }
  lines.push('##EXC')
  for (const [inflected, base] of exceptions) {
    lines.push(`${inflected}\t${base}`)
  }

  return { blob: lines.join('\n'), synsetCount: synsets.size, lemmaCount: lemmas.size }
}

function main() {
  const { wordnet, verbnet } = parseArgs()
  const outDir = new URL('../src/kinetic/data/', import.meta.url).pathname

  console.log('Generating verb data...')
  const verb = generateVerbData(wordnet, verbnet)
  writeFileSync(join(outDir, 'verb-data.txt'), verb.blob, 'utf8')
  console.log(`  ${verb.synsetCount} synsets, ${verb.lemmaCount} lemmas, ${verb.refCount} VerbNet refinements`)
  console.log(`  -> ${(verb.blob.length / 1024).toFixed(0)} KB`)

  console.log('Generating noun data...')
  const noun = generateNounData(wordnet)
  writeFileSync(join(outDir, 'noun-data.txt'), noun.blob, 'utf8')
  console.log(`  ${noun.synsetCount} synsets, ${noun.lemmaCount} lemmas`)
  console.log(`  -> ${(noun.blob.length / 1024 / 1024).toFixed(1)} MB`)
}

main()
