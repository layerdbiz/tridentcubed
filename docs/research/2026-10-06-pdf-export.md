How V1 exports PDFs: real text, working styles, small files

Observed October 6, 2026. Research for ticket #145 (part of #111): how the prototype turns a report into a PDF, why its styles went missing along the way, and how V1 should export so the PDF keeps real, selectable text and the report's styling and is still small enough to email when it holds 100 or more 4K photos. It changes nothing in the repo. Sources are the prototype's code and git history, Vercel's docs, Skia and Chromium source (the code that actually writes Chrome's PDFs), Puppeteer's docs and source, the `@sparticuz/chromium` README and release assets, Supabase's docs, the vendors' own pricing pages (Browserless, DocRaptor, PDFShift, Cloudflare), Gotenberg, Ghostscript and qpdf docs, Artifex licensing, Google and Microsoft mail limits, MDN browser-compat data and the npm registry. The size figures in section 6 are arithmetic from the report's slot sizes and an assumed JPEG density, not measurements; they are marked as such.

Terms used below. **Headless Chromium** is Chrome with no window, driven by code; **Puppeteer** is the Node library that drives it; `page.pdf()` is Chrome's own "Save as PDF", so text stays text. **Skia** is the graphics library inside Chrome that writes the PDF bytes. **Passthrough** means Skia copies a JPEG's bytes into the PDF untouched instead of decoding and re-encoding it. **Deflate** is lossless zip-style compression; a photo stored that way is many times larger than as JPEG. **ppi** is image pixels per inch of printed page. **Type 3 font** is a PDF font made of drawn shapes rather than an embedded font file; its text is still searchable, but the file is bigger and some viewers draw it less crisply. **Slot** is the box a photo fills in a 1-up, 2-up or 4-up photo page.

## Short answer

Recommendation, **medium confidence** (the platform limits and the Skia behaviour are read from primary sources; the speed of a 100-photo export and the final file sizes are not measured yet):

1. **Keep Chrome, and keep the pattern that fixed the styles.** The working prototype renders the real report component in a server-rendered print route and has headless Chromium *navigate* to that route on the app's own origin, so Vite's normal CSS for that component loads like any page. That is what ended the missing-styles saga (section 2). V1 keeps it: a SvelteKit server route launches `puppeteer-core` with `@sparticuz/chromium-min` (versions matched) in a Vercel Function, `page.goto(printUrl)`, `page.pdf()`. Text stays real text, and the CSS is the preview's CSS.
2. **Fix the four things in the prototype that break at V1 scale:**
   - **Send an id, not the report.** The prototype POSTs the whole report, photos included as full-resolution base64 `data:` URLs, to the function. Vercel refuses request bodies over **4.5 MB**, about one 4K photo. V1 POSTs a report id; the print route loads the report from Postgres through the one permission check (ADR 0003).
   - **No in-memory hand-off.** The prototype keeps the snapshot in a `Map` in the exporting instance, then makes Chromium fetch the print URL over the public internet. That request can land on a different instance and return "Export session not found". Loading from the database removes the problem. A short-lived signed print token in the URL replaces forwarding the user's cookies.
   - **Do not buffer the PDF into the response.** The 4.5 MB cap also applies to response bodies. Upload the PDF to Supabase Storage and return a signed download URL (this also gives the "email it" step a file to attach). Streaming with `page.createPDFStream()` is the other way round the cap.
   - **Give Chromium JPEGs already sized for their slot.** Skia copies a JPEG into the PDF byte for byte, at its full pixel size, *only* when the JPEG is YCbCr or grey and its EXIF orientation is "top-left". Anything else (WebP, PNG, AVIF, a rotated iPhone JPEG) is decoded and stored **losslessly with Deflate**, because Chrome leaves Skia's JPEG re-encoding switched off. Chrome never downsamples. So the print route must point `<img>` at a JPEG made for that slot, with orientation already applied: 1-up about 1,200 px on the long edge, 2-up about 600, 4-up about 450 (200 ppi), quality about 80, from an orientation-baked JPEG "print" derivative through Supabase transformations with `format: 'origin'`.
