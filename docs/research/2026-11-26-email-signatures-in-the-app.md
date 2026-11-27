The facts for moving email signatures into the app

Observed November 26, 2026. Research for "Decide how email signatures move into the app" ([#354](https://github.com/layerdbiz/tridentcubed/issues/354)), so its planning session starts from facts and Justin only has to say yes or no. This file changes nothing in the app or the website and decides nothing. The counts come from the signature Google Sheets (read through Sheetari, the same reads the website makes), the Team records on the trident-dev database (read only), and the public addresses each picture is served at today. No names, addresses or phone numbers are copied here, because this repository is public. The Outlook facts come from Microsoft's own support pages and Microsoft Q&A; where only user reports exist, that is said.

**Built on `next`, November 27, 2026.** Justin asked for it to be built rather than planned. The app now has Email Signature in the menu on the profile picture: everyone sees their own, an Admin picks anyone or a shared mailbox, and Copy copies it for Outlook. It follows section 4 except in one place: the pictures are answered by the app itself, at `<app address>/signature/<name>.png`, not by the website, since the website cannot read the app's file store. Each is made once as a PNG and named by what it was made from, so it never changes under a sent email. The shared addresses under a person, the banners, the social links and the shared mailboxes still come from the Sheets until the app holds them.

**Second round, November 27, 2026.** Justin asked for the signature's photo to be its own, never the profile picture, and always a circle; for each person to pick or upload their photo and their banner, starting from good defaults in Google Drive; and for the pictures to stop running up Vercel. What was built is in section 6.

**Third round, November 27, 2026.** Justin asked for the screen to be built the way the rest of the app is: a project's Page, Edit and Preview. Section 7.

## Short answer

1. **The app already holds nearly every detail a person's signature needs.** 17 of the 19 people with a signature have a Team record, with name, job title, phone, email, LinkedIn link and location filled in. What the app does not have yet: the shared company addresses listed under a person (18 of 19 show one to three), the banner, the company's three social links, and the 7 shared mailboxes' own signatures.
2. **The app's pictures cannot go into a signature as they are.** Every picture address the app has (`/start/...` and `/files/...`) answers only a signed-in member, and the team photos are WebP files. A pasted signature's pictures are loaded by every reader's mail app, signed out, and classic Outlook for Windows does not reliably show WebP. So the app needs one public address per signature picture, answered as PNG or JPEG.
3. **Today's signature pictures all load, and most already sit on our own domain.** Of the 19 people's pictures, 17 are files on tridentcubed.com (4 headshots, 12 people showing the company logo instead of a photo, 1 under `/team`), 1 is on Cloudinary and 1 on Google Drive. All 11 banners are on Google Drive and weigh 100 KB to 1.9 MB each, heavy for an email that carries one in every message.
4. **Outlook keeps one signature per mailbox and copies it to every Outlook.** New Outlook and Outlook on the web store signatures in the Microsoft 365 mailbox, and classic Outlook moves to the same "roaming signatures". So each person pastes once and the signature follows them. Outlook for Android cannot use an HTML signature at all; Outlook for iPhone is unreliable with pictures.
5. **Nothing here needs the database to change yet.** The details that are missing would be added (a new field or a new small list), never moved, and the website pages keep working until the app's are checked.

## 1. Where each signature detail lives today and in the app

The website's signature pages (`apps/site/src/routes/(company)/company/emails/[slug]`) read four sheets. The app's Team table is `apps/app/src/lib/server/db/team.schema.ts`.

| Detail in the signature | Sheet today | In the app's Team record? |
| --- | --- | --- |
| Name, job title | `person` sheet, 19 rows | Yes: `name`, `title` (17 of 19 records have a title) |
| Phone, email | `person` | Yes: `phone` (18 of 19), `email` (19 of 19) |
| LinkedIn link | `person.href` | Yes: `link` (17 of 19) |
| Location | `person.location` | Yes: `location` (18 of 19). The signature does not show it today. |
| Picture | `person.src` | A `photo` (17 of 19), but signed-in only and WebP: section 2 |
| Shared company addresses under the person ("operations@" and the like) | `person.group`, 18 of 19 people, 1 to 3 each | **No** |
| Banner | `person.banner` names one of the `banner` sheet's 11 rows; 17 of 19 people use the same map banner | **No** |
| Company LinkedIn, Facebook, WhatsApp | `social` sheet, 3 rows, the same for everyone | **No** |
| Shared mailboxes' own signatures | `group` sheet, 7 rows, each with the logo and one banner | **No** |

How the two lists match: 17 of the 19 signature people have a Team record. 2 signature people have no Team record, and 1 Team record (the shared admin mailbox) has no signature. One person has two Team records. The WhatsApp number in the `social` sheet differs from the fallback number written in the signature template (`packages/ui/src/lib/components/pages/email/email.svelte`), so the sheet wins today and the fallback is stale.

## 2. Pictures

**What a reader's mail app does with a picture.** A signature pasted with linked pictures keeps each picture as a web address, and the reader's mail app fetches it when the email is opened, with no sign-in. So that address has to answer anyone, and keep answering for as long as old emails are read. Microsoft's own moderators suggest linked (hosted) pictures in signatures because pictures pasted into the message body make Outlook on the web refuse large signatures ([Microsoft Q&A: new signature not working due to images](https://learn.microsoft.com/en-us/answers/questions/5493918/new-signature-is-not-working-due-to-images)).

**Why the app's addresses do not work.** The sign-in guard (`apps/app/src/lib/server/guard.ts`) sends every signed-out request for `/start/...` to the login page and refuses `/files/...` with 401. 15 of the Team records' photos are starting files at `/start/team/...`, 1 is an uploaded file at `/files/...`, 1 is a Google profile picture, 2 have none. The starting team photos are WebP (`apps/app/src/lib/start/team/`), and uploads are stored as WebP by decision #125.

**WebP in Outlook.** Microsoft does not document WebP support in classic Outlook for Windows. Users report WebP logos missing in classic Outlook and showing once they switch to new Outlook ([Microsoft Q&A: webp not showing in Outlook desktop](https://learn.microsoft.com/en-us/answers/questions/4605624/webp-not-showing-in-outlook-desktop-on-windows); [Tech Community: rendering online WebP images in Outlook 365 for Windows](https://techcommunity.microsoft.com/t5/office-365/rendering-online-webp-images-in-outlook-365-for-windows/m-p/3193177)). PNG and JPEG work everywhere, which is what every signature picture is today.

**Today's pictures, checked on November 26, 2026.** Every one answers 200 with a PNG. The 4 headshots on tridentcubed.com are 170 to 240 KB, the logo 32 KB, the Drive headshot 650 KB. The banners, all through Google Drive's `lh3.googleusercontent.com` address, are 100 KB to 1.9 MB; the one most people use is 100 KB. Each Drive picture shows only while its Drive file stays shared "Anyone with the link" (the website's own note in `apps/site/src/lib/email/email.remote.ts`). The signature's icons and footer logo are small PNGs at `tridentcubed.com/emails/...`.

**A known Outlook bug to rule out when testing.** Microsoft lists pictures missing from emails and signatures in classic Outlook after its May 12, 2026 updates, marked fixed in later builds ([Microsoft known issue](https://support.microsoft.com/en-us/support/known-issues/images-are-not-displayed-in-emails-newsletters-or-signatures-in-classic-outlook)). A test on an old build can show missing pictures that have nothing to do with ours.

## 3. Pasting into Outlook

| Outlook | Where the signature is kept | HTML signature with pictures | Source |
| --- | --- | --- | --- |
| New Outlook for Windows | In the Microsoft 365 mailbox, shown on every device | Yes. Users report pasted pictures losing their width and height, so every picture should carry both | [roaming signatures](https://support.microsoft.com/en-us/outlook/outlook-roaming-signatures); [Tech Community: width and height lost](https://techcommunity.microsoft.com/discussions/outlookgeneral/email-signature-images-width-and-height-lost/4143066) |
| Outlook on the web | In the mailbox, the same signature as new Outlook | Yes; pictures pasted into the body can make it refuse to save, linked ones do not | [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5493918/new-signature-is-not-working-due-to-images) |
| Classic Outlook for Windows | Moving to the mailbox ("roaming signatures"), turned on automatically for Microsoft 365 mailboxes; its default signatures are copied up | Yes; WebP unreliable | [roaming signatures](https://support.microsoft.com/en-us/outlook/outlook-roaming-signatures) |
| Outlook for Android | Its own, on the phone | No HTML signature, per Microsoft's answers | [Microsoft Q&A: HTML signature on mobile](https://learn.microsoft.com/en-us/answers/questions/2153189/how-to-get-my-html-outlook-signature-working-on-a) |
| Outlook for iPhone | Its own, on the phone | Only by a workaround; pictures often vanish after saving | [Microsoft Q&A: HTML signature on iOS](https://learn.microsoft.com/en-us/answers/questions/4599052/is-it-possible-to-configure-html-signature-on-ios) |

So the team member's one step is: open their signature in the app, press Copy, paste into Outlook's signature settings on a computer or on Outlook on the web, save. Because the signature roams, that one paste covers new Outlook, Outlook on the web and (once roaming reaches it) classic Outlook. Phones are out of reach of a pasted HTML signature.

The website's template already does what the email apps need: tables, inline styles, and fixed sizes on the icons. Its headshot has a width but no height and its banner neither, which is what the "width and height lost" reports are about.

## 4. What this means for each question on #354

Each line is a recommendation for Justin to accept or change; none is decided.

1. **Who sees what.** Each signed-in staff member sees their own signature; Admins see everyone's and the shared mailboxes'. Guests see none. Nothing here needs a new permission, since Admin and Member already exist (#118).
2. **Where the details come from.** The Team record, for everything it already holds. Added, never moved: the shared company addresses as one new field on the Team record; the banner, the three social links and the 7 shared mailboxes as company settings an Admin edits. One banner for everyone by default (17 of 19 use the same one today), chosen by an Admin.
3. **Pictures that never break.** One public address per signature picture on the website's domain, `tridentcubed.com/emails/...`, where the icons and 4 headshots already live, answered as PNG or JPEG at signature size (headshot 112 px wide, shown at 2x: 224 px; banner about 600 px wide, 1200 px at 2x, under 200 KB). The website answers that address from wherever the picture is kept, so moving storage or databases changes what stands behind the address, never the address in anyone's sent email. A signature never points at dev.app, next.app or Google Drive.
4. **Pasting into Outlook.** Build for new Outlook and Outlook on the web first (one paste roams to both), then test classic Outlook. Which ones the team uses is the one fact only Justin or the team can give. Phones keep a plain one.
5. **Retiring the old way.** The website pages and the Sheets stay until the app's signatures are checked in Outlook, then both go.

## 5. Build tickets this would become

Written only once Justin has answered; listed so the session can end with them.

1. A person's signature in the app from their Team record, with Copy (Admins see everyone's).
2. Permanent public picture addresses for signatures, PNG or JPEG, on tridentcubed.com.
3. Shared addresses, banners, social links and the shared mailboxes' signatures in the app.
4. Retire the website's signature pages and the signature Sheets.

## 6. Photos, banners and Vercel use (November 27, 2026)

**What the pictures cost.** Over the 30 days to November 27, 2026, the website project answered about 1.29 million requests, and about 1.06 million of them (82%) were signature pictures under `/emails`, `/team` and `/branding`, about 8.6 GB sent. One banner alone, 1.1 MB, was 6.2 GB of it. Three things multiplied the count: every picture answers `cache-control: public, max-age=0, must-revalidate`, so a mail app asks again each time an email is opened; `tridentcubed.com` answers every picture with a 308 redirect to `www.tridentcubed.com`, two requests per picture; and each signature holds about ten pictures (photo, three contact icons, footer logo, three social icons, banner, BBB logo). On the current Pro plan these requests fall within its included use, but they are most of what the website is asked for.

**What the app does now.**

1. Every picture a signature shows, the website's icons and logos too, is copied once into the files bucket and answered at `<app address>/signature/<name>.png`: one request, no redirect, `public, max-age=31536000, immutable`, and answered from Vercel's cache after the first (checked on next.app: `x-vercel-cache: HIT`). Mail apps that keep pictures keep these for a year, and the name changes whenever the picture does.
2. Each is made small at twice its shown size, photos and banners in 256 colours, which look the same at that size: a photo 224 px (about 25 KB, where the website's are 170 to 240 KB), a banner 1200 px wide (the 1.1 MB banner becomes 86 KB), icons as they are.
3. The photo is drawn in a 224 px circle with clear corners. A website signature photo already drawn in its circle (clear corners) keeps its shape.
4. Each person picks their photo and banner on the Email Signature screen, or uploads one; an Admin can for anyone. The picks live in the new `signature` table (one row per Team record, added, nothing moved). The photos offered are their upload, their website signature photo, their photos in the Profile Images folder (by the name the Sheet gives or their first and last names in the file name), and the Trident logo on white or dark. The banners offered are every banner in the Email Banners folder, their upload, or none.
5. Defaults with no pick: the photo on their website signature, else their Profile Images photo, else the Trident logo on white (`profile-500x500.png`); the banner their Sheet row names, else the Trident Cubed map (`trident-cubed-map.png`).

**The website's own pictures.** Signatures already pasted from the website keep pointing at `tridentcubed.com`. `apps/site/vercel.json` now lets mail apps keep `/emails/*` and `/team/*-email.png` for 30 days and `/branding/*.png` for 7, once that reaches the live website. The redirect stays until the domain setting changes.

**Further, if needed.** Putting Cloudflare's cache in front of the picture address (the DNS is already on Cloudflare) would take almost every picture request off Vercel; it needs a DNS name and a project domain, so it waits for Justin.

## 7. Page, Edit and Preview (November 27, 2026)

Justin: "we should be using the way that we've already built the app with the ... edit panels and the preview ... We do need to use the canvas though, because we're actually creating something that we need to preview." So the screen has the bottom bar's Page, Edit and Preview, swiped between on a phone, like a project and the Organization.

1. **Page** says what the signature is, whose it is, and how to add it to Outlook.
2. **Edit** is the Project panel's sections: Details (the Team record's Name, Title, Phone and Email, saved as they are typed, the signature following at once; a shared mailbox's come from the Sheet, with a link to it), Photo and Banner (the pickers of section 6). An Admin's picker of whose signature it is sits on top. On a desktop Edit is the floating column with the signature beside it, as on a project.
3. **Preview** is the signature alone on the report's canvas, dragged and zoomed the same way, with the same zoom bar. Copy takes Download's place in it. The gray Edit button and the Preview and Code buttons over the old preview are gone.
4. **Copy** puts the signature on the clipboard as HTML, with its words as plain text beside it, so it pastes styled into Outlook's signature box. The old Copy selected the signature in its frame and copied that, which a browser can refuse when the button press is outside the frame.
5. **Code** (a default; Justin is not sure yet what it is for) is a button in the zoom bar that shows the signature's HTML on the page in its place; Copy then copies the code.
6. The library Email now writes every value as text, so a name or title typed with `<` or `&` shows as typed and cannot add to the signature.
