# Money through time — 60 local museum slides

A curated art-history companion to **D · The Collector**, the combined B + C
visual study. This is a selection of objects and representations of money,
trade, accounting, taxation and exchange, not a complete economic history.

- **60 distinct objects/images**, from approximately 600 BCE to 1902.
- 20 ancient and early-money objects, 20 later currency objects/designs, and
  20 narrative paintings, prints and trade scenes.
- All selected images have item-specific public-domain or CC0 evidence from
  their owning museum. No generated artwork or unrelated stock imagery.
- The Met, Cleveland Museum of Art, National Gallery of Art and SMK provide the
  source records. Every slide exposes its original record and reuse policy.
- Original catalogue date ranges remain visible; `sortYear` is an approximate
  ordering value, often a midpoint. It is not a more precise historical claim.
- The uncertain identification of *The Tax Collectors* is explicitly retained.

## Interaction

The gallery opens on Petrus Christus's *A Goldsmith in his Shop*, preserving the
painting-led direction of study B within C's catalogue layout. It advances in
chronological order every **25 seconds**, giving a full **25-minute cycle** before
an artwork repeats. Filtering a period reduces the cycle to that period's works.

Pause/play, previous/next, an era selector, a position slider and **Browse 60 works**
provide direct navigation. Selecting an era, using the slider or browsing the index
pauses automatic playback. Artwork details include the full title, maker, date,
medium, museum, accession, caption, reuse status and primary-source links.

Automatic rotation pauses while inspecting the gallery, while a dialog is open,
when the page is hidden or the gallery is off screen, and with reduced motion.
An explicit Play resumes playback. Only the art panel changes; holdings, search,
wallet entries and market charts retain their state.

All data and images are local. No museum/provider call is made during playback.
The image collection is approximately 12 MB; the current image is displayed and
the next image is prefetched. The collection is separate from the production app
until the visual direction is accepted and implemented.

## Provenance and rebuilding

- [Ancient collection](ancient-source-notes.md)
- [Later currency collection](currency-source-notes.md)
- [Narrative artwork collection](scenes-source-notes.md)

The three source JSON files are the curated records. Rebuild the browser data with:

```sh
node scripts/build-history.mjs
```

The builder requires exactly 60 records and validates required metadata, local
asset paths, reuse labels, HTTPS citations, distinct IDs, distinct source records,
and unique image hashes. It produces `slides.json` and `slides.js`.

Verification included local image URL checks for every slide, image inspection,
browser checks of automatic advancement, pause/resume, chronological wrap,
era filtering, the 60-item index, and reduced-motion controls.