3. **Expected size.** With slot-sized JPEGs, a 100-photo report comes out at roughly **3 MB (all 4-up) to 20 MB (all 1-up at 200 ppi; about 11 MB at 150 ppi)**, compared with **about 300 MB** if the originals are embedded. Gmail caps attachments at 25 MB and Exchange Online's default message cap is 35 MB *after* a 33 % encoding increase. Aim for **15 MB or less**, and lower the 1-up ppi when a report runs over.
4. **Fonts.** Chrome subsets embedded fonts on its own. Skia turns **variable fonts** into Type 3, though, and the UI loads `@fontsource-variable/asta-sans` and `@fontsource-variable/jetbrains-mono`. Give the print route static font files.
5. **Post-compression is a safety net, not the plan.** If the inputs are right there is little left to squeeze. Gotenberg's `optimize` or qpdf re-encode images; Ghostscript downsamples but is AGPL (a commercial licence for a hosted service) and may drop links and tags.
6. **Fallbacks, in order.** First, a hosted Chromium such as Cloudflare Browser Rendering (/pdf endpoint, 10 browser-hours a month included on Workers Paid, then $0.09 an hour) or Browserless, if Chromium proves too slow or heavy in a Vercel Function. Second, Gotenberg on a small server, if you want Chromium and image optimisation in one box. Not recommended: DocRaptor (Prince, not Chrome, so the CSS would diverge from the preview), PDF libraries (every layout re-authored), and `window.print()` (no control over file size and no file on the server). `window.print()` is still worth keeping as a manual fallback.
7. **Video.** Common PDF viewers do not play video; only Adobe Acrobat and Reader document playback. In the PDF, show a poster frame (a Cloudflare Stream thumbnail, or a frame captured at upload) wrapped in a link to a durable Trident URL. Add a QR code for paper copies. Never link a raw Supabase signed URL, because it expires.

## 1. What the prototype does today

The client (`apps/app/src/routes/(app)/projects/[projectId]/+page.svelte`, `handleExport`) builds an `ExportSnapshotType`: schema, titles, cover meta, summary, personnel, table of contents and `previewPageItems`. It turns every photo and avatar into a `data:` URL with `getExportableImageSource` (`projects.assets.ts`, reads the IndexedDB blob, `readAsDataURL`), then POSTs `{ snapshot, filename }` as JSON to `/api/export/pdf`.

`apps/app/src/routes/api/export/pdf/+server.ts` does five things:

- It stores the snapshot under a random token in `export-session-store.ts`, a module-level `Map` with a 5-minute TTL.
- It launches `puppeteer-core` 24.38.0 with `@sparticuz/chromium-min` 143.0.4. On Vercel it downloads the pack from `github.com/Sparticuz/chromium/releases/...pack.x64.tar` into `/tmp`; locally it uses an installed Chrome or Edge.
- It forwards `cookie`, `authorization`, `accept-language` and the `x-vercel-*` bypass headers.
- It sets the viewport to 816×1056 and `emulateMediaType('screen')`, then calls `page.goto('/export/print/<token>', { waitUntil: 'networkidle0' })`. It checks that `.preview-page` elements exist, waits for `document.fonts.ready` and calls `img.decode()` on every image.
- It calls `page.pdf({ format: 'Letter', margin: 0, printBackground: true, preferCSSPageSize: true })` and returns the whole buffer as the response.

`apps/app/src/routes/export/print/[token]/` has three files:

- `+page.ts` sets `ssr = true; csr = false`, overriding the root layout's `ssr = false`.
- `+page.server.ts` reads the session and then deletes it.
- `+page.svelte` renders `ReportPreviewDocument` from `(app)/projects/preview/` with `mode="print"`. Its global CSS sets `.preview-page` to 8.5in × 11in with `break-after: page`, and `print-color-adjust: exact`.

Photo slots come from `projects.utils.ts`. 1-up: the full content width, 4.7in tall (landscape) or 5.6in (portrait). 2-up and 4-up: a two-column grid, 2.45in or 1.9in tall for landscape (3.55in or 2.7in for portrait). Each frame has 12 px of padding, and `object-contain` fits the photo inside it.

## 2. Why the styles failed, and what fixed them

All of this happened on 2026-05-15 and 2026-05-21/22 (the `BETA` commits). The sequence, read from `git log -p` on the exporter and the print routes:

