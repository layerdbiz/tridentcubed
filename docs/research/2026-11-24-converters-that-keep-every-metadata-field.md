Converting photos without losing a single metadata field

Observed November 24, 2026. Research for "🔎 app: Find converters that keep every metadata field" ([#281](https://github.com/layerdbiz/tridentcubed/issues/281)) on the map "Act on the team's November feedback" ([#280](https://github.com/layerdbiz/tridentcubed/issues/280)), feeding the build tickets "Keep every metadata field when converting" ([#292](https://github.com/layerdbiz/tridentcubed/issues/292)) and "Convert photos the phone can't read on the server" ([#294](https://github.com/layerdbiz/tridentcubed/issues/294)). It changes nothing in the app. ADR 0004 sets the rule: a converted file carries every metadata field of the file it came from, only Orientation changes, to upright. Sources are the libraries' own READMEs, docs and source code, the WebP container spec, ExifTool's documentation, MDN browser-compat data, WebKit Bugzilla, Vercel's and AWS's docs and the npm registry, each checked on 2026-11-24. Sections 3 and 4 are **measurements**: real sample photos converted in a container with real Chromium, sharp, libheif and ExifTool 13.64, every field compared before and after. The throwaway scripts are in the project's shared files, `281-metadata-converters/`, not in this repo.

Terms used below. **EXIF** is the block a camera writes: time, GPS, exposure, camera model, the maker's own **MakerNotes**, a small thumbnail. Inside a file it is one **TIFF block**, a self-contained run of bytes whose internal pointers count from its own start, so it can be moved between files untouched. **XMP** is a second, text-based block (Adobe's), used by editors and by Google and Apple for extras. The **ICC profile** says which colours the pixel numbers mean (sRGB, Apple's Display P3, Adobe RGB); drop it and a wide-colour photo looks dull, give the wrong one and it looks garish. **IPTC** is the old newsroom caption block (inside a Photoshop **IRB** in JPEG). **Orientation** is the EXIF tag saying how to turn the picture upright. A WebP file is a list of chunks; the extended form starts with a **VP8X** chunk whose flags announce **ICCP**, **EXIF** and **XMP** chunks. A JPEG keeps metadata in **APP segments** (APP1 EXIF and XMP, APP2 ICC, APP13 IPTC), each at most 64 KB. **Carry** is the approach recommended here: copy those blocks byte for byte from the original into the new file.

## Short answer

Recommendation, **high confidence** for the phone (measured end to end in Chromium on nine real cameras' files), **medium** for the server's RAW and TIFF path (ExifTool needs Perl, not yet confirmed on Vercel's functions):

1. **No converter writes metadata; the app carries the blocks itself.** Every encoder that writes metadata rebuilds it and changes fields on the way (section 3). Instead: encode the pixels with whatever the device has, then copy the original's EXIF, XMP and ICC blocks byte for byte into the new file, changing only the two bytes of Orientation. ExifReader, already in the app (MPL-2.0, released every few weeks), finds where each block sits (`includeOffsets`, since 4.54); a small module of our own, about 2 KB gzipped, unwraps them and writes them into a WebP (VP8X, ICCP, EXIF, XMP chunks) or a JPEG (APP1, APP2, APP13). In the tests, every EXIF field (MakerNotes and thumbnail included), every XMP field and the ICC profile came out identical on iPhone, Pixel, Samsung, Nikon and Canon files; only Orientation changed.
2. **Decode without colour conversion.** Browsers convert a photo's colours to sRGB when they decode it. Copy the original's Display P3 or Adobe RGB profile onto those sRGB pixels and the colours shift (measured, section 4). `createImageBitmap(file, { colorSpaceConversion: 'none' })` keeps the pixel numbers as they were, so the copied profile stays true; with it the phone's output matched sharp, the colour-correct reference, to two decimals. Supported since Chrome 58, Safari 15 and Firefox 98.
3. **Safari: jSquash's WebP encoder, the same carry.** Safari cannot write WebP from a canvas and WebKit closed the request as WONTFIX. `@jsquash/webp` (Apache-2.0, Google's libwebp as WebAssembly, 126 KB gzipped) encodes the canvas pixels; the carry is the same. Measured identical to Chrome's own encoder for metadata. The JPEG fallback (ADR 0004) uses the same carry.
4. **Check before sending.** After writing, the phone reads the new file back with ExifReader and compares it with the original. Anything different apart from Orientation means the phone uploads the original untouched and the server converts it, as ADR 0004 already says for files the phone cannot read.
5. **Server, HEIC:** libheif (`libheif-js` WebAssembly, through `heic-decode`) gives the pixels, sharp shrinks and encodes them, and the same carry module copies the HEIC's EXIF, XMP and ICC. Measured: every field kept on iPhone 7 and iPhone XS Max HEICs. libheif is LGPL-3.0; running it on the server is not distribution, shipping it to phones would be. sharp alone cannot help: its prebuilt binaries do not decode iPhone HEIC, and its `keepMetadata()` rewrites fields.
6. **Server, TIFF and camera RAW:** their metadata is not a block that can be lifted out, it is woven into the file's own structure, so the copy has to be rebuilt tag by tag. ExifTool (`-tagsFromFile ORIGINAL -all:all -unsafe -icc_profile -n`) is the most complete tool for that, and LibRaw (`libraw-wasm`, ISC, or the embedded full-size JPEG preview) gives the pixels. ExifTool needs Perl, which Vercel's build image has but its function runtime is not documented to have: the first job of #294 for these formats is a `which perl` in a deployed function.
7. **Some fields have no slot in a WebP at all** (section 6): IPTC, PNG text and density, a second ICC profile that belongs to a HEIC's thumbnail, an HDR gain map, and RAW-only structures. They are rare in survey photos but real. Two ways to keep them: store the original's full field list beside the File, or keep a JPEG for such files. That is Justin's call; it changes #292's scope.
8. **Test every field with ExifTool, before and after** (section 7): dump every field of both files, ignore only what describes the container, require everything else equal apart from Orientation. It caught every problem found here.

## 1. What each format can hold

| Fact | Source | Checked |
| --- | --- | --- |
| **Safari cannot encode WebP.** `toBlob`/`toDataURL` and `OffscreenCanvas.convertToBlob` `type_parameter_webp`: Chrome 50/69, Firefox 96/105, Safari and iOS Safari `false`. WebKit bug 226950, WONTFIX: "the underlying frameworks do not support WebP encoding". An unsupported type falls back to PNG, so check `blob.type`. Every iPhone browser is WebKit. | [BCD canvas](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLCanvasElement.json), [BCD OffscreenCanvas](https://github.com/mdn/browser-compat-data/blob/main/api/OffscreenCanvas.json), [WebKit 226950](https://bugs.webkit.org/show_bug.cgi?id=226950), [HTML spec](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file) | 2026-11-24 |
| **WebP chunk order:** "A 'VP8X' Chunk … An optional 'ICCP' Chunk … An optional 'ANIM' Chunk … Image data. An optional 'EXIF' Chunk … An optional 'XMP ' Chunk". VP8X flags `Rsv I L E X A R`: I = ICC, L = alpha, E = EXIF, X = XMP; canvas width and height are stored minus one in 24 bits; an odd chunk gets one zero padding byte. | [WebP container](https://developers.google.com/speed/webp/docs/riff_container) (RFC 9649) | 2026-11-24 |
| **WebP EXIF starts at the TIFF header** (`II*\0` or `MM\0*`), without JPEG's `Exif\0\0`: `cwebp` strips that prefix, ExifTool warns "Improper EXIF header" when it is there. | [libwebp jpegdec.c](https://github.com/webmproject/libwebp/blob/main/imageio/jpegdec.c), [ExifTool RIFF.pm](https://github.com/exiftool/exiftool/blob/master/lib/Image/ExifTool/RIFF.pm) | 2026-11-24 |
| **WebP and HEIC hold EXIF, XMP and ICC only**, no IPTC: ExifTool "can write EXIF, XMP and ICC_Profile metadata to WEBP images"; ExifReader: WebP, HEIC and AVIF "define no IPTC block of their own". IPTC's modern home is XMP (IPTC Core), which ExifTool maps with `iptc2xmp.args`. | [ExifTool RIFF tags](https://exiftool.org/TagNames/RIFF.html), [ExifReader](https://github.com/mattiasw/ExifReader) | 2026-11-24 |
| **JPEG holds all of them**, in APP segments of at most 64 KB each: an ICC profile is split across numbered APP2 segments; XMP over 64 KB continues in "extended XMP" APP1 segments, a JPEG-only workaround. | measured on the samples; [ExifTool XMP](https://exiftool.org/TagNames/XMP.html) | 2026-11-24 |
| **Phones mostly hand the page a JPEG.** iOS's photo picker converts to JPEG unless the surveyor picks "Current"; an in-app camera shot on iPhone arrives with no EXIF; Android Chrome cannot decode HEIC and hides photo GPS from apps by default. | [2026-10-05 media research](2026-10-05-media-optimisation-and-metadata.md) section 1 | 2026-10-05 |

## 2. The candidates

| Candidate | Where it runs | Licence, size, upkeep | What it does with metadata |
| --- | --- | --- | --- |
| `canvas.toBlob` (today) | phone | built in | drops everything |
| **Carry**: ExifReader + our own writer | phone and server | ExifReader 4.55.1 (2026-11-23), MPL-2.0, already in the app; the writer is ours, about 2 KB gzipped | copies EXIF, XMP and ICC byte for byte; only Orientation changes (section 3) |
| `@jsquash/webp` | phone (Safari) | 1.5.0 (2025-05-12), Apache-2.0; SIMD wasm 346 KB, 126 KB gzipped; no release since May 2025, but it is libwebp, which is stable | writes pixels only; the carry adds the metadata |
| sharp `keepMetadata()` | server | 0.35.5 (2026-09-27), Apache-2.0; prebuilt libvips 8.18.7 (LGPL-3.0) | rebuilds EXIF through libexif: sets PixelX/YDimension to the new size (measured); by its source, also drops tags libexif does not know and rewrites Canon, Olympus, Fuji and Pentax MakerNotes; no IPTC in WebP; lost a PNG's XMP in the test. Prebuilt: no HEVC HEIC, no RAW, no JPEG XL |
| ExifTool `-tagsFromFile` | server (Perl) | 13.64 via `exiftool-vendored` 39.4.0 (2026-11-16), MIT wrapper, 22 MB; needs a system `perl` | the reference reader; as a copier it rewrites each tag: tiny rational drifts, drops the EXIF thumbnail unless asked, adds a few required tags (section 3). The only good option when there is no block to lift (TIFF, RAW) |
| `@uswriting/exiftool` | phone or server (WebAssembly Perl) | 1.0.9 (2025-12-05), Apache-2.0; 25.4 MB wasm | one file per call, no documented way to copy from a second file |
| `wasm-vips` | phone | 0.0.19, "still under early development"; 5.2 MB wasm plus 3.8 MB for HEIF | libvips' rewrites as above; needs COOP and COEP headers (SharedArrayBuffer); no HEVC HEIC, no RAW |
| `node-webpmux` | server | 3.2.1, LGPL-3.0-or-later, Node only (`fs`) | writes raw EXIF, ICC and XMP chunks; the carry module does the same in 60 lines with no licence question |
| `piexifjs` | phone | 1.0.6 (2019), MIT | JPEG EXIF only |
| `libheif-js` / `heic-decode` | server | libheif-js 1.23.5 (2026-10-04), LGPL-3.0, 1.46 MB wasm; heic-decode 2.1.0, ISC | pixels only; the carry reads the HEIC's blocks |
| `libraw-wasm` | server | 1.6.0 (2026-07-02), ISC; LibRaw 0.22.1 (LGPL 2.1 or CDDL), 1.4 MB wasm | pixels and a `metadata()` summary; ExifTool copies the fields |

Sources: the npm registry; [sharp output API](https://sharp.pixelplumbing.com/api-output), [sharp install](https://sharp.pixelplumbing.com/install), [sharp-libvips build](https://github.com/lovell/sharp-libvips/blob/main/build/posix.sh), [libvips exif.c](https://github.com/libvips/libvips/blob/master/libvips/foreign/exif.c), [libexif exif-data.c](https://github.com/libexif/libexif/blob/master/libexif/exif-data.c), [jSquash webp_enc.cpp](https://github.com/jamsinclair/jSquash/blob/main/packages/webp/codec/enc/webp_enc.cpp), [ExifTool FAQ](https://exiftool.org/faq.html), [exiftool-vendored install](https://github.com/photostructure/exiftool-vendored.js/blob/main/docs/INSTALLATION.md), [@uswriting/exiftool](https://github.com/6over3/exiftool), [wasm-vips](https://github.com/kleisauke/wasm-vips), [node-webpmux](https://github.com/ApeironTsuka/node-webpmux), [libheif metadata header](https://github.com/strukturag/libheif/blob/master/libheif/api/libheif/heif_metadata.h), [LibRaw-Wasm](https://github.com/ybouane/LibRaw-Wasm); all checked 2026-11-24.

## 3. Measured: every field before and after

Each sample was converted, then both files were read with ExifTool 13.64 (`-a -u -G1 -n -b`, every field in every group, binary fields compared by hash) and compared group by group. Groups that describe the file itself (its size, container, encoder, JFIF header) and pointers into the file are left out; everything else must be equal. "Kept" counts equal fields; "Lost" counts fields gone from the output.

Phone pipeline, carry, in real Chromium (Chrome's WebP, jSquash's WebP and Chrome's JPEG gave the same counts unless noted), decoding with `colorSpaceConversion: 'none'`:

| Sample | Fields compared | Kept | Changed | Lost |
| --- | --- | --- | --- | --- |
| iPhone 7 JPEG (Apple MakerNotes, GPS, thumbnail) | 78 | 78 | 0 | 0 |
| Google Pixel JPEG (Google MakerNotes, GPS, ICC) | 114 | 114 | 0 | 0 |
| Nikon COOLPIX JPEG (MakerNotes, GPS, XMP) | 109 | 109 | 0 | 0 |
| Canon EOS 40D JPEG (ICC sRGB) | 86 | 86 | 0 | 0 |
| JPEG turned 90° (Orientation 6, Generic RGB ICC) | 62 | 61 | Orientation 6 → 1 | 0 |
| Samsung Galaxy S7 JPEG (XMP, Photoshop block) | 25 | 24 (JPEG: 25) | 0 | WebP: 1, `Photoshop:IPTCDigest` |
| PNG with XMP | 2 | 2 | 0 | 0 |
| PNG with a Display P3 ICC | 29 | 26 | 0 | 3, PNG pixel density (`pHYs`) |
| ExifTool's own test file, dozens of rare blocks | 397 | 94 (JPEG: 141) | 0 | WebP 303, JPEG 256: blocks no WebP can hold (CIFF, FlashPix, IPTC, Photoshop, and others) |

Server pipeline, HEIC through libheif, sharp and the same carry:

| Sample | Fields compared | Kept | Changed | Lost |
| --- | --- | --- | --- | --- |
| iPhone 7 HEIC | 108 | 108 | 0 | 0 |
| iPhone XS Max HEIC | 133 | 107 | 0 | 26: the second ICC profile, which belongs to the HEIC's thumbnail image, not the photo |
| Third-party HEIC (sRGB ICC) | 43 | 43 | 0 | 0 |

Decoding a 12 MP HEIC took 0.8 to 1.3 s and shrinking, encoding and carrying 0.5 to 0.6 s, at 250 to 390 MB of memory, well inside a Vercel function (2 GB by default on Pro). jSquash encoded a 2048 × 1536 WebP in 0.54 s in desktop Chromium; a phone will be slower. Carrying the blocks took 2 to 26 ms.

The other converters, same samples:

| Converter | What changed |
| --- | --- |
| sharp `keepMetadata()` | `ExifImageWidth/Height` set to the new size on every file; `ExifVersion` and `FlashpixVersion` added where missing; a PNG's XMP dropped and 11 EXIF fields invented; iPhone HEIC refused ("bad seek"); a DNG lost 273 fields; CR2 and NEF refused |
| ExifTool `-tagsFromFile -all:all -unsafe -icc_profile` | without `-n`, rounded values (iPhone FocalLength 4.25 → 4.2, Pixel ExposureTime, GPS longitude); with `-n`, still small drifts in re-encoded fractions (ShutterSpeedValue, GPSAltitude); the EXIF thumbnail dropped; `GPSVersionID`, `ExifVersion`, `XMPToolkit` added or replaced |
| ExifTool on RAW (metadata only) | CR2: kept 189 fields, lost only the RAW image's own structure (sizes, strips, previews) and 2 Canon fields; NEF: lost 6 IPTC fields and 80 Nikon Capture edit fields as well; DNG: lost the 147 Canon MakerNotes it holds in its private data |

Every WebP and JPEG the carry wrote passed `exiftool -validate` with the same or fewer warnings than its original; every remaining warning was the camera's own.

## 4. Measured: colours

Each output and its original were shown as sRGB through their own ICC profiles and compared pixel by pixel (mean difference per channel, 0 to 255). An sRGB photo with no profile scores about 3.9 here from JPEG and WebP compression alone; sharp, which colour-manages correctly, is the reference.

| Sample | Browser default decode, profile carried | `colorSpaceConversion: 'none'`, profile carried | sharp |
| --- | --- | --- | --- |
| JPEG, Generic RGB profile | 15.1 (visibly wrong) | 3.4 | 3.4 |
| JPEG, Display P3 profile | 8.3 (wrong) | 4.3 | 4.3 |
| PNG, Display P3 profile | 7.4 (wrong) | 5.7 | 5.7 |
| JPEG, no profile | 3.9 | 3.9 | 3.9 |

The default decode turns the pixels into sRGB, and then the carried profile tells every viewer they are P3 or Adobe RGB. With `'none'` the pixels keep the original's numbers and the original's profile stays true. `'none'` still turns the photo upright (`imageOrientation` is a separate option, default `from-image`). Safari 15+ supports the option ([BCD createImageBitmap](https://github.com/mdn/browser-compat-data/blob/main/api/_globals/createImageBitmap.json)); a real iPhone check belongs in #292's acceptance.

## 5. Suggested shape for the build tickets

**#292, on the phone**, one module beside `files.utils.ts`, test first:

1. Read the picked file once with ExifReader (`expanded`, `includeOffsets`, `async`: the PNG ICC profile is compressed and only found in async mode). The same read gives the time and place the app already stores.
2. Unwrap each block: JPEG blocks start at the segment marker (`Exif\0\0`, the XMP namespace, `ICC_PROFILE` with its sequence numbers, `Photoshop 3.0`); PNG blocks at the chunk length (`eXIf`, `iTXt` XMP, `iCCP` zlib-compressed: `DecompressionStream('deflate')`); WebP at the chunk header; a HEIC's EXIF item starts with a 4-byte offset to the TIFF header, its ICC and XMP are bare. Treat every offset as untrusted and clamp it to the file's length.
3. Set IFD0 Orientation to 1 in place (two bytes), and `tiff:Orientation` in the XMP if it is there (same length). Nothing else changes: `ExifImageWidth/Height` keep the original's size, which is the only record of it once the original is gone.
4. `createImageBitmap(file, { colorSpaceConversion: 'none' })`, shrink to 2048 px, encode: Chrome's `toBlob('image/webp')`, else jSquash, else JPEG.
5. Write the blocks: WebP as VP8X (flags and canvas size from the encoded image), ICCP, the image, EXIF, XMP, dropping any the encoder wrote; JPEG after the encoder's JFIF header, dropping the encoder's own EXIF, XMP and ICC segments so a file never holds two profiles (Chrome's JPEG encoder adds its own sRGB profile).
6. Read the result back and compare with the original; on any difference beyond Orientation, upload the original untouched for the server (#294).

Extended XMP (a JPEG with XMP over 64 KB, such as a Pixel portrait's depth data) has no place in a WebP chunk as is: merge it into the main packet, or send such a file to the server.

**#294, on the server**: HEIC with `heic-decode` (libheif) plus sharp and the same carry module, no ExifTool needed. TIFF and RAW with ExifTool once Perl is confirmed in a deployed function (`which perl`); if it is missing, bundle a relocatable Perl inside the 250 MB function limit. Pixels for RAW from `libraw-wasm`, or from the embedded JPEG preview (`exiftool -b -JpgFromRaw`) where it is full size. The untouched original is deleted only after the same before-and-after comparison passes (ADR 0004: "once the copy checks out").

## 6. Fields a WebP cannot hold

| What | Where it comes from | How common in survey photos |
| --- | --- | --- |
| IPTC and other Photoshop blocks | files edited in Photoshop, Lightroom or a newsroom tool | rare; never straight from a phone camera |
| PNG text (`tEXt`) and pixel density (`pHYs`) | screenshots, exports | occasional (screenshots) |
| A second ICC profile, a depth map, a thumbnail of their own | HEIC secondary images | every iPhone HEIC; they describe pictures the app does not keep |
| HDR gain map (MPF second picture, XMP describing it) | recent iPhone and Pixel photos | likely common (not measured here: no sample had one); it is a second picture rather than a field, and a 2048 px WebP shows the photo in standard range |
| RAW structure and maker data in private blocks | camera RAW, DNG | rare |
| JPEG-only blocks (FlashPix, CIFF, others) | old cameras and tools | rare |

To keep these anyway, either store the original's full field list (ExifReader's on the phone, ExifTool's on the server, a few KB) with the File row, or keep a JPEG instead of a WebP when the original holds a block only JPEG can carry (that covers IPTC and the JPEG-only blocks, not the rest). Neither is built yet; the choice is Justin's.

## 7. How to test every field before and after

- **The check:** `exiftool -j -a -u -G1 -n -b ORIGINAL` and the same for the output. Leave out the groups that describe the file itself (`ExifTool`, `System`, `File`, `Composite`, `JFIF`, `RIFF`, `VP8`, `VP8L`, `VP8X`, `PNG`, `QuickTime`, `Meta`, `MPF0`, `MPImage*`) and pointers (`ThumbnailOffset`, `PreviewImageStart`, `JpgFromRawStart`). Every other field must be present and equal, except `IFD0:Orientation` and `XMP-tiff:Orientation`, which must be 1. Print kept, changed, lost and added; any changed, lost or added field fails. Add `exiftool -validate` and require no warning the original did not have.
- **In the repo:** `exiftool-vendored` as a dev dependency (it brings ExifTool; CI's Ubuntu runners have Perl, and on Windows it ships its own `exiftool.exe`), a test beside the new module that converts each fixture and runs the check. The pure parts (unwrapping, Orientation, chunk writing) also get plain unit tests with ExifReader on both sides, which need no Perl.
- **Colour:** for fixtures with a P3 or Adobe RGB profile, compare both files rendered to sRGB through their own profiles; the difference must stay near the compression floor (section 4).
- **Fixtures:** the repo is public, so the fixtures must carry no client data: a few photos of a blank wall taken for the purpose (iPhone HEIC and JPEG with location on, an Android JPEG, a turned photo, a PNG screenshot), plus public samples where their licence allows.
- **On a real iPhone:** pick a HEIC and a JPEG, upload, download the stored WebP, run the check. This is the only way to confirm Safari's `colorSpaceConversion: 'none'` and the jSquash path on the device.

## 8. Video, later

ffmpeg copies the first input's global metadata by default (`-map_metadata` overrides it), and its Matroska/WebM writer stores every key as a tag, `creation_time` as `DateUTC` ([ffmpeg](https://ffmpeg.org/ffmpeg.html), [matroskaenc.c](https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/matroskaenc.c), source reading). The MOV reader keeps Apple's key names, so `com.apple.quicktime.location.ISO6709` should arrive as a WebM tag; untested. ExifTool can read WebM but not write it ([ExifTool](https://exiftool.org/)), so the same before-and-after check works, the copy itself has to be ffmpeg's. That is the map's "Not yet specified" item for video, not this ticket.

## Open questions

- Is `perl` present in Vercel's Node function runtime? Run `which perl` in a deployed function before #294 builds TIFF and RAW ([Vercel build image](https://vercel.com/docs/builds/build-image) lists Perl for builds only; AWS's minimal AL2023 image for Lambda lists none).
- Does Safari on iPhone honour `colorSpaceConversion: 'none'` for HEIC and Display P3 JPEG the way Chromium does? Test on a device in #292.
- How fast is jSquash on a mid-range iPhone for a 2048 px photo? Measured 0.54 s on desktop Chromium only.
- Keep the fields a WebP cannot hold (section 6) in the File row, as a JPEG, or not at all? Justin's call.
