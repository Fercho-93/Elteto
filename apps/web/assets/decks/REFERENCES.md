# Elteto card references

`fournier-spanish.jpg` and `elteto-backs.jpg` are the original images supplied by
Fer for Elteto on 11 October 2026. They are preserved without pixel edits.

`fournier/<rank><suit>.webp` holds each of the 40 Spanish faces of the first
photograph, rotated upright and trimmed to the card edge by
`scripts/extract-spanish-faces.py` (the photographed cards sit slightly askew,
so fixed rectangular windows cut part of some faces). `card-art.js` maps suit and
rank explicitly to these files and paints them as `<img>`, which the redraw pool
in `card-paint.js` keeps decoded. Eight and nine are absent from the reference and retain the
existing artwork for games using a 48-card Spanish deck. French fronts retain
their existing artwork.

`card-art.css` displays the red and blue dorsal windows from the second image.
Red identifies Spanish decks; blue identifies French/poker decks. Face-down
cards never contain concealed rank or suit information. Stock badges use public
remaining-card counts, including the live Mus stock after discards.
