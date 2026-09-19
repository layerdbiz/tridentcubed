# Reusable UI

The shared design vocabulary of `@layerd/ui`: the base component system every reusable component is built on, its styling and theme words, its layout words, and the atomic design levels that organize the library. Trident business vocabulary lives elsewhere.

The library adopts Tailwind's names wherever it can, so many words here are Tailwind's words used the same way.

## Language

### The base component system

**Base component system**:
The shared foundation every reusable component is built on. Made of the base component, Root, and the base props.
_Avoid_: runtime, base runtime, runtime architecture

**Base component**:
The public component new components start from. It turns styling props into theme classes, multiplies itself by total, attaches the base props, and hands layout to Root.
_Avoid_: Component runtime

**Root**:
The internal layout engine beneath the base component. It owns grids, rails, layout snippets and the zones. Only the base component uses it; new components never start from Root.
_Avoid_: root runtime, public Root

**Default renderer**:
The base component's built-in rendering: the requested tag with content or layout snippets inside.

**Root override**:
A component taking over the base component's rendering with its own markup while Root still does layout beneath it. Spoken forms: root snippet, root component.
_Avoid_: takeover, legacy snippet, custom renderer, render override

**Base props**:
The behaviors any component gets by being built on the base component: debug, observe, scroll, persist, total. Spoken forms: base helpers, base utilities, base component props.

**Content**:
What fills a component: its children, else its label, else a default text. Bare "content" without "snippet" means the content rail.

**MQ**:
The shared breakpoint state the whole library reads instead of each component asking the browser. Not part of layout snippets.

**Bucket**:
The breakpoint the viewport falls in right now, as MQ reports it: sm, md, lg, xl or xxl. Below sm is still sm; there is no xs bucket.

**Wrapper component**:
Relative, not a category: the component that wraps the one being worked on, such as a section around a header.
_Avoid_: wrapper (as a name for atoms built on the base component)

### Styling

**Ladder**:
A named run of steps, usually xs through xxl in Tailwind's naming. The same step names appear on many ladders (Size, Scale, edge, prose, content rails, gutter rails, buckets) and a step name only means something inside its own ladder.

**Color**:
One of base, neutral, primary, secondary, accent. Chooses the theme pairing a component wears.
_Avoid_: styled

**Base color**:
The plain, uncolored theme pairing. Say "base color" when you mean the color; bare "base" means the base component system. Tailwind's own "base" is unrelated.

**Appearance**:
One of heavy, lite, outline, ghost, glass, gradient. How strongly the color is applied. Heavy is the default when a color is set.
_Avoid_: variant (as a base prop; variant is a component-specific word)

**Invert**:
Flips the light and dark sides of the current appearance.

**Size**:
The visual scale of a component, xxs through xxl.
_Avoid_: large

**Unstyled**:
A component with the theme system switched off, starting from nothing. Spoken form: bare bones.

**Total**:
The number of copies a component renders of itself.

### Theme

**Theme**:
A named whole look, such as default, dracula, retro, corporate or cyberpunk: every theme variable set together. Bare "theme" means one of these. The pieces below are internal to the library; a developer using the library picks a theme and wears Colors.

**Theme variable**:
One knob a theme sets: a theme color, the theme font, the Scale, a radius, or the edge width. Apps override theme variables to skin the whole library.

**Theme color**:
A friendly color name a theme defines: base, neutral, primary, secondary, accent, and the status colors. A Color is a theme color a component wears.

**Status color**:
The theme colors that signal state: info, warning, success, danger. Meant to be wearable as a Color like the others; not wired yet.

**Color scale**:
The eleven steps, 50 through 950, generated from one theme color: lighter below 500, the color itself at 500, darker above.
_Avoid_: shade, scale (bare; that means the type Scale)

**Pairing**:
Two steps of one color scale joined into a single token, the first shown in light mode and the second in dark: base-50-950, primary-500-50. Black and white pairings exist too.

**Mode**:
Light or dark: which side of every pairing is in effect on the document.

**Mode preference**:
What the user asked for: system, light or dark. The preference chooses the mode; the mode is what the document is.

**Theme class**:
A ready-made pairing of background, text and edge for one Color and one Appearance, such as heavy primary or outline base. The base component turns Color, Appearance and Invert into theme classes. Glass and gradient ignore the Color.
_Avoid_: theme preset

**Scale**:
How big everything is at once, like a compact or comfortable density setting: one multiplier the whole library grows or shrinks by, with steps xs through xl. Moves type today and is meant to move spacing too. Size moves one component; Scale moves everything.
_Avoid_: density (as the term), size (for this)

**Edge**:
The shared width ladder, xs through xl, that borders, outlines, rings and strokes all draw from. Spoken forms: edge width, border width, outline width. Not the safe edge, which is spacing.

**Radius**:
The theme's corner rounding, set once or per role: base, box, button.

**Theme font**:
The font family a theme sets, once or per font role: base and headings. Unsettled: how fonts are registered and loaded is still being worked out.

**Prose**:
Flowing text styled with the theme's pairings and Scale and capped at a reading width. Prose has its own xs through xl ladder that scales prose alone. The content rail borrows its width from prose.

### Icons

Unsettled: the icon system is still being worked out. These are the words the code uses today.

**Icon theme**:
A named mapping from icon names to glyphs, chosen for the whole document: mdi, heroicons, carbon. An icon theme may borrow glyphs from several collections; it is not a collection.

