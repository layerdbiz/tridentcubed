---
status: accepted
---

# Photos are shrunk on the phone, and originals are not kept

Report Generator V1 stores one copy of each photo: the phone shrinks it to at most 2048 px on its long side as a WebP (JPEG when the phone cannot encode WebP), copies every metadata field of the file it was given into it, and uploads that copy to a private Supabase Storage bucket; the file the phone took is never uploaded. A tiny preview for lists rides along, never shown as a photo of its own. Justin expects up to 100 reports a month with about 150 photos each, wants storage and loading kept small, and judged that a 2K copy holding all the metadata is enough; surveyors upload over mobile data, so shrinking before upload moves about 45 MB per report instead of 600 MB and works with no signal. Decided on 2026-10-06 and 2026-10-07 ([#125](https://github.com/layerdbiz/tridentcubed/issues/125)).

The same holds for every conversion the app makes, of a photo now, a video later or any other file: the new file carries every metadata field of the one it came from, and nothing is ever dropped (Justin, 2026-11-24). A photo the phone cannot read, such as HEIC in Chrome on Windows and Android, camera RAW or TIFF, is uploaded untouched and converted on the server, every field copied, and the untouched file is deleted once the copy checks out: the one time a file the phone took reaches storage, and only until it is converted (Justin, 2026-11-24).

## Considered options

- Keep every original and let Supabase image transformations make display sizes: the research's recommendation, dropped because transformations cost $5 per 1,000 photos after the first 100 a month, about $75 a month at 100 reports, the whole platform budget.
- Shrink on the server after upload: simpler phone code, but every full-size photo crosses mobile data and nothing shrinks until there is a signal.
- Keep originals beside the copy: the safe choice, dropped by Justin; photos picked from the library or shot in the Camera app still live in the surveyor's camera roll.

## Consequences

- Detail beyond 2048 px is gone for good, and a later wish for sharper prints cannot be met from stored photos. Two thousand pixels still prints a full page at about 185 ppi.
- Safari cannot write WebP itself, so the app ships its own WebP encoder; the JPEG fallback keeps old phones working.
- A WebP has no slot for a few rare fields (IPTC, a PNG's text and pixel density, RAW maker data), so every photo's File row also keeps the full field list of the file it came from (Justin, 2026-11-24, on [#281](https://github.com/layerdbiz/tridentcubed/issues/281); built on #292).
- The phone reads its copy back before sending it. A photo whose copy lacks any field the copy can hold, or whose field list is too long to keep, goes untouched like a photo the phone cannot read (#292); until the server converts such files (#294) it stays as it came.
- The server converts HEIC with every field checked, then deletes the untouched file (#294). A TIFF keeps its fields woven into the file rather than in blocks, so until ExifTool runs on the server its copy cannot be checked: the copy is swapped in so the photo shows, and the untouched file stays beside it, named on the File row, so nothing is lost. Camera RAW is turned down on the phone with a reason until then.
- Time and place are read on the phone before shrinking and stored with the Attachment, from the file's metadata when it has it, otherwise from the phone's clock and location at that moment, with a flag saying which. In-app camera shots on iPhone arrive with no metadata, so the app writes its own into the file. Location is asked for once and never required.
- The PDF export never embeds stored photos as they are: Chrome copies images into a PDF at full size and stores WebP losslessly, so the export makes a JPEG sized to each photo's spot on the page and lowers quality on its own to keep a report at or under 10 MB.
- An Attachment follows its report's rules for deleting and restoring (ADR 0003), never rules of its own.
- Video is not in V1.
