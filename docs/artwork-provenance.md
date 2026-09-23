# Money through time

The production app includes 60 distinct museum objects and artworks about money,
trade, accounting, taxation and exchange. This curated selection spans roughly
600 BCE–1902; it is not a complete economic history. No generated or stock imagery
is included. Museum endorsement is not implied.

## Canonical collection

`src/renderer/history/slides.json` is the production catalogue. Entries retain the
title, creator, original museum date range, medium, museum, accession, caption,
reuse status and exact museum/policy links. `sortYear` is only an approximate
ordering value; it does not replace museum dating. Source notes preserve uncertain
identifications and historical catalogue language where relevant.

The 60 JPEGs in `src/renderer/public/history/images/` are local museum-supplied
web/IIIF renditions, at most 1200 pixels on either edge. Images use
`object-fit: contain`; artwork content is not cropped. The gallery loads its
current image and preloads only the next. The text-only index does not load all
60 images. Viewing or rotating the gallery makes no museum requests. Explicit
source buttons ask the main process to open an allowlisted URL in the browser.

## Image-specific reuse evidence

The selected images were verified on 17 September 2026 using official museum
records. Preserved evidence lists the API/dataset, exact download URL, rights flag,
original hash and caption basis for each object:

- [Ancient money](../src/renderer/history/ancient-source-notes.md): Cleveland
  `share_license_status: CC0` or Met `isPublicDomain: true`.
- [Later currency and banknote design](../src/renderer/history/currency-source-notes.md):
  the same object-specific Cleveland/Met flags.
- [Paintings, prints and trade scenes](../src/renderer/history/scenes-source-notes.md):
  Met `isPublicDomain: true`, NGA primary image `openaccess: "1"`, or SMK
  `public_domain: true` and its Public Domain Mark URL.

Museum policies: [Cleveland Open Access](https://www.clevelandart.org/open-access),
[Met Open Access](https://www.metmuseum.org/hubs/open-access),
[NGA terms](https://www.nga.gov/terms-and-notices), and
[SMK free images](https://www.smk.dk/article/vaerker-til-fri-download/).
The individual slide's rights link remains available in its details.

Evidence notes retain original study paths for audit history. Production files
are named after their catalogue ID. `asset-manifest.json` records the exact
production filename, byte length and SHA-256 digest. Original bytes were preserved
except the following replacement with a smaller official rendition:

- **Design for Banknote**, Robert William Hume, Met object **391742**, accession
  **30.16.42**. Rechecked 23 September 2026 against the
  [official object API](https://collectionapi.metmuseum.org/public/collection/v1/objects/391742):
  `isPublicDomain: true`. The exact `primaryImageSmall` is
  [DP805887.jpg](https://images.metmuseum.org/CRDImages/dp/web-large/DP805887.jpg).
  This replaces the larger study image without altering image content.

The original study's full-size download evidence is also preserved independently
of the study: [goldsmith source](../src/renderer/history/original-sources-goldsmith.md),
[banknote and Kushan coin sources](../src/renderer/history/original-sources-market.md),
and [painting source register](../src/renderer/history/original-money-art-sources.md).
Paths inside those historical notes describe the original downloads; those larger
images are not needed by the production gallery.

## Validation and playback

Run `node scripts/build-history.mjs`. Despite its historical name, this command
now validates production files; it does not regenerate from `design/`, download
images, or require the disposable study. It verifies 60 unique objects and image
hashes, chronology, required metadata, approved HTTPS source hosts, safe local
paths, JPEG dimensions, manifest integrity and absence of unreferenced image files.
Image-specific rights are backed by the evidence above; validation checks preserved
labels and integrity, not a fresh legal assessment.

The Vue gallery rotates every 25 seconds while visible, with at least 15% of the
panel on screen. It pauses on hover, focus, modal display and document hiding.
The app passes its own dialog state through the optional `paused` prop; gallery
details and index dialogs pause themselves.
Explicit Play allows rotation while that control remains hovered/focused; moving
to inspect other gallery content pauses it again. Previous/next, era selection,
the position slider and index browsing pause playback. App and live system
reduced-motion preferences disable automatic rotation; turning either preference
off does not silently restart a previously paused gallery.

Native modal dialogs provide focus containment, Escape dismissal and focus return.
Timers and observers are disposed on unmount. Lifecycle behavior follows
[Vue's cleanup guidance](https://vuejs.org/api/composition-api-lifecycle) and native
[modal dialog behavior](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
`tests/history-gallery.test.ts` verifies playback boundaries, explicit Play,
timer cleanup, complete period partitioning and chronological wrap.

Production browser verification on 23 September 2026 exercised period selection,
backward wrap, all 60 index entries, native modal focus containment and return,
25-second advancement, hover pause, focus leaving to non-focusable page content,
and live reduced-motion changes. The built renderer contained all 60 image files.
