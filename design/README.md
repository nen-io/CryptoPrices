# CryptoPrices money-art study — disposable

**Question:** how can an everyday portfolio tracker use the actual history of money
as a meaningful visual language while keeping balances, sources, and actions clear?

This is a throwaway design study. It is separate from the working desktop app and
must not be promoted directly into production. A visual direction still needs user
selection; previous selections were subsequently rejected.

Run `npm run design`, then open
[the combined study](http://127.0.0.1:4381/prototype.html?variant=D).
The equivalent command is:

```sh
python3 -m http.server 4381 --bind 127.0.0.1 --directory design
```

The user requested a design combining B and C. **D · The Collector** is the new
combined study at `?variant=D`; it remains a proposal for review, not an approved
production direction. A, B, and C are preserved. The bottom arrows and keyboard
arrows switch among the four studies, and each has a direct `?variant=` link.

| Variant | Direction | Structure and meaningful artwork |
| --- | --- | --- |
| A · The Folio | An archival private ledger | Horizontal navigation; a historical banknote design frames the portfolio summary; a separate market-context instrument and lower holdings ledger retain clear financial hierarchy. |
| B · The Exchange | A painting beside the working account | A dedicated art wall presents a goldsmith weighing an object among coins and weights; the adjacent workspace prioritizes the portfolio total, holdings, allocation, and controls. |
| C · Specimen | A numismatic catalogue | A compact horizontal application shell; current portfolio information sits beside an actual ancient coin specimen; holdings and allocation occupy distinct lower columns. |
| D · The Collector | B and C combined | C’s compact horizontal CP catalogue header, large balance, numbered statistics, and clear holdings/allocation grid are paired with B’s deep olive goldsmith painting in a vertical editorial panel. Its rotating money-history panel presents 60 museum works with individual dates, historical captions and credits. |

A, B, and C remain distinct layout alternatives. D combines the requested parts of B and C. The artwork concerns
currency, valuation, weighing, or the recording of value. It does not represent
assets owned by the user or evidence about current markets.

All financial values, balances, movements, chart points, and abbreviated example
addresses are illustrative. The study uses memory-only state and clears on reload.
It does not contact a market or wallet provider. Images are bundled locally; museum
and policy links open only when explicitly followed. Public-address entry illustrates
a watch-only flow, with disclosure that a real sync shares the address and IP with
its named provider.

The three layouts were visually checked at a 1440-pixel desktop width and a
390-pixel narrow width. Navigation, market search, in-memory address entry,
offline preview, reduced motion, and keyboard access to museum links were checked
in the browser. **Add holding currently displays a prototype notice**;
this study does not implement manual positions or registration. The desktop app
has those flows separately; their final visual treatment follows design selection.

## Artwork and rights

**D now includes [Money through time](history/README.md): a rotating collection of
60 verified museum works**, spanning approximately 600 BCE to 1902. It combines
B's painting palette with C's catalogue structure and clear portfolio ledger.
The art panel includes history captions, full credits, pause/play, previous/next,
era selection and a browsable index. Each full cycle lasts about 25 minutes.

The image selection has item-level rights evidence and owning-museum provenance.
The small **Artwork info** control opens the title, artist, date, institution, rights,
context, and links to the museum record and open-access policy. Originals are
retained in `artwork/`; CSS display cropping does not replace the originals.

- **A:** Robert William Hume, *Design for Banknote*, 1830–1904. The Metropolitan
  Museum of Art, Bequest of Jessie F. Hume, 1930. Public Domain / CC0.
  [Museum object 391742](https://www.metmuseum.org/art/collection/search/391742).
- **B and D:** Petrus Christus, *A Goldsmith in his Shop*, 1449. The Metropolitan Museum
  of Art, Robert Lehman Collection, 1975. Public Domain / CC0.
  [Museum object 459052](https://www.metmuseum.org/art/collection/search/459052).
- **C and D:** *Coin*, India, Mathura, Kushan period, c. 106–149 CE. Cleveland Museum
  of Art, Anonymous Gift, 1999.227. CC0.
  [Museum object 1999.227](https://www.clevelandart.org/art/1999.227).

Verification records, exact image URLs, metadata, and original files are preserved
in [sources-market.md](artwork/sources-market.md) and
[sources-goldsmith.md](artwork/sources-goldsmith.md). Additional verified artwork
candidates and rights are recorded in
[MONEY-ART-SOURCES.md](artwork/MONEY-ART-SOURCES.md). Museum endorsement is neither
stated nor implied.

## Prior studies

`observatory-first-pass.html` preserves the first Observatory / Afterhours / Atlas
study. `gallery-sculpture-second-pass.html` preserves Tidal / Nocturne / Chromatic.
The `preview-tidal.png`, `preview-nocturne.png`, and `preview-chromatic.png` images
belong to that rejected second study; they are not previews of the money-art designs.

This isolated HTML study was chosen because the original 2018 Vue 2 route could not
host a replacement desktop shell without first rebuilding its discontinued tooling.
Production uses typed Vue components and the guarded desktop bridge independently.
After selection, capture the accepted decision and keep the disposable variants out
of the shipped application.