| Commit | What it tried | What it tells us |
| --- | --- | --- |
| `902266c` | The client sent the preview's **HTML string** (`markup`). The print route dropped it in with `{@html markup}`. | The markup carried Svelte's scoped class hashes (`svelte-xyz`), but the CSS for those components ships in the chunks of the `(app)/projects` route, which the print route never imports. Tailwind utilities from `app.css` arrived; component styles did not. This is the root cause. |
| `35cf860`, `80c4d16` | An empty `/export/print` shell, then `innerHTML = markup` via `page.evaluate`. | The same missing-CSS problem in another form. |
| `133f453` | Back to the token route, with `ssr = true; csr = false`. | Needed because the root layout sets `ssr = false`, so without this the print page would be an empty SPA shell. |
| `6e17aad` | Rendered the print page with SvelteKit's in-process `fetch`, then served that HTML to Chromium through request interception. | The comment names a second bug: Chromium's own request "may land on another instance", so the in-memory session is lost. |
| `bf0e189` | `page.setContent(html)` plus an injected `<base href>`, plus `--disable-web-security`. | With `setContent` the page lives at `about:blank`, so relative CSS and font URLs break and CORS blocks fonts from the null origin. Turning off web security papered over that. |
| `915b4e3`, `c0ba1fb` | The client sent its `document.styleSheets` hrefs (`cssLinks`); the server fetched and inlined every stylesheet, rewrote `url()`s, mapped `*.vercel.app` preview origins, and logged diagnostics. | A heroic workaround for the missing component CSS. It also had to cope with preview deployments whose asset origin differs from the request origin. |
| `15f90f5` | **The fix.** The client sends data (`snapshot`), and the print route renders the real `ReportPreviewDocument` component. | Because the print route now imports the component, Vite bundles that component's CSS for the route, and SvelteKit's SSR puts the `<link rel="stylesheet">` tags in the head. |
| `208f9da` | Deleted all of the inlining and `setContent` machinery; went back to `page.goto(printUrl)` on the same origin. | Same-origin navigation loads CSS and fonts normally; `--disable-web-security` was removed. |
| `3da2a2d`, `2309971` | Forwarded cookies and Vercel bypass headers; threw if no `.preview-page` rendered ("print-target-mismatch"); cleaned up. | The print URL sometimes rendered something else, such as a login or deployment-protection page, instead of the report. |

What still breaks or is fragile in the final version:

