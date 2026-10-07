# PDF size proof (#146)

PROTOTYPE. Throwaway code that answers one question; nothing here ships.

**Question.** Does a 100-photo report export to a PDF of 10 MB or less with the photos still printing clean, when each photo is stored the way ADR 0004 says (2048 px WebP, JPEG fallback, metadata copied) and the export gives headless Chromium a JPEG sized to each photo's spot on the page?

**Answer: yes.** Every 100-photo report tested lands between 2.5 and 9.5 MB at the best default setting (200 ppi, JPEG quality 80), except the worst case, 100 photos each filling a whole page, which steps itself down to 150 ppi at quality 70 and lands at 8.5 MB. A 150-photo mixed report lands at 8.0 MB. Chromium copied every slot JPEG into the PDF byte for byte at exactly its slot size (`pdfimages -list`), so what the export makes is what the PDF weighs, and the export can predict the file size to within 0.5 % before Chromium runs.

## Run it

```sh
cd prototypes/pdf-size
pnpm install --ignore-workspace
pnpm photos            # downloads 100 photos and stores them the ADR 0004 way (photos/, gitignored)
pnpm export            # exports every scenario into out/ and prints the measurements
pnpm export -- --naive # embeds the stored WebP as is, to see what not resizing costs
```

`--step=<n>` forces one rung of the ladder; `--sharpen` adds a light unsharp mask. Needs Node 24, `pdfimages` (poppler) and Linux x64: Chromium is `@sparticuz/chromium` 153 with `puppeteer-core` 25.11.0, the build V1 runs in a Vercel Function.

## What it does

1. **Photos** (`fetch-photos.js`). 100 distinct real camera photos (Unsplash, through picsum.photos) at phone size, 4032 × 3024, a third of them portrait. Half the portraits are written the iPhone way (landscape pixels, EXIF Orientation 6), and every file gets camera EXIF. Each is then shrunk as the phone will: orientation applied, 2048 px on the long side, metadata copied, WebP quality 80, every tenth photo a JPEG quality 92 instead (the old-phone fallback). Those 100 files, 33 MB, are the stored photos.
2. **Layout** (`plan.js`). US Letter, 0.5 in margins, a header and a caption line under each photo; 1, 2, 4 and 8-up pages as in the photo repeater prototype (`docs/trident/prototypes/timelog-and-photo/`). The 1-up spot is the whole page, the largest a photo can print, so it is the worst case for size.
3. **Export** (`export.js`). Each photo becomes a baseline JPEG (YCbCr 4:2:0, upright, no metadata) with exactly the pixels its spot needs at the chosen ppi. A local server serves a print page and the JPEGs on one origin; Chromium navigates to it and calls `page.pdf()`, as the V1 print route will.
4. **Size control** (`plan.js`, `chooseStep`). Before Chromium runs, the export adds up the JPEG bytes plus the measured page overhead and walks down a ladder until the total fits under 10 MB: 200 ppi q80, 200 q70, 175 q70, 150 q70, 150 q60, 125 q60, 100 q55. It picks a rung from every fifth photo first (cheap), then encodes all photos once from one rung above that pick and confirms.

## Results

Measured 2026-10-07 in a Linux container pinned to one CPU core (`taskset -c 0`, standing in for a 1 vCPU Vercel Function).

| Report | Pages | Setting chosen | PDF | Make JPEGs | Chromium | Chromium peak memory |
| --- | --- | --- | --- | --- | --- | --- |
| 100 photos, all 1-up (whole page) | 101 | 150 ppi q70 (stepped down 3 rungs) | **8.52 MB** | 55 s | 1.9 s | 215 MB |
| 100 photos, all 2-up | 51 | 200 ppi q80 | **9.48 MB** | 23 s | 1.8 s | 199 MB |
| 100 photos, all 4-up | 26 | 200 ppi q80 | **5.38 MB** | 13 s | 1.8 s | 180 MB |
| 100 photos, all 8-up | 14 | 200 ppi q80 | **2.47 MB** | 9 s | 1.5 s | 171 MB |
| 100 photos, mixed (10 × 1-up, 30 × 2-up, 40 × 4-up, 20 × 8-up) | 39 | 200 ppi q80 | **7.02 MB** | 16 s | 1.6 s | 215 MB |
| 150 photos, mixed (15/45/60/30) | 58 | 200 ppi q70 (one rung down) | **8.01 MB** | 43 s | 1.9 s | 212 MB |
| 100 photos, stored WebP embedded as is | 101 | none | **336 MB** | 0 s | 38 s | 1,644 MB |

