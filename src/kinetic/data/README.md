# Kinetic-typography lexicon data

`verb-data.txt` (~1.5MB) and `noun-data.txt` (~10MB) are generated, plain-text data files —
**do not hand-edit them**. They are the same newline-delimited, tab-separated, `##SECTION`-
marked blob format `convey`'s own `internal/ConveyVerbData.kt`/`internal/ConveyNounData.kt`
use internally (see that repo's `AGENTS.md`), just not chunked into ≤40,000-character string
literals — that constraint is specific to the JVM class file format's per-constant limit and
doesn't apply here, so each file ships as one plain text asset instead.

Regenerate them with:

```
node scripts/generate-lexicon-data.mjs --wordnet <dir> --verbnet <dir>
```

`<dir>` must contain the unzipped raw corpora:
- Princeton WordNet 3.0: `index.verb`, `data.verb`, `verb.exc`, `index.noun`, `data.noun`,
  `noun.exc`, `index.sense` — from
  `https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip`
  (mirrors `https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz`).
- VerbNet 3.3's class XML corpus — from
  `https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/verbnet3.zip`
  (mirrors `https://verbs.colorado.edu/verbnet/`).

See `../../../THIRD_PARTY_NOTICES.md` for both corpora's license terms — this is the
redistribution-sensitive asset in this package.

## Blob format

`##SYN` / `##LEM` / `##EXC` (both files), plus `##REF` (verb data only, VerbNet has no noun
equivalent):

- **verb `##SYN`**: `offset\tdomainIndex\tgloss` — `domainIndex` is 0–14 into
  `Body, Change, Cognition, Communication, Competition, Consumption, Contact, Creation,
  Emotion, Motion, Perception, Possession, Social, Stative, Weather` (WordNet's own verb
  lexicographer-file numbers 29–43, in that order).
- **noun `##SYN`**: `offset\tdomainCode\tanimate(0/1)\tmass(0/1)\tgloss` — `domainCode` is
  WordNet's raw lexicographer-file number, parsed but not read by `noun.ts`'s classification
  logic (kept for format symmetry with the verb pipeline, same as the Kotlin original).
- **`##LEM`**: `lemma\toffset,offset,...` — sense-frequency-ordered (index 0 = primary sense),
  taken directly from `index.verb`/`index.noun`'s own offset ordering.
- **`##EXC`**: `inflected\tbase` — irregular forms from `verb.exc`/`noun.exc`.
- **`##REF`** (verb only): `offset\trefinementCode` — `refinementCode` is 0–8 into
  `PurePath, MannerAgent, SubtleBody, StateMetaphor, Contact, Punctual, Scalar, Emotion,
  Perception`. One entry per WordNet sense a VerbNet class's members resolve to (via
  `index.sense`), never per lemma.

Both index orders **must** match `verb.ts`'s `VERB_DOMAINS`/`REFINEMENT_BY_CODE` arrays and
`generate-lexicon-data.mjs`'s own `VERB_DOMAINS`/`REFINEMENTS` arrays exactly — they're decoded
positionally.

## A note on fidelity to `convey`'s own pipeline

`convey`'s docs (`kinetic-text-verb-classification.md`, `Procedural Animation of Subject-Verb-
Object Typography.md`) describe the algorithm this generator implements in prose, but the
actual Python script that produced `ConveyVerbData.kt`/`ConveyNounData.kt` (`codegen.py`) is
**not checked into that repo** — only its output is. `generate-lexicon-data.mjs` is therefore a
from-scratch reconstruction from that prose description plus direct inspection of the raw
WordNet/VerbNet file formats, not a line-for-line port of the original script.

Verified against the described algorithm and against `convey`'s own documented examples: this
generator's output classifies "breathe"'s plain WordNet domain as `Body` (domain 0) but then
overrides it to `SubtleBody` via the VerbNet `breathe-40.1.2` refinement — exactly the
refinement precedence the docs describe (VerbNet wins over the coarser WordNet domain when
both apply to the same sense). It also resolves VerbNet's `run-51.3`-family class to a
`MannerAgent` refinement on "run"'s primary sense, marks
`person.n.01`/`animal.n.01` (WordNet offsets `00007846`/`00015388`) as animate, and marks
`water`'s primary sense as a `Mass` noun (its lexicographer file is `noun.substance`) — all
matching the Kotlin original's documented behavior. Total synset/lemma counts (13,768 verb
synsets / 11,530 verb lemmas / 1,367 VerbNet refinements; 82,116 noun synsets / 117,799 noun
lemmas) land almost exactly on the noun counts `convey`'s own SVO doc cites ("~118,000 noun
lemmas / ~82,000 synsets"), a strong signal this reconstruction is faithful — but it has not
been diffed synset-by-synset against the real `codegen.py` output, since that script doesn't
exist in this environment to compare against. The VerbNet-refinement priority rule in
particular (known class-ID prefixes, then a `degradation_material_integrity` /
`emotional_state` / `perceive` / `contact`+`exert_force` predicate fallback, in that order) is
reconstructed from the docs' prose description of the rule rather than the original rule
table's exact source; treat any specific verb's refinement classification as a good-faith
approximation of the Kotlin original's, not a guaranteed byte-for-byte match.
