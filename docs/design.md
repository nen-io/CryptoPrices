# The Collector

The selected direction combines study B's human scenes of exchange with study C's
museum specimen treatment. Warm paper, serif headings, ink-like rules and an olive
gallery frame give the app the character of a collection catalogue. Portfolio
numbers, coverage and actions remain plainly labelled.

The artwork is meaningful source material rather than decoration generated to
look historical. Sixty distinct museum works cover coinage, exchange and paper
currency from roughly 600 BCE to 1902. This is a curated collection, not an
exhaustive or geographically complete history of money. Museum dates and factual
captions travel with each image. The app uses the local catalogue in
`src/renderer/history/slides.json` and verified local assets.

The gallery rotates at 25-second intervals, pauses for reading and accessibility,
and offers manual controls, era selection, an index and provenance details. Data
comes first on narrow screens. Reduced-motion preferences stop autoplay and remove
nonessential transitions. Financial data and history retain independent state.

The disposable studies are preserved on the `design/collector-study` branch in
`design/`. They use illustrative data and are not the application. That branch
records the question, alternatives and selected result. Production components were
implemented in Vue with lifecycle cleanup, a bounded scheduler, local assets and
typed desktop actions; the prototype's imperative scripts are not bundled.
