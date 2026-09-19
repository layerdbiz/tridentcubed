# Reusable UI

The shared design vocabulary of `@layerd/ui`: the base component system every reusable component is built on, its styling words, its layout words, and the atomic design levels that organize the library. Trident business vocabulary lives elsewhere.

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

**Wrapper component**:
Relative, not a category: the component that wraps the one being worked on, such as a section around a header.
_Avoid_: wrapper (as a name for atoms built on the base component)

### Styling

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

### Organization

**Atom**:
A single thing: the smallest reusable component.

**Molecule**:
A component made of several atoms, small enough to be put into something bigger.

**Organism**:
A large section made of several atoms and molecules, such as a header.

**Template**:
A page-level scaffold. Unfinished concept, still being worked out.

**Page**:
A composed page. Unfinished concept, still being worked out.

Any level may be built on the base component; the level says what a component is made of, not how it is built.