- **Cross-instance session (inferred from the code and Vercel's docs, not from logs).** The session lives in one instance's memory, and Chromium's `goto` is a fresh HTTP request through Vercel. Fluid compute "prioritize[s] existing idle resources" but promises nothing, so the print route can 404 now and then. The in-process `fetch` from `6e17aad` avoided this, but `208f9da` reverted it.
- **Request body.** Photos travel as base64 `data:` URLs inside the JSON body, so a report with more than one or two 4K photos goes over Vercel's 4.5 MB request cap (`413 FUNCTION_PAYLOAD_TOO_LARGE`).
- **Response body.** `new Response(Buffer.from(pdf))` is a buffered response, so a PDF over 4.5 MB hits the same cap.
- **Bypass header.** Forwarding the *client's* `x-vercel-protection-bypass` does nothing, because browsers do not send it. The documented approach is the server's own `VERCEL_AUTOMATION_BYPASS_SECRET`.
- **Memory.** `img.decode()` on every image asks Chromium to decode all the photos at once. At 12 MP each that is about 48 MB of pixels per photo.

## 3. Vercel Function limits that matter here

| Fact | Source | Checked |
| --- | --- | --- |
| **Memory.** "Hobby: 2 GB, Pro and Ent: 4 GB". Default "2 GB / 1 vCPU"; Pro maximum "4 GB / 2 vCPU". | [Functions limits](https://vercel.com/docs/functions/limitations) | 2026-10-06 |
| **Duration (fluid compute).** Hobby "300s default and maximum"; Pro and Enterprise "300s default, 800s maximum, and 1800s extended maximum Beta". Over the limit: `504 FUNCTION_INVOCATION_TIMEOUT`. | [Functions limits](https://vercel.com/docs/functions/limitations) | 2026-10-06 |
| **Bundle size.** "the maximum uncompressed size is **250 MB**"; "Large functions" up to 5 GB in beta (requires fluid compute with Active CPU). | [Functions limits](https://vercel.com/docs/functions/limitations) | 2026-10-06 |
| **Body size.** "The maximum payload size for the request body or the response body of a Vercel Function is **4.5 MB**", error `413: FUNCTION_PAYLOAD_TOO_LARGE`. Vercel's guidance: upload straight from the browser to storage; for responses, "consider streaming your function responses" (they "don't have this limit") or store the file and return "a pre-signed URL". | [Functions limits](https://vercel.com/docs/functions/limitations), [Bypass the 4.5 MB limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) | 2026-10-06 |
| **Instance sharing.** "multiple invocations can share the same physical instance"; Vercel "prioritize[s] existing idle resources before allocating new ones". There is no guarantee that a second request reaches the same instance. | [Fluid compute](https://vercel.com/docs/fluid-compute) | 2026-10-06 |
| **Price (Pro, iad1).** Active CPU "$0.128" per hour; provisioned memory "$0.0106" per GB-hour; invocations "$0.60 per million". Hobby includes 4 CPU-hours and 360 GB-hours. Example: 30 s of CPU and 40 s alive at 4 GB costs about $0.0011 + $0.0005, roughly **$0.002 per export**. | [Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing) | 2026-10-06 |
| **Hobby is non-commercial.** "the Hobby plan restricts users to non-commercial, personal use only." Pro developer seats are "$20 per user / month". | [Hobby plan](https://vercel.com/docs/plans/hobby) | 2026-10-06 |
| **Deployment protection bypass.** Header `x-vercel-protection-bypass: <secret>`; Vercel sets "`VERCEL_AUTOMATION_BYPASS_SECRET`" in deployments; `x-vercel-set-bypass-cookie: true` makes follow-up requests carry the bypass as a cookie. | [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) | 2026-10-06 |
| **Vercel's own Puppeteer guide** uses `puppeteer-core` and `@sparticuz/chromium-min` "to address the function bundle size limitation (250MB)" (published 2025-11-03, updated 2025-11-10). | [Deploying Puppeteer on Vercel](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel) | 2026-10-06 |
| **`@sparticuz/chromium`.** Latest `153.0.0` (npm, 2026-09-11). `-min` leaves out the browser binary; you give `executablePath()` "an HTTPS URL to a hosted pack tar file" that it extracts to `/tmp` on first use. The v153 `pack.x64.tar` release asset is **70.1 MB** (`Content-Length: 70051840`). "at least 512 MB of RAM… 1600 MB (or more) is recommended". Ships Open Sans only; more fonts go in `/tmp/fonts` and similar folders. Uses `headless_shell`. | [README](https://github.com/Sparticuz/chromium), npm, release asset HEAD | 2026-10-06 |
| **Version pairing.** `puppeteer-core` latest `25.12.0` pairs with Chrome for Testing 154.0.8037.57; `25.11.0` pairs with 153.0.8010.36, which matches `@sparticuz/chromium` 153. The prototype pins 24.38.0 with 143.0.4. | [Puppeteer supported browsers](https://github.com/puppeteer/puppeteer/blob/main/docs/supported-browsers.md), npm | 2026-10-06 |

Reading: one export fits comfortably in a Pro function (4 GB, up to 800 s) once photos are slot-sized, and Hobby's 2 GB may be enough. The two hard walls are the **4.5 MB body caps** in each direction, which the V1 design avoids by sending an id in and a storage URL out. Downloading 70 MB on a cold start is a one-off per instance. Host the pack somewhere you control, such as Vercel Blob, Supabase Storage or the deployment's own static files, rather than relying on GitHub at runtime.

## 4. The options compared

| Option | Real text and CSS | Cost (list, checked 2026-10-06) | Limits and catches | Source |
| --- | --- | --- | --- | --- |
| **Headless Chromium in a Vercel Function** (prototype; recommended) | Yes; the same engine and CSS as the preview | Function compute only, about $0.002 per export on Pro (section 3) | 4.5 MB body caps; 70 MB pack downloaded on cold start; 2–4 GB memory; 300–800 s | sections 3 and 5 |
| **Cloudflare Browser Rendering** (/pdf REST endpoint) | Yes (Chromium; `pdfOptions` passed to Puppeteer) | Workers Paid: "10 hours per month, then $0.09 per additional hour"; 10 concurrent browsers, then $2.00 each | Takes `url` or `html`; supports `setExtraHTTPHeaders`, `cookies`, `gotoOptions.waitUntil`; "accepts request bodies up to 50 MB" | [Pricing](https://developers.cloudflare.com/browser-rendering/pricing/), [/pdf](https://developers.cloudflare.com/browser-rendering/rest-api/pdf-endpoint/) |
| **Browserless** (hosted Chromium) | Yes | Free 1k units; Prototyping $25/mo (annual) for 20k units, $0.0020 overage; Starter $140/mo for 180k. "A 'Unit' is a block of browser time of up to 30 seconds" | Prototyping: 15-minute sessions, 10 concurrent | [Pricing](https://www.browserless.io/pricing) |
| **PDFShift** (hosted Chromium) | Yes | Starter $9/mo for 500 credits; Boost $24 for 2,500. "One credit is consumed per document, counted per 5 MB of generated data" | Paid plans: "timeout up to 15 minutes", "no file size limit" | [Pricing](https://pdfshift.io/pricing/) |
| **DocRaptor** (Prince engine, not Chrome) | Real text; CSS rendered by Prince, so the layout differs from the browser preview | Basic $15/mo for 125 docs (12¢ overage); Professional $29 for 325 (9¢); Premium $75 for 1,250 (6¢) | A second rendering engine to keep in step with the preview | [Plans](https://docraptor.com/signup), [Overage](https://help.docraptor.com/en/articles/1273806-how-overage-works) |
| **Gotenberg on your own server** (Docker; Chromium and LibreOffice) | Yes (Chromium) | Server cost only (not priced here) | Fields `waitForSelector`, `extraHttpHeaders`, `generateTaggedPdf`, `generateDocumentOutline`; `optimizeImages` re-encodes images to JPEG (`imageQuality`, default 80); separate `/forms/pdfengines/optimize` route. Docker tag `8.37.0` dated 2026-09-11 | [Convert URL](https://gotenberg.dev/docs/convert-with-chromium/convert-url-to-pdf), [Optimize](https://gotenberg.dev/docs/manipulate-pdfs/optimize-pdfs), Docker Hub |
| **Client-side `window.print()`** | Yes, in the user's browser | Free | No file on the server to store or email; image size, fonts and page size depend on the device; the user picks "Save as PDF" or the iOS share sheet. `@page size` is supported in Chrome 15+, Firefox 95+ and Safari **18.2+**; `page-orientation` is not supported in Safari | [BCD @page](https://github.com/mdn/browser-compat-data/blob/main/css/at-rules/page.json) |
| **PDF libraries** (`pdfmake` 0.3.11, `jspdf` 4.2.1, `@react-pdf/renderer` 4.9.0, `pdfkit` 0.20.2, `typst.ts` 0.7.0; `pdf-lib` 1.17.1 last published 2021-11-06) | Real text, but the CSS is **not** used: each layout is rebuilt in the library's own model | Free | Two renderers to keep in step (preview and PDF); `@react-pdf` is React-only | npm registry, 2026-10-06 |

## 5. How Chrome writes images and fonts into the PDF

| Fact | Source | Checked |
| --- | --- | --- |
| **JPEG passthrough.** `serialize_image` first tries `do_jpeg` on `img->refEncodedData()`. That copies the original bytes as `DCTDecode` only if the decoded size equals the drawn image size, the colour type is `kYUV_Color` or `kGray_Color`, and the EXIF origin is `kTopLeft_SkEncodedOrigin`. Otherwise it decodes to pixels. | [Skia `SkPDFBitmap.cpp`](https://github.com/google/skia/blob/main/src/pdf/SkPDFBitmap.cpp) | 2026-10-06 |
| **Fallback is lossless.** After decoding, Skia JPEG-encodes only "if `encodingQuality <= 100` and the image is opaque"; otherwise `do_deflated_image`. `fEncodingQuality` defaults to **101**, "which corresponds to lossless encoding". | [Skia `SkPDFBitmap.cpp`](https://github.com/google/skia/blob/main/src/pdf/SkPDFBitmap.cpp), [`SkPDFDocument.h`](https://github.com/google/skia/blob/main/include/docs/SkPDFDocument.h) | 2026-10-06 |
| **Chrome keeps that default.** `printing::MakePdfDocument` sets creator, title, dates, `fRasterDPI = 300.0f`, the tag tree and the outline, and never sets `fEncodingQuality`. Chrome's Skia build includes the JPEG codec ("Blink includes Skia's JPEG encoder and decoder which pdf uses"), so passthrough is available. | [Chromium `metafile_utils.cc`](https://github.com/chromium/chromium/blob/main/printing/common/metafile_utils.cc), [Chromium `skia/BUILD.gn`](https://github.com/chromium/chromium/blob/main/skia/BUILD.gn), [Skia `SkPDFDocument.cpp`](https://github.com/google/skia/blob/main/src/pdf/SkPDFDocument.cpp) | 2026-10-06 |
| **Consequences (from the rows above).** A 4K JPEG shown in a 2-inch slot is embedded at full 4K. An iPhone portrait JPEG (EXIF orientation 6), a WebP (which Supabase returns by default to clients that accept it) or a PNG is embedded losslessly. Nothing is downsampled. Whether Chrome's print path always hands Skia the encoded bytes is not documented; check with `pdfimages -list` on a test export. | inference from the sources above | 2026-10-06 |
| **Fonts are subset.** Skia's `fSubsetter` defaults to `kHarfbuzz_Subsetter`, and TrueType fonts are subset when `can_subset`. | [Skia `SkPDFDocument.h`](https://github.com/google/skia/blob/main/include/docs/SkPDFDocument.h), [`SkPDFFont.cpp`](https://github.com/google/skia/blob/main/src/pdf/SkPDFFont.cpp) | 2026-10-06 |
| **Variable and CFF fonts become Type 3.** `SkPDFFont::FontType` returns `kOther_Font` ("force Type3 fallback") when the font is flagged `kVariable_FontFlag` (FreeType sets it when `FT_HAS_MULTIPLE_MASTERS`), for CFF-outline OpenType, and for unembeddable fonts. Type 3 fonts still get a `ToUnicode` map, so text stays selectable. | [Skia `SkPDFFont.cpp`](https://github.com/google/skia/blob/main/src/pdf/SkPDFFont.cpp), [`SkFontHost_FreeType.cpp`](https://github.com/google/skia/blob/main/src/ports/SkFontHost_FreeType.cpp) | 2026-10-06 |
| **Links survive.** Skia's `SkAnnotateRectWithURL` "associat[es] the specified URL with the specified rectangle"; Chrome uses it for `<a href>`, so links in the print route become clickable PDF links. | [Skia `SkAnnotation.h`](https://github.com/google/skia/blob/main/include/core/SkAnnotation.h) | 2026-10-06 |
| **Puppeteer `PDFOptions`.** `tagged` defaults to `true` ("Generate tagged (accessible) PDF", experimental); `outline` defaults to `false` (document bookmarks, experimental); `waitForFonts` defaults to `true`; `timeout` 30,000 ms; `printBackground` defaults to `false`; `preferCSSPageSize` defaults to `false`. `page.createPDFStream()` returns a `ReadableStream`. | [PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions), [createPDFStream](https://github.com/puppeteer/puppeteer/blob/main/docs/api/puppeteer.page.createpdfstream.md) | 2026-10-06 |

In repo terms: `packages/ui/src/lib/css/1-theme/fonts.css` imports `@fontsource/inter` (static) and the variable Asta Sans and JetBrains Mono. If the report uses either variable family, its glyphs become Type 3 in the PDF.

## 6. Keeping the file small

**Feed Chromium the right pixels.** These are the slot boxes from `projects.utils.ts` on an 8.5in page with 28 px side padding (7.92in of content) and 0.125in of frame padding. They assume 4:3 photos fitted with `object-contain`:

| Slot | Photo area on paper (landscape 4:3) | Pixels at 150 / 200 / 300 ppi | Megapixels at 200 ppi |
| --- | --- | --- | --- |
| 1-up | 5.93 × 4.45 in | 890×668 / 1187×890 / 1780×1335 | 1.06 |
| 1-up portrait (3:4) | 4.01 × 5.35 in | 602×803 / 803×1070 / 1204×1605 | 0.86 |
| 2-up | 2.93 × 2.20 in | 440×330 / 587×440 / 880×660 | 0.26 |
| 4-up | 2.20 × 1.65 in | 330×248 / 440×330 / 660×495 | 0.145 |

**Rough sizes for 100 photos.** These are estimates, not measurements. They assume about 1.5 bits per pixel for a detailed field photo at JPEG quality 80 with 4:2:0 chroma (plausible range 1 to 2.5), plus about 1 MB for text pages, subset fonts and logos:

| Layout of the 100 photos | Pages | Images | PDF, about |
| --- | --- | --- | --- |
| Originals embedded (12 MP JPEGs, about 2–5 MB each; the prototype today) | 25–100 | 200–500 MB | **300 MB** |
| All 4-up, 200 ppi | 25 | 100 × 27 KB | **3–4 MB** |
| All 2-up, 200 ppi | 50 | 100 × 49 KB | **5–6 MB** |
| 20 1-up and 80 4-up, 200 ppi | 40 | 4.0 + 2.2 MB | **6–8 MB** |
| All 1-up, 150 ppi | 100 | 100 × 110 KB | **11–12 MB** |
| All 1-up, 200 ppi | 100 | 100 × 200 KB | **20–21 MB** |
| All 1-up, 300 ppi | 100 | 100 × 450 KB | **45 MB** |
| Slot-sized but sent as WebP or rotated JPEG (stored losslessly by Skia) | any | about 5–10× the JPEG rows | **15–200 MB** |

Mail limits the result must clear:

| Fact | Source | Checked |
| --- | --- | --- |
| Gmail personal: "the limit is 25 MB"; above it, "Gmail automatically removes the attachment and adds it as a Google Drive link". | [Gmail help](https://support.google.com/mail/answer/6584) | 2026-10-06 |
| Exchange Online: "The default maximum message size for Microsoft mailboxes is 35 MB for sending and 36 MB for receiving"; messages leaving Microsoft "are subject to an additional 33% translation encoding increase"; Outlook for iOS and Android 33 MB. | [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits) | 2026-10-06 |

Base64 encoding adds about a third, so a 15 MB PDF becomes about 20 MB on the wire, which is under every limit above. A practical rule for V1: **4-up and 2-up at 200 ppi, 1-up at 150 ppi by default**, with a "print quality" switch (200–300 ppi) for reports meant for paper. Show the estimated size before export.

**Producing those JPEGs.** Supabase transformations take `width`/`height` "between 1-2500", `quality` 20–100 (default 80), and choose the output format automatically ("Storage will automatically find the best format supported by the client", i.e. WebP) unless you set `format: 'origin'`. HEIC is accepted as input but "cannot be returned as output" ([Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations), checked 2026-10-06). Two consequences:

- `format: 'origin'` is required, or Chromium receives WebP and Skia stores it losslessly.
- An HEIC original cannot be the source for `origin`.

The clean answer is one stored **print derivative** per photo: JPEG, long edge 2,500 px (Supabase's own ceiling), quality about 85, with EXIF orientation applied to the pixels. Make it when the photo is uploaded. `createImageBitmap` applies EXIF orientation by default and `convertToBlob('image/jpeg')` writes no EXIF (see the media research, 2026-10-05). The print route then asks Supabase for that derivative at the slot's pixel size with `format: 'origin'`. This adds one item to the derivative list in #125 (thumbnail, preview, **print**, original). Media transformations are billed per distinct origin image per month, so the export adds no transformation cost for images the preview already transformed.

**What not to rely on.** Do not lower `deviceScaleFactor`: it does not affect embedded images. Do not use CSS `image-rendering`. Do not size an image in CSS: Skia embeds the source pixels, whatever size the box is.

## 7. Post-compression tools, if a file still runs large

| Tool | What it does | Catches | Source | Checked |
| --- | --- | --- | --- | --- |
| Ghostscript `pdfwrite` (docs 10.09.0) | `-dPDFSETTINGS=/screen` (72 dpi), `/ebook` (150 dpi), `/printer` (300 dpi); only `/screen` and `/ebook` downsample by default (threshold 1.5×); fonts subset by default | Re-interprets the whole PDF: "any part of the original input which does not actually make marks on the page (such as hyperlinks, bookmarks…) will normally not be present", though the interpreter "tr[ies] to preserve" them; ignores structure pdfmarks. Licence: AGPLv3, and "You cannot deploy our open-source as part of a server-based application or service, without disclosing your own application's full source code" | [Vector devices](https://ghostscript.readthedocs.io/en/latest/VectorDevices.html), [Artifex licensing](https://artifex.com/licensing) | 2026-10-06 |
| qpdf | `--optimize-images` "recompress[es] all images that are not compressed with DCT (JPEG) using DCT compression as long as doing so decreases the size"; `--recompress-flate`, `--object-streams=generate`, `--linearize` | Does not downsample (resolution unchanged); a safe structural tidy-up that keeps links and tags | [qpdf CLI](https://qpdf.readthedocs.io/en/stable/cli.html) | 2026-10-06 |
| Gotenberg optimize | "Reduces the file size… by re-encoding their images to JPEG. Text, vectors, fonts, and structure are left untouched", `imageQuality` default 80 | Needs a Gotenberg server; no documented downsampling | [Optimize PDFs](https://gotenberg.dev/docs/manipulate-pdfs/optimize-pdfs) | 2026-10-06 |

Reading: post-compression mostly repairs mistakes made earlier (lossless images, oversized JPEGs). With slot-sized JPEG inputs it saves little. qpdf with `--optimize-images` is a cheap guard against a stray PNG or WebP, but it needs a binary in the function. Ghostscript is the only one that downsamples, and it brings a licence question and a risk to links and tags.

## 8. Video in a PDF

| Fact | Source | Checked |
| --- | --- | --- |
| Adobe: "All multimedia that are H.264 compliant can be played back in Adobe Reader 9 and later"; Acrobat Pro embeds MP4, MOV, M4V and 3GP with H.264. No other viewer's support is documented by its vendor. (The Adobe page refused a direct fetch with 403; quoted from Adobe's own search snippet.) | [Adobe: Add audio, video and interactive objects](https://helpx.adobe.com/acrobat/current/rich-media.html) | 2026-10-06 |
| Chrome's `page.pdf()` has no way to embed media; a `<video>` element prints as a still picture. Links print as clickable areas (section 5). | Skia and Puppeteer sources above | 2026-10-06 |
| Cloudflare Stream thumbnails: `https://customer-<code>.cloudflarestream.com/<VIDEO_UID>/thumbnails/thumbnail.jpg?time=1s&height=270`, with `time`, `height` (default 640) and `width` parameters. | [Stream thumbnails](https://developers.cloudflare.com/stream/viewing-videos/displaying-thumbnails/) | 2026-10-06 |

What V1 does: each video in the report prints as a **poster frame** (from Stream, or a frame grabbed at upload with mediabunny if video stays in Supabase only), sized and encoded like a photo. On top of it go a play badge, the duration and capture time, and an `<a href>` to a **durable Trident URL** (for example `/r/<report>/media/<id>`) that checks access and then redirects to a fresh signed URL. A small QR code of the same URL serves paper copies. Embedding the video file would also undo every size saving above.

## 9. Suggested V1 shape (for the decision ticket)

1. The client calls a remote function `exportReportPdf(reportId)`. The server checks permission and creates a short-lived signed print token (HMAC of report id and expiry).
2. A Vercel Function (Node, Pro, 3–4 GB, `maxDuration` 300) launches Chromium from a self-hosted `@sparticuz/chromium-min` pack. It sets `x-vercel-protection-bypass` from `VERCEL_AUTOMATION_BYPASS_SECRET` on preview deployments and calls `page.goto('/print/<reportId>?t=<token>', { waitUntil: 'networkidle0' })`.
3. The print route (`ssr = true`, `csr = false`) loads the report from Postgres and renders the same report component as the preview. Image URLs are signed Supabase transform URLs of the print derivative at slot size with `format: 'origin'`. Fonts are static.
4. `page.pdf({ printBackground: true, preferCSSPageSize: true, tagged: true, outline: true })`, then upload to a private `exports/` bucket and return a signed URL. Optionally store the size and a hash for the "email it" step.
5. If Chromium in a Vercel Function proves too slow or too heavy, swap step 2 for Cloudflare Browser Rendering or Browserless pointed at the same print URL; nothing else changes.

## Open questions

- **Measure it.** Export one real 100-photo report through the V1 path. Record the time on Pro with 2 GB and with 4 GB, peak memory, and the PDF size. Run `pdfimages -list` to confirm that each image is `jpeg` at slot size, not `image` (Deflate) at 4K. The section 6 figures are arithmetic until then.
- **Passthrough in practice.** Does Chrome's print path hand Skia the original encoded JPEG every time (the precondition for passthrough), or does it sometimes give decoded pixels, for example for images it downscaled when decoding? Only a test export answers it.
- **Supabase output details.** Does a transformed `format: 'origin'` JPEG come back baseline or progressive, YCbCr, with orientation applied? Does `quality` behave as expected? Supabase does not document EXIF orientation handling; the print derivative sidesteps it, but confirm with one portrait iPhone photo.
- **Which Vercel plan does Trident run on?** Hobby forbids commercial use and caps memory at 2 GB and duration at 300 s; this design assumes Pro.
- **Who receives the PDF?** If recipients are outside the organization, the video links and any "view online" link need a share token or a public report page. That depends on ADR 0003's Guest rules.
- **Fonts.** Which fonts does the V1 report actually use? If Asta Sans or JetBrains Mono, are static instances available under their licences, and are the report fonts shipped in the print route only?
- **Print quality setting.** Should 1-up photos default to 150 ppi (about 11 MB per 100 photos) or 200 ppi (about 20 MB)? This is Justin's call on how the reports are used: on screen, by email, or printed.
- **Ship qpdf?** Is a qpdf binary in the function (or a Gotenberg optimize pass) worth it as a guard, or is "inputs are always slot-sized JPEGs" enough when enforced by a test?
- **Gotenberg server cost.** Not priced here. Only relevant if the Vercel Function path fails the measurement above.