**Icon collection**:
An installed pack of glyphs, such as mdi, heroicons, carbon, solar or material-symbols.

**Named icon**:
An icon asked for by meaning, such as home or light-mode, resolved through the current icon theme.

**Raw icon**:
An icon asked for by collection and glyph, such as mdi--home, skipping the icon theme.

### Grids

**Block grid**:
The default grid a component lays its layout snippets on: a 3 by 3 area filling the component's width.
_Avoid_: full grid

**Inline grid**:
The block grid shrunk to its content so it sits inline.

**Rails grid**:
The grid a rails container uses: the rail ladder across the full width.

### Layout snippets

**Layout snippet**:
Named content placed into a grid position: a cell, friendly name, row, column, range, half or layer.

**Cell**:
One of nine grid positions named by column letter then row number: a1 top-left through c3 bottom-right. A cell claims its grid area.
_Avoid_: grid cell reference (spoken form; write cell)

**Friendly name**:
The word form of a position: topLeft, top, left, center, right, bottom and their kin. A friendly name is not an alias of its cell: it packs compactly instead of claiming the grid.

**Row / Column**:
A whole row (row1 to row3) or whole column (col1 to col3) of the grid.

**Range**:
A rectangle from one cell to another, named by both: a1c3, b1c3.

**Half**:
Top, bottom, left or right half of the grid.

**Layer**:
Content covering the whole grid: bg beneath everything, full in the middle, fg on top.

**Full layer**:
The layer snippet named full. Say "full layer" so it is not confused with the full rail.

**Place modifier**:
A suffix on a layout snippet name, such as CC or TL, that sets where the content sits inside its area. Spoken form: placement modifier.
_Avoid_: friendly name (that means the word-form positions), the other grid name

**Fallback**:
The name shown in place of a layout snippet that rendered nothing.

### Rails

**Rails container**:
An element with rails set. It lays the rail ladder across its full width and puts its children on the rail its value names, content by default.

**Rail**:
A named column span within a rails container. Set on a child to place it; placing never makes the child a container.

**Content rails**:
The centered width ladder: xs, sm, content, lg, xl, xxl.

**Content rail**:
The reading-width rail and the default. Named after Tailwind's prose content width.

**Full rail**:
Edge to edge of the rails container. Spoken form: bleed.

**Gutter rails**:
Full width pulled in by a preset inset: gutter-xs through gutter-xxl.

**Directional rails**:
From one edge of the container to a content line: left, right, and left-xs through right-xxl.
_Avoid_: bleed-left, bleed-right (still accepted, but write left and right)

**Alias**:
A legacy or friendly rail name the system still accepts and folds back to its canonical rail: md, popout, bleed, inset-md, gutter-4.

**Inset**:
A modifier that pulls a rail in from its edges. On a rails container it widens the safe edge; on a full rail it makes a one-off pull-in.

**Safe edge**:
The minimum breathing room between content and the container's edge.
_Avoid_: gutter (as spacing; gutter names a rail family)

**Snippet zone**:
The area Root inserts when a rails container also has layout snippets, so the whole grid sits on one rail.

**Rail zone**:
A row or layer inside a rails container that spans the full width and carries the rail lines through, so its children can pick rails too.

### Page layout

These predate the rails system and layout snippets, which do the same jobs without padding and are the direction the library is moving.

**Container**:
The centered page column: a maximum width plus a safe padding that is smaller on phones than on desktop. Not a rails container; always say "rails container" for that.

**Section**:
A band of the page: full width by default, a Container inside, optional dividers top and bottom, and a heading. An atom; its dividers and Container are built-in niceties, not composition.

**Viewport bleed**:
Stretching an element to the viewport's edges, the way a Section does by default. Bare "bleed" still means the full rail. A container bleed stretches only to the Container's padding edges instead.

**Layout preset**:
A named arrangement a Section pastes onto its content, such as a two, three or four column grid, a split, a hero or a sidebar, with modifiers such as tight or reverse. A real idea, unfinished and unused today. Unrelated to layout snippets.
_Avoid_: layout variant

**Grid component**:
A spreadsheet-style grid of any size where each item claims a range, written A1:C3, or takes the next free cell. The layout snippets and rails grew out of it and share its words: a range on the grid component is A1:C3, a range snippet is a1c3. Spoken form: the grid component, never bare grid.

**Track**:
One row's or column's size on the grid component, which an item placed there may set.

**Canvas**:
The surface pages are laid on, meant to be zoomed and dragged like a design tool's canvas with its own controls. Unfinished concept; no component exists yet.

### Organization

**Atom**:
A single thing: the smallest reusable component.

**Molecule**:
A component made of several atoms, small enough to be put into something bigger.

**Organism**:
A large section made of several atoms and molecules, such as a header.

**Template**:
A full-page layout that places components and shows where content goes, without real content. Atomic design's fourth level. The library's own template is a stub.

**Page**:
A template filled with real content: the level a user actually sees. Atomic design's fifth level. The library's own pages are stubs, and the letter-sized report sheet is not what this word means; that sheet is still unnamed.

**App component**:
A component owned by one app and specific to what that app is about, such as a vessel selector, composed from reusable UI and never published in the library. Rare by intent; the reusable UI names are generic on purpose.

Any level may be built on the base component; the level says what a component is made of, not how it is built. A component's level is what it is to its author; built-in niceties, such as a section's dividers, do not make it a molecule.
