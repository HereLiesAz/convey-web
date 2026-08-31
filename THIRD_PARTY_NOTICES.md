# Third-party data notices

`src/kinetic/data/verb-data.txt` and `src/kinetic/data/noun-data.txt` (generated; see
`src/kinetic/data/README.md` for the pipeline) embed data derived from two external lexical
resources. Both files are bundled only by this package's `./kinetic` entry point
(`@hereliesaz/convey-web/kinetic`), never the default entry.

## Princeton WordNet 3.0

`verb-data.txt` embeds WordNet's verb lemma index, synset domains, and synset glosses
(definition text) in full, as permitted by WordNet's license; `noun-data.txt` embeds the
equivalent noun lemma index, synset domains, and synset glosses in full, under the same
license — reproduced here per that license's own requirement that this notice "appear on ALL
copies of the software, database and documentation, including modifications":

> This software and database is being provided to you, the LICENSEE, by Princeton University
> under the following license. By obtaining, using and/or copying this software and database,
> you agree that you have read, understood, and will comply with these terms and conditions.:
>
> Permission to use, copy, modify and distribute this software and database and its
> documentation for any purpose and without fee or royalty is hereby granted, provided that you
> agree to comply with the following copyright notice and statements, including the disclaimer,
> and that the same appear on ALL copies of the software, database and documentation, including
> modifications that you make for internal use or for distribution.
>
> WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
>
> THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES NO
> REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT LIMITATION,
> PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANTABILITY OR FITNESS FOR
> ANY PARTICULAR PURPOSE OR THAT THE USE OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION
> WILL NOT INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.
>
> The name of Princeton University or Princeton may not be used in advertising or publicity
> pertaining to distribution of the software and/or database. Title to copyright in this
> software, database and any associated documentation shall at all times remain with Princeton
> University and LICENSEE agrees to preserve same.

Source: `https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz`, via the NLTK data mirror at
`https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip`.

## VerbNet 3.3

`verb-data.txt` does **not** embed VerbNet's XML text, examples, or documentation — only a
computed byproduct (a WordNet synset offset → `ConveyVerbClass` refinement code table,
produced by analyzing each class's member sense-keys and `SEMANTICS`/`PRED` predicates at
generation time; see `src/kinetic/data/README.md`). VerbNet itself is used only as a build-time
input, per its listed distribution terms ("Distributed with permission of the author",
Karin Kipper-Schuler).

Source: `https://verbs.colorado.edu/verbnet/`, via the NLTK data mirror at
`https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/verbnet3.zip`.

## Relationship to `convey` (the Compose Multiplatform sibling package)

This data and the classification logic that reads it (`src/kinetic/verb.ts`,
`src/kinetic/noun.ts`) are an independent TypeScript port of the same subsystem in
[`convey`](https://github.com/HereLiesAz/convey)'s `ConveyVerb.kt`/`ConveyNoun.kt` — same
algorithm, regenerated from the same raw corpora, not a copy of convey's compiled Kotlin data
(the Kotlin data is chunked into ≤40,000-character string literals to fit the JVM class file
format's per-constant limit; this package's data has no such constraint and ships as two plain
text assets instead). See `src/kinetic/data/README.md` for the generator and how to reproduce
or update this data.
