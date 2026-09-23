# Money-history scenes: image provenance

Verified 17 September 2026. This collection contains 20 distinct artworks: 20 museum-supplied renditions, including smaller downloads of three artworks already held in the project. Images are photographs/scans supplied by the holding museum; no AI artwork, third-party image search downloads, or alternate impressions of the same composition are included.

## Rights and selection

- The Met: each included object’s API has `isPublicDomain: true`. Its [Open Access policy](https://www.metmuseum.org/hubs/open-access) makes corresponding images available under CC0. New files use the API’s exact `primaryImageSmall` URL and are 600–625px on the long edge.
- National Gallery of Art: exact primary-image rows have `openaccess: "1"` in the [official image dataset](https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv). The [NGA terms](https://www.nga.gov/terms-and-notices) apply CC0 to Open Access images. NGA’s IIIF service supplies a maximum of 1200px for Bosch and 1000px for Rembrandt.
- SMK: the exact object API has `public_domain: true` and the Public Domain Mark 1.0 URL. Its [free-image policy](https://www.smk.dk/article/vaerker-til-fri-download/) explains the museum’s marked images.

`date` preserves museum dating. `sortYear` is an approximate display-order index, using the midpoint of a museum range where available; it is not a new exact dating claim. `era` provides a broad century label. Captions paraphrase museum catalogue facts or the object’s explicit title/medium; they do not suggest that historical satire endorses investing. All new files retain the complete museum-supplied image. All gallery images are at most 1200px on the long edge. The original larger files and their full source metadata remain unchanged under `design/artwork/`.

The collection deliberately includes trade and craft alongside the explicit money, taxation, banking, and greed scenes. Money bags and financial satire, a Royal Exchange interior, a banker, goldsmiths and commercial advertisements supply the connection. Fragonard’s uncertain subject and the banker image’s historical title are explicitly noted in the JSON.

## Image-specific records

### scenes-met-459052 — A Goldsmith in his Shop

- Creator: Petrus Christus
- Date: 1449
- Museum and accession: The Metropolitan Museum of Art · 1975.1.110
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/459052
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/459052
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/rl/web-large/DP-42353-001.jpg
- Local file: `design/history/images/scenes-met-459052.jpg` · 542 × 625 pixels
- SHA-256: `fa971753e95d1439a94c132f57961638dfbf36081fe18dd93bdaefbfd7d2aa82`
- Caption: A goldsmith weighs a ring before a couple, with coins and precious wares in his shop. The Met interprets the scene as a portrayal of the profession, perhaps of a particular Bruges craftsman.
- Additional caption evidence: https://www.metmuseum.org/art/collection/search/459052
- Evidence detail: The object-page overview and audio transcript describe a ring being weighed and sold, the goldsmith’s trade wares, and the possible vocational portrait. Coins are visible in the museum image; no claim identifies the couple or craftsman with certainty.
- Original retained: `design/artwork/christus-goldsmith-met-459052.jpg` is unchanged. The gallery now uses this smaller official museum rendition; full original source metadata remains in `design/artwork/`. Original SHA-256: `44ed801e6304b3721c28a69d07bae67749166aeb2b42df9962344771d817b4f4`.

### scenes-nga-41645 — Death and the Miser

- Creator: Hieronymus Bosch
- Date: c. 1485/1490
- Museum and accession: National Gallery of Art, Washington · 1952.5.33
- Catalogue and caption source: https://www.nga.gov/artworks/41645-death-and-miser
- Metadata endpoint/dataset: https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv
- Image-specific rights evidence: `openaccess: "1"; depictstmsobjectid: "41645"; viewtype: "primary"`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.nga.gov/terms-and-notices
- Exact download URL: https://api.nga.gov/iiif/03ee67ee-dd0e-443f-84ef-ede5f62ce0cd/full/!1200,1200/0/default.jpg
- Local file: `design/history/images/scenes-nga-41645.jpg` · 402 × 1200 pixels
- SHA-256: `6824685e4b876f24b523e54b5b5010352b16e647155719783bef9a79549b8781`
- Caption: At the miser’s deathbed, a demon offers a money bag while an angel directs him toward a crucifix. Bosch frames accumulated wealth as a moral temptation.
- Museum credit line: Samuel H. Kress Collection

Compact museum metadata snapshot:

```json
{
  "uuid": "03ee67ee-dd0e-443f-84ef-ede5f62ce0cd",
  "iiifurl": "https://api.nga.gov/iiif/03ee67ee-dd0e-443f-84ef-ede5f62ce0cd",
  "iiifthumburl": "https://api.nga.gov/iiif/03ee67ee-dd0e-443f-84ef-ede5f62ce0cd/full/!200,200/0/default.jpg",
  "viewtype": "primary",
  "sequence": "0",
  "width": "12375",
  "height": "36971",
  "maxpixels": "",
  "openaccess": "1",
  "created": "2018-10-11 14:15:59-04",
  "modified": "2026-03-09 14:50:59-04",
  "depictstmsobjectid": "41645",
  "assistivetext": "A naked man with ghostly white skin sits upright in a canopied bed set in a narrow room in this tall, vertical painting. Wearing a black cap, he looks to our left in profile toward a skeleton who comes through a door along the left edge of the composition. The man gestures at the skeleton with one hand and, with the other, toward a bag of money held up by a small demon next to the bed to our left. The skeleton wears a white shroud and holds an arrow. A winged angel kneels next to the man in the bed, one hand on the man’s shoulder and the other lifted to gesture at a crucifix hanging in the window over the door. A small devil on the canopy above looks down onto the bed. At the foot of the bed, a man wearing a green robe and headdress drops coins into a sack held by another demon. Three more demons crawl about and hide under the chest. Pieces of armor and weapons lie on the ground to the right in front of a stone ledge in the foreground. Two pieces of clothing drape over the ledge to our left."
}
```

### scenes-smk-kmssp334 — The Merchant and his Wife

- Creator: Marinus van Reymerswale
- Date: 1540
- Museum and accession: SMK – National Gallery of Denmark · KMSsp334
- Catalogue and caption source: https://open.smk.dk/artwork/image/KMSsp334
- Metadata endpoint/dataset: https://api.smk.dk/api/v1/art/?object_number=KMSsp334
- Image-specific rights evidence: `public_domain: true; rights: https://creativecommons.org/publicdomain/mark/1.0/`
- Rights: [Public domain](https://creativecommons.org/publicdomain/mark/1.0/); museum policy: https://www.smk.dk/article/vaerker-til-fri-download/
- Exact download URL: https://iip.smk.dk/iiif/jp2/2n49t5316_KMSsp334.tif.jp2/full/!1000,1000/0/default.jpg
- Local file: `design/history/images/scenes-smk-kmssp334.jpg` · 1000 × 751 pixels
- SHA-256: `5a84e7417d541f370d75bb571f25b223c46fef0c664ebb10c01cc081d7bf3b55`
- Caption: A merchant and his wife sit with coins, scales and a ledger. SMK interprets the scene as a warning against greed.
- Original retained: `design/artwork/reymerswale-merchant-and-wife-1540.jpg` is unchanged. The gallery now uses this smaller official museum rendition; full original source metadata remains in `design/artwork/`. Original SHA-256: `c0ce15710971fa2cbd431680d58131eb3ea2830d4ba27b5b3b7cbfaade154758`.
- Catalogue qualification: English title for the museum’s Danish title Købmanden med sin kone; artist spelling follows SMK.

### scenes-met-371791 — The Merchant Robbed by Monkeys

- Creator: Pieter van der Heyden; After Pieter Bruegel the Elder
- Date: 1562
- Museum and accession: The Metropolitan Museum of Art · 26.72.25
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/371791
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/371791
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP818316.jpg
- Local file: `design/history/images/scenes-met-371791.jpg` · 599 × 474 pixels
- SHA-256: `b666e4ee2902c04d4b0346e654f99a3ddb7f085f49a0382828072ac053f9c2ee`
- Caption: A merchant is robbed by monkeys in this engraving after Pieter Bruegel the Elder. The Met dates it to 1562 and identifies Hieronymus Cock as its publisher.
- Museum credit line: Harris Brisbane Dick Fund, 1926

Compact museum metadata snapshot:

```json
{
  "objectID": 371791,
  "isPublicDomain": true,
  "accessionNumber": "26.72.25",
  "title": "The Merchant Robbed by Monkeys",
  "objectDate": "1562",
  "objectBeginDate": 1562,
  "objectEndDate": 1562,
  "artistDisplayName": "Pieter van der Heyden",
  "artistPrefix": "",
  "medium": "Engraving; first state of five",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP818316.jpg"
}
```

### scenes-met-338702 — The Battle about Money

- Creator: Pieter van der Heyden; After Pieter Bruegel the Elder
- Date: after 1570
- Museum and accession: The Metropolitan Museum of Art · 26.72.40
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/338702
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/338702
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP808184.jpg
- Local file: `design/history/images/scenes-met-338702.jpg` · 600 × 462 pixels
- SHA-256: `cf4f3840b5359e88f5f2a8db2c98a7486af41de752b46f94fec7f703eff4cb87`
- Caption: Armed money bags, coin-filled barrels and treasure chests wage a chaotic battle. The Met connects this image after Bruegel with the destructive pursuit of wealth.
- Museum credit line: Harris Brisbane Dick Fund, 1926

Compact museum metadata snapshot:

```json
{
  "objectID": 338702,
  "isPublicDomain": true,
  "accessionNumber": "26.72.40",
  "title": "The Battle about Money",
  "objectDate": "after 1570",
  "objectBeginDate": 1570,
  "objectEndDate": 1580,
  "artistDisplayName": "Pieter van der Heyden",
  "artistPrefix": "",
  "medium": "Engraving; second state of four",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP808184.jpg"
}
```

### scenes-met-370640 — Christ Driving the Money Changers from the Temple

- Creator: Rembrandt (Rembrandt van Rijn)
- Date: 1635
- Museum and accession: The Metropolitan Museum of Art · 41.1.49
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/370640
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/370640
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP814415.jpg
- Local file: `design/history/images/scenes-met-370640.jpg` · 600 × 465 pixels
- SHA-256: `38219ff5f0de1e572132aeb409794d6aa2b3181640b49ee85bf32af78ca8ee22`
- Caption: Rembrandt depicts Christ driving money changers from the temple in this 1635 etching.
- Museum credit line: Gift of Felix M. Warburg and his family, 1941

Compact museum metadata snapshot:

```json
{
  "objectID": 370640,
  "isPublicDomain": true,
  "accessionNumber": "41.1.49",
  "title": "Christ Driving the Money Changers from the Temple",
  "objectDate": "1635",
  "objectBeginDate": 1635,
  "objectEndDate": 1635,
  "artistDisplayName": "Rembrandt (Rembrandt van Rijn)",
  "artistPrefix": "",
  "medium": "Etching",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP814415.jpg"
}
```

### scenes-nga-118967 — Jan Uytenbogaert, “The Goldweigher”

- Creator: Rembrandt van Rijn
- Date: 1639
- Museum and accession: National Gallery of Art, Washington · 2001.64.2
- Catalogue and caption source: https://www.nga.gov/artworks/118967-jan-uytenbogaert-goldweigher
- Metadata endpoint/dataset: https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv
- Image-specific rights evidence: `openaccess: "1"; depictstmsobjectid: "118967"; viewtype: "primary"`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.nga.gov/terms-and-notices
- Exact download URL: https://api.nga.gov/iiif/ea7376ee-3e42-4c52-9100-8192cc908881/full/!1000,1000/0/default.jpg
- Local file: `design/history/images/scenes-nga-118967.jpg` · 816 × 1000 pixels
- SHA-256: `32235b6ae9cf681626a36a8476eaaab12c947a49b824f72eac2c51c8671e97a9`
- Caption: Tax collector Jan Uytenbogaert receives payments at his counting table. He was also Rembrandt’s friend and a patron of the arts.
- Additional caption evidence: https://www.nga.gov/content/dam/ngaweb/research/gallery-archives/PressReleases/2009-2000/2001/14A11_45234_20010529.pdf
- Evidence detail: NGA’s 29 May 2001 acquisitions announcement, PRINTS section, explicitly identifies Uytenbogaert as a tax collector receiving payments at his counting table, a friend of Rembrandt and an arts patron. Verified in the indexed text of the museum publication; the object-page fetch timed out.
- Original retained: `design/artwork/rembrandt-goldweigher-1639.jpg` is unchanged. The gallery now uses this smaller official museum rendition; full original source metadata remains in `design/artwork/`. Original SHA-256: `42a1ad0a4e64b7cde7081fdf2ad99ba0ca3f293607560630e25ce83660099bcf`.

### scenes-met-360615 — Byrsa Londinensis vulgo the Royal Exchange (Royal Exchange, London)

- Creator: Wenceslaus Hollar
- Date: 1645–47
- Museum and accession: The Metropolitan Museum of Art · 17.3.1166-345
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/360615
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/360615
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP823174.jpg
- Local file: `design/history/images/scenes-met-360615.jpg` · 600 × 353 pixels
- SHA-256: `820595d89003d3bb27110e7104a4188e6987f983a64e8ed08cdb84e8a6e25814`
- Caption: Merchants traded in the Royal Exchange’s open courtyard, moving under its arcades in wet weather. Thomas Gresham modeled this London centre of commerce on Antwerp’s Bourse.
- Additional caption evidence: https://www.metmuseum.org/art/collection/search/360615
- Evidence detail: The museum overview describes the commercial institution, the courtyard used for trading, covered arcades used in wet weather, Gresham and the Antwerp Bourse model.
- Museum credit line: Harris Brisbane Dick Fund, 1917

Compact museum metadata snapshot:

```json
{
  "objectID": 360615,
  "isPublicDomain": true,
  "accessionNumber": "17.3.1166-345",
  "title": "Byrsa Londinensis vulgo the Royal Exchange (Royal Exchange, London)",
  "objectDate": "1645–47",
  "objectBeginDate": 1645,
  "objectEndDate": 1647,
  "artistDisplayName": "Wenceslaus Hollar",
  "artistPrefix": "",
  "medium": "Etching, presumably second state of two with number trimmed off margin",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP823174.jpg"
}
```

### scenes-met-396311 — Eyeglass Merchant

- Creator: After Adriaen van Ostade
- Date: 1610–85
- Museum and accession: The Metropolitan Museum of Art · 51.501.1538
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/396311
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/396311
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP821825.jpg
- Local file: `design/history/images/scenes-met-396311.jpg` · 497 × 625 pixels
- SHA-256: `fc97f74810b181442d048308dc62ec6e804120b1b25f0c4acdae1f26c941b0c1`
- Caption: An eyeglass seller is the subject of this etching after Adriaen van Ostade. The museum retains a broad seventeenth-century date for the work.
- Museum credit line: The Elisha Whittelsey Collection, The Elisha Whittelsey Fund, 1951
- Catalogue qualification: Attributed after Adriaen van Ostade, not to him directly. Museum date: 1610–85; sortYear is only an approximate ordering value.

Compact museum metadata snapshot:

```json
{
  "objectID": 396311,
  "isPublicDomain": true,
  "accessionNumber": "51.501.1538",
  "title": "Eyeglass Merchant",
  "objectDate": "1610–85",
  "objectBeginDate": 1610,
  "objectEndDate": 1685,
  "artistDisplayName": "Adriaen van Ostade",
  "artistPrefix": "After",
  "medium": "Etching",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP821825.jpg"
}
```

### scenes-met-392048 — The Goldsmith

- Creator: Rembrandt (Rembrandt van Rijn)
- Date: 1655
- Museum and accession: The Metropolitan Museum of Art · 17.37.5
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/392048
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/392048
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP814906.jpg
- Local file: `design/history/images/scenes-met-392048.jpg` · 474 × 625 pixels
- SHA-256: `d638309e1a4f1da9249b21679898e63edc49a5a10cb804f2fc881915404b1bcb`
- Caption: A craftsman works on a small figure of a mother with two children. Known as The Goldsmith, the scene brings the making of ornamental objects into view.
- Additional caption evidence: https://www.britishmuseum.org/collection/object/P_F-5-62
- Evidence detail: British Museum description of another impression of Rembrandt’s same 1655 composition identifies a studio workman working on a figure of a mother with two children. Verified in indexed museum text; direct fetch returned 403. Met supplies the retained title and image. Caption makes no unsupported claim about the sculpture’s metal, value or intended buyer.
- Museum credit line: Gift of Henry Walters, 1917

Compact museum metadata snapshot:

```json
{
  "objectID": 392048,
  "isPublicDomain": true,
  "accessionNumber": "17.37.5",
  "title": "The Goldsmith",
  "objectDate": "1655",
  "objectBeginDate": 1655,
  "objectEndDate": 1655,
  "artistDisplayName": "Rembrandt (Rembrandt van Rijn)",
  "artistPrefix": "",
  "medium": "Etching and drypoint; first of three states",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP814906.jpg"
}
```

### scenes-met-373068 — Jan Lutma, goldsmith

- Creator: Rembrandt (Rembrandt van Rijn)
- Date: 1656
- Museum and accession: The Metropolitan Museum of Art · 20.46.1
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/373068
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/373068
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP814897.jpg
- Local file: `design/history/images/scenes-met-373068.jpg` · 470 × 624 pixels
- SHA-256: `b26af49a72e3d9da71aa33a533840c51fde1ca47b99f959ea9bcc9bac29f629b`
- Caption: The Amsterdam silversmith Jan Lutma sits with the tools and products of his trade: a hammer, chisels, a candlestick and a small dish.
- Additional caption evidence: https://www.metmuseum.org/art/collection/search/373068
- Evidence detail: The museum overview identifies Lutma as an Amsterdam silversmith and names the hammer, chisels, candlestick and oval dish. This is a craft scene; no unsupported connection to deposit banking or coin production is made.
- Museum credit line: The Sylmaris Collection, Gift of George Coe Graves, 1920

Compact museum metadata snapshot:

```json
{
  "objectID": 373068,
  "isPublicDomain": true,
  "accessionNumber": "20.46.1",
  "title": "Jan Lutma, goldsmith",
  "objectDate": "1656",
  "objectBeginDate": 1656,
  "objectEndDate": 1656,
  "artistDisplayName": "Rembrandt (Rembrandt van Rijn)",
  "artistPrefix": "",
  "medium": "Etching, engraving and drypoint; first of four states",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP814897.jpg"
}
```

### scenes-met-396205 — The South Sea Scheme

- Creator: William Hogarth
- Date: 1722
- Museum and accession: The Metropolitan Museum of Art · 32.35(252)
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/396205
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/396205
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP824513.jpg
- Local file: `design/history/images/scenes-met-396205.jpg` · 600 × 478 pixels
- SHA-256: `88c0fa651b0c52f1664a2d02024ef13bfda46d7ae1a5393db31907e0cbca97a9`
- Caption: A crowd gathers around a merry-go-round in Hogarth’s satire of the South Sea Bubble of 1720. Honour and Honesty are beaten while Trade sleeps.
- Additional caption evidence: https://www.britishmuseum.org/collection/object/P_1841-0809-230
- Evidence detail: British Museum catalogue of another impression of the same composition identifies the South Sea financial scandal, the 1720 event, merry-go-round, and personifications. Used only for composition context; the image, rights and date remain those of Met 396205. Catalogue description verified in indexed museum text; direct fetch returned 403. No claim that both impressions share a state or publication date.
- Museum credit line: Harris Brisbane Dick Fund, 1932

Compact museum metadata snapshot:

```json
{
  "objectID": 396205,
  "isPublicDomain": true,
  "accessionNumber": "32.35(252)",
  "title": "The South Sea Scheme",
  "objectDate": "1722",
  "objectBeginDate": 1722,
  "objectEndDate": 1722,
  "artistDisplayName": "William Hogarth",
  "artistPrefix": "",
  "medium": "Etching and engraving; seventh state of seven",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP824513.jpg"
}
```

### scenes-met-369078 — Trade Card for a Textile Merchant

- Creator: Gabriel de Saint-Aubin
- Date: 1752
- Museum and accession: The Metropolitan Museum of Art · 64.642.1
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/369078
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/369078
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP148565.jpg
- Local file: `design/history/images/scenes-met-369078.jpg` · 599 × 447 pixels
- SHA-256: `d4a529d3481e9c6f4956380a3cecfc8ac542e0f900c62c590db789284fc01d9d`
- Caption: A loom and ships appear behind the ornamental drapery of this textile merchant’s trade card. Saint-Aubin designed advertisements for artisans and businesses.
- Museum credit line: The Elisha Whittelsey Collection, The Elisha Whittelsey Fund, 1964

Compact museum metadata snapshot:

```json
{
  "objectID": 369078,
  "isPublicDomain": true,
  "accessionNumber": "64.642.1",
  "title": "Trade Card for a Textile Merchant",
  "objectDate": "1752",
  "objectBeginDate": 1752,
  "objectEndDate": 1752,
  "artistDisplayName": "Gabriel de Saint-Aubin",
  "artistPrefix": "",
  "medium": "Etching, second state",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP148565.jpg"
}
```

### scenes-met-394750 — The Egg Merchant

- Creator: John Ingram; After François Boucher
- Date: 1741–63
- Museum and accession: The Metropolitan Museum of Art · 53.600.1055
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/394750
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/394750
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP826293.jpg
- Local file: `design/history/images/scenes-met-394750.jpg` · 413 × 625 pixels
- SHA-256: `9bf8332d59e3fb2abb45809c4b5d9e1e6d243a059f95777a84f9236bd71c643d`
- Caption: John Ingram depicts an egg seller in this etching and engraving after François Boucher. The Met dates the print to 1741–63.
- Museum credit line: Harris Brisbane Dick Fund, 1953

Compact museum metadata snapshot:

```json
{
  "objectID": 394750,
  "isPublicDomain": true,
  "accessionNumber": "53.600.1055",
  "title": "The Egg Merchant",
  "objectDate": "1741–63",
  "objectBeginDate": 1741,
  "objectEndDate": 1763,
  "artistDisplayName": "John Ingram",
  "artistPrefix": "",
  "medium": "Etching and engraving",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP826293.jpg"
}
```

### scenes-met-369312 — The Tax Collectors (Les Traitants)

- Creator: Jean Honoré Fragonard
- Date: 1778
- Museum and accession: The Metropolitan Museum of Art · 46.125.3
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/369312
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/369312
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP813860.jpg
- Local file: `design/history/images/scenes-met-369312.jpg` · 472 × 624 pixels
- SHA-256: `56d66aafc55f9ee18e37ed343e0d8b81d3193d6db8d9e9332c37db0858e8ea26`
- Caption: This etching is known as The Tax Collectors, but the Met notes that its subject remains unverified. The title first appeared in an 1859 publication.
- Museum credit line: Harris Brisbane Dick Fund, 1946
- Catalogue qualification: The museum states that the subject has never been verified; the historical title is retained without presenting the identification as certain.

Compact museum metadata snapshot:

```json
{
  "objectID": 369312,
  "isPublicDomain": true,
  "accessionNumber": "46.125.3",
  "title": "The Tax Collectors (Les Traitants)",
  "objectDate": "1778",
  "objectBeginDate": 1778,
  "objectEndDate": 1778,
  "artistDisplayName": "Jean Honoré Fragonard",
  "artistPrefix": "",
  "medium": "Etching",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP813860.jpg"
}
```

### scenes-met-391820 — "The Friend of the People" & his Petty New Tax Gatherer, Paying John Bull a Visit

- Creator: James Gillray
- Date: May 28, 1806
- Museum and accession: The Metropolitan Museum of Art · 17.3.888-78
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/391820
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/391820
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP889962.jpg
- Local file: `design/history/images/scenes-met-391820.jpg` · 488 × 625 pixels
- SHA-256: `7934549602a0f7d5a46f48782fa9bc67fc36e022cb80af317fc7b5e84fd993b3`
- Caption: Gillray pictures a visit from a tax gatherer in this hand-colored etching. The Met identifies Charles James Fox and Henry Petty-Fitzmaurice among its subjects.
- Museum credit line: Harris Brisbane Dick Fund, 1917

Compact museum metadata snapshot:

```json
{
  "objectID": 391820,
  "isPublicDomain": true,
  "accessionNumber": "17.3.888-78",
  "title": "\"The Friend of the People\" & his Petty New Tax Gatherer, Paying John Bull a Visit",
  "objectDate": "May 28, 1806",
  "objectBeginDate": 1806,
  "objectEndDate": 1806,
  "artistDisplayName": "James Gillray",
  "artistPrefix": "",
  "medium": "Hand-colored etching",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP889962.jpg"
}
```

### scenes-met-49004 — Fish Merchant Carrying Yellowtails on Horseback

- Creator: Painting by Tani Bunchō; Inscription by Shokusanjin (Ōta Nanpo)
- Date: 1814
- Museum and accession: The Metropolitan Museum of Art · 1975.268.112
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/49004
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/49004
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/as/web-large/DP277625.jpg
- Local file: `design/history/images/scenes-met-49004.jpg` · 156 × 625 pixels
- SHA-256: `a54b3854ec389ab2ae4b8293f2b14c2ee126de0a633c1db42fe2b055955a89a6`
- Caption: A fish merchant carries yellowtails on horseback in this Japanese hanging scroll. Tani Bunchō supplied the painting and Shokusanjin the inscription.
- Museum credit line: The Harry G. C. Packard Collection of Asian Art, Gift of Harry G. C. Packard, and Purchase, Fletcher, Rogers, Harris Brisbane Dick, and Louis V. Bell Funds, Joseph Pulitzer Bequest, and The Annenberg Fund Inc. Gift, 1975

Compact museum metadata snapshot:

```json
{
  "objectID": 49004,
  "isPublicDomain": true,
  "accessionNumber": "1975.268.112",
  "title": "Fish Merchant Carrying Yellowtails on Horseback",
  "objectDate": "1814",
  "objectBeginDate": 1814,
  "objectEndDate": 1814,
  "artistDisplayName": "Tani Bunchō",
  "artistPrefix": "Painting by",
  "medium": "Hanging scroll; ink and color on paper",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/as/web-large/DP277625.jpg"
}
```

### scenes-met-386446 — A Banker in Barry Selly Cast, from Indian Trades and Castes

- Creator: Anonymous, Indian, 19th century
- Date: ca. 1840
- Museum and accession: The Metropolitan Museum of Art · 1970.548.3
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/386446
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/386446
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP807531.jpg
- Local file: `design/history/images/scenes-met-386446.jpg` · 479 × 625 pixels
- SHA-256: `899254b434e6f746b73bb43645aeaef8a628ecdaf4dccfc6c366e08c5258f7f6`
- Caption: Banking appears among the occupations represented in this Indian series of trades and castes.
- Additional caption evidence: https://www.metmuseum.org/art/collection/search/386446
- Evidence detail: The object’s explicit title supplies the occupation and series. The museum provides no further banking-history interpretation; the caption deliberately adds no regional, caste, credit-system or institutional claims.
- Museum credit line: Rogers Fund, 1970
- Catalogue qualification: The catalogue title is retained verbatim, including its historical terminology; the caption uses the museum’s broad identification of the depicted occupation.

Compact museum metadata snapshot:

```json
{
  "objectID": 386446,
  "isPublicDomain": true,
  "accessionNumber": "1970.548.3",
  "title": "A Banker in Barry Selly Cast, from Indian Trades and Castes",
  "objectDate": "ca. 1840",
  "objectBeginDate": 1835,
  "objectEndDate": 1845,
  "artistDisplayName": "Anonymous, Indian, 19th century",
  "artistPrefix": "",
  "medium": "Watercolor and gouache",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP807531.jpg"
}
```

### scenes-met-336585 — The Tribute Money

- Creator: Eugène Delacroix
- Date: 1843
- Museum and accession: The Metropolitan Museum of Art · 2013.1135.9
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/336585
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/336585
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/dp/web-large/DP837807.jpg
- Local file: `design/history/images/scenes-met-336585.jpg` · 599 × 455 pixels
- SHA-256: `9a5a2f4cd01e97f056330b908a048cc5e8dcbe5cbd0b76e1dc3c6f78da1e3850`
- Caption: Delacroix studied the biblical payment of the temple tax for a ceiling composition in the Palais Bourbon library. This 1843 graphite drawing formed part of that preparation.
- Museum credit line: Gift from the Karen B. Cohen Collection of Eugène Delacroix, in memory of Frank Anderson Trapp, 2013

Compact museum metadata snapshot:

```json
{
  "objectID": 336585,
  "isPublicDomain": true,
  "accessionNumber": "2013.1135.9",
  "title": "The Tribute Money",
  "objectDate": "1843",
  "objectBeginDate": 1843,
  "objectEndDate": 1843,
  "artistDisplayName": "Eugène Delacroix",
  "artistPrefix": "",
  "medium": "Graphite",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/dp/web-large/DP837807.jpg"
}
```

### scenes-met-55257 — A True View of a Trading House of a Yokohama Merchant

- Creator: Utagawa (Gountei) Sadahide
- Date: 1861
- Museum and accession: The Metropolitan Museum of Art · JP3245
- Catalogue and caption source: https://www.metmuseum.org/art/collection/search/55257
- Metadata endpoint/dataset: https://collectionapi.metmuseum.org/public/collection/v1/objects/55257
- Image-specific rights evidence: `isPublicDomain: true`
- Rights: [CC0](https://creativecommons.org/publicdomain/zero/1.0/); museum policy: https://www.metmuseum.org/hubs/open-access
- Exact download URL: https://images.metmuseum.org/CRDImages/as/web-large/DP147651.jpg
- Local file: `design/history/images/scenes-met-55257.jpg` · 600 × 294 pixels
- SHA-256: `d9f408e1742eb2adb2a02b2244cebcca5ed9c718cd729e658d6a185a7e158b1f`
- Caption: Merchants conduct business while workers carry goods through a Yokohama trading house. Sadahide’s triptych also records the encounter between Japanese and imported fashions.
- Museum credit line: Gift of Lincoln Kirstein, 1959

Compact museum metadata snapshot:

```json
{
  "objectID": 55257,
  "isPublicDomain": true,
  "accessionNumber": "JP3245",
  "title": "A True View of a Trading House of a Yokohama Merchant",
  "objectDate": "1861",
  "objectBeginDate": 1861,
  "objectEndDate": 1861,
  "artistDisplayName": "Utagawa (Gountei) Sadahide",
  "artistPrefix": "",
  "medium": "Triptych of woodblock prints (nishiki-e); ink and color on paper; vertical ōban",
  "primaryImageSmall": "https://images.metmuseum.org/CRDImages/as/web-large/DP147651.jpg"
}
```
