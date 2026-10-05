# TailwindCSS 4 Grid Breakout System

Your job is to convert the vanilla css system in to Tailwind CSS Classes using only base utility classes that tailwind give you. You must not use any arbitrary values e.g. `h-[120px]`. You must only use tailwind utility classes with `@apply` directive.

The main class to be used with for grid is `.container` and defaults to the "content".

You are allowed to use variables with `@apply` e.g. `@apply bg-(--brand-color);`.

## Vanilla HTML + CSS to convert

### HTML
```html
<div class="container">
  <div>Content</div>
  <div class="popout">Popout</div>
  <div>Content</div>
  <div>Content</div>
  <div class="feature">Feature</div>
  <div>Content</div>
  <div>Content</div>
  <div>Content</div>
  <div class="full">Full</div>
  <div>Content</div>
  <div>Content</div>
  <div>Content</div>
</div>
```

### CSS
```css
.container {
  --gap: clamp(1rem, 6vw, 3rem);
  --full: minmax(var(--gap), 1fr);
  --content: min(50ch, 100% - var(--gap) * 2);
  --popout: minmax(0, 2rem);
  --feature: minmax(0, 5rem);

  display: grid;
  grid-template-columns:
    [full-start] var(--full) [feature-start] var(--feature) [popout-start] var(--popout) [content-start] var(--content) [content-end] var(--popout) [popout-end] var(--feature) [feature-end] var(--full) [full-end];
}

.container > * { grid-column: content; }
.popout { grid-column: popout; }
.feature { grid-column: feature; }
.full { grid-column: full; }

.popout {
  background-color: thistle;
}

.feature {
  background-color: paleturquoise;
}

.full {
  background-color: bisque;
}
```