The Node process peaked at about 780 MB (sharp and the photo buffers), so an export needs about 1 GB in all: it fits Vercel Hobby's 2 GB. The slowest run took about a minute of the 300 s Vercel allows.

Every slot-JPEG export: `pdfimages -list` shows 100 (or 150) images, all `jpeg`, each exactly the pixel size the plan asked for, at 200 or 150 ppi. In the "as is" export the 90 WebPs came out as `image` (stored losslessly with Deflate, about 3.6 MB each) and the 10 JPEGs at their full 2048 px (about 0.7 MB each); the layout made no difference, because Chromium never shrinks an image.

At 200 ppi q80 the same report goes over 10 MB only when big photos dominate: all 1-up weighs 18.7 MB, 150 mixed photos 10.7 MB. The ladder catches both.

### Sharpness

`sharpness.jpg` is a 2.1 × 1.6 in piece of one whole-page photo, rendered from each PDF at 300 dpi (what a printer sees):

- **200 ppi q80** is the reference. **200 ppi q70** looks the same at print size.
- **150 ppi q70** is a little softer up close; the "MacBook Air" lettering still reads. This is where the worst case lands, and it is the floor for "prints clean".
- **125 ppi q60** shows blocking in flat areas; **100 ppi q55** is clearly soft. Fine on screen, not for paper.
- **Sharpening** after the resize is a touch crisper up close but made the file 11 % bigger, a cost that pushes reports down the ladder sooner. Leave it off.

### Other findings

- **Portrait iPhone photos print upright**, as long as the phone applies EXIF orientation when it shrinks the photo and writes Orientation 1 into the copied metadata. Copying the original Orientation 6 onto already-rotated pixels would turn every iPhone portrait sideways in every viewer.
- **`exifr` cannot read EXIF out of WebP.** The metadata is there (sharp reads it), but `exifr` 7.1.3 does not parse WebP. ADR 0004 already reads time and place on the phone before shrinking, from the original file; keep it that way.
- **Fonts stayed real fonts.** The text embedded as subset TrueType (no Type 3) and is selectable. The test used a static system font; V1's report fonts still need static files for print (#145).
- **Page overhead** (everything but the photos) was 107 to 225 KB: about 95 KB plus 1.3 KB a page.
- **The estimate is exact enough to show before export.** Sample estimates ran about 5 % heavy; the full estimate was within 0.03 MB of the real file every time.

## What this does not prove

- **Real Trident photos.** These are stock camera photos; field photos of holds, decks and cargo may carry more fine texture and weigh more. The ladder absorbs that, but the first real report should be exported once and checked.
- **Vercel itself.** Times come from one pinned core here, not a Function; Chromium was the same build. A Function also downloads the 70 MB Chromium pack on a cold start.
- **Paper.** Sharpness was judged from 300 dpi renders, not printouts.

## For V1

- Keep the ladder and the defaults: start at **200 ppi, quality 80**, step down only to fit 10 MB, and treat anything below **150 ppi** as screen quality (warn before exporting at it).
- Make the JPEGs in the export, from the stored 2048 px photo, before Chromium runs; the sum of their bytes plus the page overhead is the PDF size to within a rounding error. Most of the export's time is decoding the stored WebPs, once per rung tried, which is why the sample pick matters.
- No sharpening, no post-compression (qpdf, Ghostscript): with slot-sized JPEGs there is nothing left for them to win.

The liftable part is `plan.js` (slot geometry, pixels per slot, the ladder). `export.js` and `fetch-photos.js` are the throwaway shell. Photo credits: `photos/credits.json` after `pnpm photos` (Unsplash licence).
