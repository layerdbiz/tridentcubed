# Historical TODO reconciliation

Date: 2026-09-28. Draft for "Reconcile the historical TODO sources into the archived table and the surviving backlog items" (#50), under the evidence standard decided on "Set the evidence standard for historical TODO reconciliation" (#3).

Sources: `.todo/TODO.csv` (106 rows), `TODO.md`, `.todo/ICONS.md`, `.todo/tailwind-grid-breakout.md`; `.todo/TODO.txt` checked once against the CSV. The originals are untouched; this file is keyed on CSV `ID` with `Task` quoted verbatim.

Buckets: **done** (a code path implements it), **live** (wanted now, not built; Justin's read), **later** (a numbered roadmap phase in `docs/trident/roadmap.md` or an Out of scope line on map #1), **superseded** (a map decision, ADR or CONTEXT entry replaced it), **duplicate** (an open issue or a map fog line holds it), **unclear** (none of the above; Justin decides in one pass). The CSV `Status` column was not used as evidence. Code beats roadmap beats memory; every code citation was checked with grep or ls. Paths are repo-relative; `HomePage` is `apps/site/src/lib/HomePage.svelte`, `(site)/+layout.svelte` is `apps/site/src/routes/(site)/+layout.svelte`, `ui/` is `packages/ui/src/lib/`.

A dependency edge is kept only between two live rows. Every other edge is noted as dropped.

## Bucket counts

| Bucket | CSV rows | Other sources |
| --- | --- | --- |
| done | 46 | 0 |
| live | 4 | 0 |
| later | 42 | 0 |
| superseded | 12 | 1 (`tailwind-grid-breakout.md`) |
| duplicate | 2 | 2 (`TODO.md`, `ICONS.md`) |
| unclear | 0 | 0 |
| **Total** | **106** | **3** |

## `.todo/TODO.csv`

### Header

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 40 | Update header with phone number | done | `(site)/+layout.svelte` Header: `Button href="tel:+14095432725" label="Call Us"` | |

### Hero Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 56 | Use flex grid component for logos | done | `HomePage` 495-525: partners in a `Slider` on sm, a flex row on desktop | Shipped without a flex grid component; that idea is rows 57 and 93. Dep 55 dropped (done). |
| 58 | Create blue gradient effect | done | `HomePage` 455-476: radial primary gradients plus a `to-black` band | Dep 55 dropped (done). |
| 55 | Add trusted by logos section | done | `HomePage` 481-525 `Section id="Partners"`, `apps/site/src/lib/partners/partners.remote.ts` | |
| 34 | Create typewriter text animation | done | `HomePage` 245-253 `typewriter=` on `Text`; `ui/components/atoms/text/text.svelte` 29-35 | Dep 31 dropped (done). |
| 47 | Change background image to video | later | No `<video>` or video component in `apps/site` or `packages/ui`; hero background is `Image bg` (`HomePage` 450) | Dep 43 dropped (unclear). Phase 16 Website Expansion. Justin 2026-09-28: video |
| 48 | Make learn more button play video | later | `HomePage` 295-309: Learn More is `href="#About"`; no video | Deps 43, 39 dropped. Phase 16 Website Expansion. Justin 2026-09-28: video |
| 35 | Add count up animation for stats | later | `ui/components/atoms/number/number.svelte` has no animation; `HomePage` 268-271 only sets `data-target`; `globe.svelte.ts` `animateCounter` has no call site | Phase 16 Website Expansion. Justin 2026-09-28: wanted, draws attention to the stats; not now |

### About Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 51 | Create profile/contact card variant | done | `ui/components/molecules/card/card.svelte` `profile` snippet | Dep 50 dropped (done). |
| 52 | Set image ratio to 9:16 vertical | superseded | `card.svelte` profile snippet uses `aspect-square` | Not built as written; the square may be the current design. Dep 51 dropped. Justin 2026-09-28: design moved on; profile cards ship square (card.svelte) |
| 53 | Add LinkedIn icon functionality | done | `card.svelte` profile: `Link href={icon} external` with `icon-[devicon--linkedin]` | Dep 51 dropped. |
| 54 | Add team member detail pages | later | Roadmap Phase 16 Website Expansion + Port SEO Page System | Dep 51 dropped. |
| 62 | Add scroll visual effects to about | later | No parallax; only the hero fade-in (`HomePage` 1025-1044) and the `observe` helper exist | Dep 61 dropped (done). Phase 16 Website Expansion. Justin 2026-09-28: effects |
| 61 | Fix mobile image ratios | done | `HomePage` 601 `aspect-video lg:aspect-square` | |

### Components

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 57 | Finish flex grid component | duplicate | Map #1, Not yet specified: "a Flex component alongside the grid component" | Dep 56 dropped. |
| 81 | Create testimonial card variant | done | `card.svelte` `testimonial` snippet | Deps 80, 50 dropped (done). |
| 94 | Setup data objects for components | done | `HomePage` `{#each servicesData / teamData / faqData / testimonialsData / aboutData / partnersData}` fed by `apps/site/src/lib/*/*.remote.ts` | Deps 92, 93 dropped. |
| 50 | Update card component with variants | done | `card.svelte` `CardProps`: `variant?: 'service' \| 'profile' \| 'testimonial'` plus shared `title`, `subtitle`, `description`, `label`, `image`, `icon` | |
| 92 | Create grid component | done | `ui/components/molecules/grid/grid.svelte`, `item.svelte`, `grid.svelte.ts`; `packages/ui/CONTEXT.md` "Grid component" | |
| 93 | Create flex component | duplicate | Map #1, Not yet specified: "a Flex component alongside the grid component" | |
| 100 | Add chatbot question/answer functionality | later | Roadmap Phase 15 AI Chat + Sales/Ops Dashboard | Dep 99 dropped (later). |
| 115 | Add swiper functionality | done | `ui/components/molecules/slider/slider.svelte` (embla-carousel-svelte); used at `HomePage` 496, 528, 561 | Dep 112 dropped. |
| 99 | Create chat widget component | later | Roadmap Phase 15 AI Chat + Sales/Ops Dashboard | |
| 36 | Add icons to buttons | done | `ui/components/atoms/button/button.svelte` `icon` prop; e.g. `(site)/+layout.svelte` `icon="icon-[mdi--phone]"` | Dep 31 dropped. |
| 38 | Edit icon component | done | `ui/components/atoms/icon/icon.svelte` resolves `icon-[theme--name]` classes for `@iconify/tailwind4` | Dep 37 dropped. |
| 42 | Create image component | done | `ui/components/atoms/image/image.svelte` | Built on the base component, not a media component (row 41). Dep 41 dropped. |
| 43 | Create video component | later | No `video*.svelte` under `packages/ui/src` or `apps/site/src` | Dep 41 dropped. Phase 16 Website Expansion. Justin 2026-09-28: video component: useful, not needed now |
| 45 | Create divider component | done | `ui/components/atoms/divider/divider.svelte` | Dep 41 dropped. |
| 46 | Create pattern component | done | `image.svelte` `pattern?: string \| boolean` prop | As an Image prop, not a component. Dep 41 dropped. |
| 96 | Create form molecule component | live | No `form.svelte` in `packages/ui`; the site form is inline (`HomePage` 814-928) | Adjacent map fog line: "Organism authoring for non-static sections". Dep 95 dropped. Justin 2026-09-28: PRIORITY: form molecule on the existing forms/field.svelte.ts base (input, textarea, checkbox, radio, select, switch already extend FieldProps); needed by the Report Generator |
| 97 | Create contact form organism | done | `HomePage` 814-928 with `apps/site/src/lib/contact/contact.remote.ts` `submitContactData` | Shipped inline in the page, not as a library organism. Dep 96 dropped. |
| 98 | Add Google contact form integration | superseded | `contact.remote.ts` 57 posts to a Zapier webhook; no Google Form | Dep 97 dropped. Justin 2026-09-28: design moved on; Zapier webhook shipped instead (contact.remote.ts) |
| 113 | Add infinite scroll animation | done | `slider.svelte` `autoscroll` (embla-carousel-auto-scroll); `HomePage` 500 `autoscroll={0.5}` | Dep 112 dropped. |
| 114 | Add scroll-triggered movement | later | Nothing scroll-driven in `slider.svelte` or `ui/base/helpers/scroll.svelte.ts` | Dep 112 dropped. Phase 16 Website Expansion. Justin 2026-09-28: effects |
| 39 | Edit button component | done | `button.svelte` `icon`, `iconToggle`, `iconHover`, `variant` | Deps 36, 37 dropped. |
| 44 | Update icon component for media | superseded | `packages/ui/CONTEXT.md` "Base component system"; `packages/ui/docs/adr/0001-default-renderer-is-the-authoring-path.md` | Every component builds on the base component; there is no media layer. Deps 41, 37 dropped. |
| 76 | Move toggle functionality to button | done | `button.svelte` 43-64, 141-220: `toggled`, `iconToggle`, `onToggle` | Deps 75, 39 dropped. |
| 41 | Create media component | superseded | `packages/ui/CONTEXT.md` "Base component"; ADR 0001 | The base component is the shared foundation the media idea wanted. |
| 73 | Fix divider component coloring | done | `divider.svelte` `colorClass`: `color`/`primary`/... props map to text-colour classes, bypassing theme classes | Verify by eye on the preview. |
| 75 | Update toggle component | done | `ui/components/molecules/toggle/toggle.svelte` 527 adds `active`; FAQ icon colours via `button.iconToggle` (`HomePage` 947-956) | |
| 95 | Create form input components | done | `ui/components/atoms/forms/input`, `textarea`, `select`, `field.svelte.ts` | `checkbox`, `radio`, `switch` are empty stubs, listed on #33. |
| 112 | Create grid animation effects | done | `slider.svelte` (autoscroll, autoplay, swipe variants) | Shipped as the Slider molecule, not a generic effect prop. |

### Contact

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 118 | Add email display | done | `HomePage` 706-728 Email block in the Contact section | |

### Contact Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 71 | Create small contact form | done | `HomePage` 814-928; `contact.remote.ts` | Dep 69 dropped (done). |
| 72 | Show office locations | done | `HomePage` 730-744 Locations | Dep 70 dropped. |
| 123 | Add offices section | done | `HomePage` 730-744 Locations | Same code as 72. Dep 70 dropped. |
| 69 | Change contact section to white background | done | `HomePage` 645-655: Contact `Section` carries no `dark` or `bg-` class, unlike Services and FAQ | Verify by eye on the preview. |
| 70 | Add globe for locations | done | `HomePage` 328 `<Globe>` with `apps/site/src/lib/globe/globe.remote.ts` locations | Sits in the hero, not the contact section. The globe rewrite is Out of scope on map #1. Dep 69 dropped. |

### Content

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 101 | Update content in Google Sheets | done | `apps/site/src/lib/{about,faq,partners,sections,services,team,testimonials}/*.remote.ts` read Sheetari; `docs/trident/CONTEXT.md` "Sheetari" | Dep 25 dropped (done). |
| 102 | Create GPT for content population | later | Roadmap Phase 20 AI-Assisted Workflows + Automation | Dep 101 dropped. |
| 103 | Generate images from content | later | Roadmap Phase 17 Social Media Image Generator (closest phase) | Dep 102 dropped. |
| 104 | Generate videos from images | later | Roadmap Phase 20 AI-Assisted Workflows + Automation | Dep 103 dropped. |
| 60 | Get content and images for about | done | `about.remote.ts`; rendered at `HomePage` 582-607 | |
| 122 | Grab original images from current site | done | `packages/ui/static/photos/trident-cubed-*.webp`, `*.png` | Needs Justin's confirmation that these are the originals. |
| 124 | Review extended services | later | `services.remote.ts` reads the services sheet; the review itself is not verifiable in code | Phase 16 Website Expansion. Justin 2026-09-28: content review |
| 125 | Consider LinkedIn newsfeed integration | later | Roadmap Phase 16 Website Expansion + Port SEO Page System | |
| 126 | Review video section content | later | No video anywhere in the site; nothing records the review | Phase 16 Website Expansion. Justin 2026-09-28: video |

### CTA Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 77 | Create CTA section | done | `HomePage` 966-992 `Section class="dark"` with Contact Sales | Dep 74 dropped (unclear). |
| 79 | Add careers variant to CTA | later | `HomePage` 966-992 has one Contact Sales button; no careers variant | Dep 77 dropped. Phase 16 Website Expansion. Justin 2026-09-28: future |

### Data

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 27 | Add layout.server.ts data integration | superseded | Map #1 decision on #42 (route-colocated remote functions, `src/lib/<feature>`); `apps/site/AGENTS.md` data rule; `(site)/+layout.ts` `prerender = true`, no `layout.server.ts` | Deps 25, 26 dropped. |
| 26 | Implement data inheritance system | superseded | Same #42 / #7 decision: per-topic `prerender` remote functions, no inheritance | Deps 25, 6, 7 dropped (6 and 7 are not CSV IDs). |
| 25 | Create Google Sheets data utility | done | Sheetari (`docs/trident/CONTEXT.md`), `fetch` in `*.remote.ts`, `packages/tools/src/generators/sheetari.ts` | |

### FAQ Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 74 | Update FAQ section background | superseded | `HomePage` 935: FAQ is `bg-base-200-700`; Contact is the base background; they do not match as the row asks | Dep 69 dropped. Justin 2026-09-28: design moved on; shipped tint stands (HomePage) |

### Footer

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 84 | Add footer copyright | done | `(site)/+layout.svelte` `<Copyright year="2020" ...>`; `ui/components/molecules/copyright/copyright.svelte` | Dep 83 dropped. |
| 85 | Add footer link categories | later | Roadmap Phase 16 Website Expansion + Port SEO Page System (link categories need pages to link) | Dep 83 dropped. |
| 87 | Add trust/award icons | later | Footer in `(site)/+layout.svelte` holds logo, copyright and three social buttons only | Dep 83 dropped. Phase 16 Website Expansion. Justin 2026-09-28: future |
| 88 | Add logo to footer | done | `(site)/+layout.svelte` Footer `<Logo class="size-11" />` | Dep 83 dropped. |
| 89 | Show company accolades | later | Not in the footer or any section | Dep 83 dropped. Phase 16 Website Expansion. Justin 2026-09-28: future |
| 86 | Add social media icons | done | `(site)/+layout.svelte` Footer: Facebook, LinkedIn, WhatsApp buttons | Deps 83, 37 dropped. |
| 83 | Create footer component | done | `ui/components/organisms/footer/footer.svelte`; used in `(site)/+layout.svelte` | |

### Icons

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 37 | Get Iconify Tailwind working | done | `@iconify/tailwind4` in `packages/ui/package.json`; `ui/css/3-presets/icons.css` `@apply icon-[...]` | Dep 31 dropped. |
| 31 | Integrate Iconify icon system | done | `icon.svelte`, `icon-theme.svelte`, `ui/css/5-icons/icons.css` | Deps 6, 7 dropped (not CSV IDs). Rework of the system is the map's icon fog line (see `ICONS.md`). |

### Layout

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 91 | Implement grid-based layout breaking | superseded | Rails: `packages/ui/CONTEXT.md` "Rails"; `ui/base/helpers/rails.svelte.ts` named grid lines (`content-full-start` ...) | Dep 90 dropped. |
| 90 | Research Kevin Powell layout method | superseded | Same: Rails is the grid-line breakout | |

### Legal

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 121 | Add legal pages to footer dialog | live | Zero hits for `privacy` or `terms` under `apps/site/src`; `Toggle variant="dialog"` exists in `toggle.svelte` | Website backlog. Deps 119, 120 kept (live). |
| 119 | Create privacy policy | live | Zero hits under `apps/site/src`; the site collects contact data (`contact.remote.ts`) and loads Google Analytics (`(site)/+layout.svelte` 66-76) | Website backlog. |
| 120 | Create terms of use | live | Zero hits under `apps/site/src` | Website backlog. |

### Mobile

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 107 | Reduce Trident Cubed font size mobile | done | `ui/components/molecules/logo/logo.svelte` 285 `text-lg ... lg:text-xl` | Dep 106 dropped. |
| 108 | Center mobile header layout | later | `(site)/+layout.svelte` Header: logo in column 1, nav toggle right (`nav.svelte` 84); Call Us sits inside the nav, not left of the logo | Not built as written. Dep 106 dropped. Phase 16 Website Expansion. Justin 2026-09-28: eye check with #15 |
| 109 | Fix mobile menu jump issue | later | Not verifiable from code; needs an eye check | Dep 106 dropped. Phase 16 Website Expansion. Justin 2026-09-28: REAL BUG, first pick when website work reopens |
| 110 | Fix mobile sun icon position | later | `Theme` toggle carries `justify-self-start lg:justify-self-center` in `(site)/+layout.svelte`; whether that fixed it needs an eye check | Dep 106 dropped. Phase 16 Website Expansion. Justin 2026-09-28: eye check with #15 |
| 111 | Fix mobile divider height | later | `divider.svelte` default `height = '120px'`, no mobile override | Dep 106 dropped. Phase 16 Website Expansion. Justin 2026-09-28: eye check with #15 |
| 106 | Reduce mobile header size | later | `ui/components/organisms/header/header.svelte` `px-4 py-6` with no mobile variant | Phase 16 Website Expansion. Justin 2026-09-28: eye check with #15 |
| 116 | Reorganize mobile content layout | superseded | `HomePage` 583-606: about `Container` is `flex-col` with `Content` before `Image`, no `order-` classes | Not built. Justin 2026-09-28: design moved on; shipped mobile order stands (HomePage) |
| 117 | Make services swipeable on mobile | later | `HomePage` 628, 998-1000: services are a CSS grid, no `Slider` | Not built. Phase 16 Website Expansion. Justin 2026-09-28: could be good; not now |

### Services Section

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 67 | Replace label with add icon | superseded | `card.svelte` service snippet: the label is commented out (78-83); no add icon | Dep 66 dropped. Justin 2026-09-28: design moved on; label removed instead (card.svelte) |
| 68 | Create shopping cart functionality | later | Roadmap Phase 16 Website Expansion + Port SEO Page System (a quote-request flow) | Dep 67 dropped. |
| 63 | Add light pattern background to services | later | `HomePage` 622: Services is `bg-base-200-700`, no pattern | Phase 16 Website Expansion. Justin 2026-09-28: effects |
| 64 | Add light gradient to services | later | No gradient in the Services section | Phase 16 Website Expansion. Justin 2026-09-28: effects |
| 66 | Add mouse follow border effect | later | Nothing pointer-driven in `card.svelte` | Phase 16 Website Expansion. Justin 2026-09-28: wanted at some point; not now |
| 65 | Add wavy icon separator | done | `ui/components/atoms/title/title.svelte` `water-swoosh` SVG between h1 and subtitle (`icon = true`); `Title` used at `HomePage` 624-627 | |

### Testimonials

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 80 | Create testimonial section | done | `HomePage` 527-544 testimonials `Slider`; `testimonials.remote.ts` | |
| 82 | Cover all client types | later | Coverage lives in the testimonials sheet, not verifiable in code | Dep 81 dropped. Phase 16 Website Expansion. Justin 2026-09-28: content, important later |

### Visual Effects

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 105 | Add scroll-triggered video playback | later | No video in the site | Deps 104, 43 dropped. Phase 16 Website Expansion. Justin 2026-09-28: video |

### Apps Tools

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 18 | Implement manifest.json generation | later | Roadmap Phase 16 Website Expansion + Port SEO Page System | Dep 17 dropped (later). |
| 20 | Build Open Graph image generator | later | Phase 16; static `og:image` tags exist today in `(site)/+layout.svelte` 118-131 | Dep 33 dropped. |
| 22 | Create sitemap generator | later | Phase 16 | Dep 33 dropped. |
| 23 | Implement service worker | later | Map #1 Out of scope: offline sync and PWA belong to the "Report Generator platform" map; roadmap Phase 5 V1 "Installable PWA support" | Dep 33 dropped. |
| 17 | Create favicon generation utility | later | Phase 16; `apps/site/src/app.html` links a static `favicon.svg` | |
| 19 | Create robots.txt and humans.txt generator | later | Phase 16 | |
| 21 | Implement metadata generation | later | Phase 16; hand-written meta tags exist in `(site)/+layout.svelte` 78-131 | Dep 33 dropped. |

### Documentation

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 13 | Update README prerequisites | superseded | Map #1 decisions on #12 ("Node 24 via `engines`", pnpm 12) and #9 ("Node 24 everywhere"); AGENTS.md is canonical and no root README exists | `package.json` still pins `pnpm@9.15.4` with no `engines`; that lands with the #12 steps. |

### Research

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 33 | Research shared utility patterns | later | Phase 16 (sitemap and Open Graph tooling ride with the SEO page system) | Adjacent map fog line: "Shared static assets as a package with per-app override". |

### Versioning

| ID | Task | Bucket | Citation | Note |
| --- | --- | --- | --- | --- |
| 14 | Implement semantic versioning | later | Map #1 Out of scope: "Semantic versioning, release tagging, Husky and continuous integration: a future effort of its own" | Deps 15, 24 dropped (later). |
| 15 | Research monorepo versioning strategy | later | Same Out of scope line | |
| 24 | Research Total TypeScript versioning guide | later | Same Out of scope line | |

## `TODO.md`

| Item | Bucket | Citation | Note |
| --- | --- | --- | --- |
| Refactor `grid.svelte` and `item.svelte` onto `Component`, special-case `debug`, make 100% size a default | duplicate | Map #1, Not yet specified: "A library Page component built on layout snippets that replaces the report app's own Page and its grid component usage ... a Flex component alongside the grid component" | The grid component (`ui/components/molecules/grid/`) does not import `Component` today; its future is that fog line. ADR 0001 sets the default renderer as the authoring path for new components. |

## `.todo/ICONS.md`

| Item | Bucket | Citation | Note |
| --- | --- | --- | --- |
| Smart Icon Management System PRD (on-demand Iconify fetch, cache, build-time bundling) | duplicate | Map #1, Not yet specified: "Icon registration, font loading, theme-state ownership and the first-paint bootstrap: Justin is not happy with the icon or font systems ... After the Report Generator" | `packages/ui/CONTEXT.md` Icons section is marked unsettled; #33 lists only the two dead icon-theme defaults and keeps the rework in the fog. |

## `.todo/tailwind-grid-breakout.md`

| Item | Bucket | Citation | Note |
| --- | --- | --- | --- |
| Convert the vanilla CSS content/popout/feature/full breakout grid to Tailwind `@apply` | superseded | Rails: `packages/ui/CONTEXT.md` "Rails" (rails container, content, full, gutter and directional rails, `popout` kept as an alias); `ui/base/helpers/rails.svelte.ts` | Same idea as CSV rows 90 and 91. |

## Live rows (approved by Justin, 2026-09-28)

| ID | Task | Home if approved |
| --- | --- | --- |
| 119 | Create privacy policy | Website follow-ups after Report Generator V1 |
| 120 | Create terms of use | Website follow-ups after Report Generator V1 |
| 121 | Add legal pages to footer dialog | Website follow-ups after Report Generator V1 (depends on 119, 120) |

No UI-package row is marked live: every unbuilt library idea is either already on #33, in a map fog line, or unclear below.

## Decisions on the formerly unclear rows (Justin, 2026-09-28)

All 28 resolved in one pass. Video (43, 47, 48, 105, 126), effects (35, 62, 63, 64, 66, 114, 117), sections and content (79, 82, 87, 89, 124) and the mobile rows (106, 108, 110, 111) are **later**, Phase 16 Website Expansion. Row 109, the mobile menu jump, is a real bug and the first pick when website work reopens. Rows 52, 67, 74, 98 and 116 are **superseded** by the shipped design. Row 96 is **live** and a priority: a form molecule built on the existing `forms/field.svelte.ts` base, which the Report Generator needs.


### Issues created (2026-09-28)

- Parent: [Website follow-ups after Report Generator V1](https://github.com/layerdbiz/tridentcubed/issues/51)
- 119 → [Create the privacy policy page](https://github.com/layerdbiz/tridentcubed/issues/52)
- 120 → [Create the terms and conditions page from the client's document](https://github.com/layerdbiz/tridentcubed/issues/53)
- 121 → [Open the legal pages from the site footer in a dialog](https://github.com/layerdbiz/tridentcubed/issues/55), blocked by 52, 53 and the new [Dialog component for the UI package](https://github.com/layerdbiz/tridentcubed/issues/54)
- 109 → [Fix the mobile menu jump on the site](https://github.com/layerdbiz/tridentcubed/issues/56), a bug, deferred but tracked
- 96 → [Form molecule on the shared field base](https://github.com/layerdbiz/tridentcubed/issues/57), standalone: a Report Generator priority, not #33 cleanup

## `TODO.txt` items not in the CSV

The transcript is one line; everything below is what the CSV generator dropped or folded.

| Transcript item | State | Citation |
| --- | --- | --- |
| The hero "Contact Sales" button scrolls to the contact section | built | `HomePage` 310-323 `href="#Contact"` |
| A divider after the trusted-by logos separates the hero from About | built | `HomePage` 485-486 `divider="bottom"` on the Partners section |
| Footer colour decision: keep primary blue with a white logo, or go black with the colour logo | built one way | `(site)/+layout.svelte` Footer is `dark` with a radial primary gradient and a plain `Logo`; CSV row 88 only carries the logo half |
| Contact cards "take up a lot of space" on mobile (the observation that led to the effect component, row 112) | not a row | Team cards ride a `Slider` at `HomePage` 561-578 |
| Services "smaller" on mobile as an alternative to swipeable (row 117 kept only the swipe) | not a row | Unclear with 117 |
| "The contact cells would bring you to the contact section" (hero button behaviour) | built | Same as the first item |

Nothing else in the transcript is missing from the CSV; the remaining sentences map onto rows 31-126 as listed above.
