# Test pictures

Drawn for the tests, so they hold no client data and no real place or person. The metadata was written with
ExifTool 13.64: the same made-up camera, time (2026-05-12 11:30 +02:00), place (25.9 N, 97.5 W), XMP and an sRGB
profile in each, turned 90° (Orientation 6).

- `camera.jpg`: a camera JPEG, big-endian EXIF with a thumbnail, XMP, ICC and IPTC (which only a JPEG can hold).
- `screenshot.png`: a PNG with `eXIf`, `iTXt` XMP, `iCCP`, text and pixel density (which only a PNG can hold).
- `phone.heic`: a HEIC with little-endian EXIF, XMP and ICC, as an iPhone writes them.
- `taken.jpg`, `plain.jpg`: a photo with only a time and place, and one with no metadata at all.
- `canvas*.webp`, `canvas.jpg`: what Chrome's canvas writes (lossy, see-through, lossless, JPEG), its own sRGB
  profile included. `squash*.webp`: what jSquash writes for Safari (the same three).
