<!-- Root.svelte -->
<script lang="ts">
  import type {Snippet} from 'svelte';

  type AreaName =
    | 'topLeft'
    | 'top'
    | 'topRight'
    | 'left'
    | 'center'
    | 'right'
    | 'bottomLeft'
    | 'bottom'
    | 'bottomRight';
  type PlaceValue = string;
  type GridValue = 'full' | 'inline';
  type ContentValue = Snippet | string | number | boolean | null | undefined;
  type RootLayoutSnippet = Snippet;
  type RootRenderArgs = {
    props: Record<string, unknown> & {class?: string};
    layout: RootLayoutSnippet;
  };
  type RootProps = {
    root: Snippet<[RootRenderArgs]>;
    children?: Snippet;
    label?: string;
    class?: string;
    style?: string;
    debug?: boolean;
    grid?: GridValue;
    items?: PlaceValue;
    content?: PlaceValue;
    rows?: string;
    cols?: string;
    size?: string;
    topLeft?: ContentValue;
    top?: ContentValue;
    topRight?: ContentValue;
    left?: ContentValue;
    center?: ContentValue;
    right?: ContentValue;
    bottomLeft?: ContentValue;
    bottom?: ContentValue;
    bottomRight?: ContentValue;
  } & Record<string, unknown>;

  const areaMeta: Record<AreaName, {tag: string; position: string; label: string}> = {
    topLeft: { tag: 'div', position: 'top-left', label: 'top left' },
    top: { tag: 'div', position: 'top', label: 'top' },
    topRight: { tag: 'div', position: 'top-right', label: 'top right' },
    left: { tag: 'div', position: 'left', label: 'left' },
    center: { tag: 'div', position: 'center', label: 'center' },
    right: { tag: 'div', position: 'right', label: 'right' },
    bottomLeft: { tag: 'div', position: 'bottom-left', label: 'bottom left' },
    bottom: { tag: 'div', position: 'bottom', label: 'bottom' },
    bottomRight: { tag: 'div', position: 'bottom-right', label: 'bottom right' }
  };

  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function';
  }

  function hasValue(value: ContentValue): boolean {
    return (
      isSnippet(value) ||
      (value !== null && value !== undefined && value !== false && value !== true && value !== '')
    );
  }

  function mergeClasses(...classes: Array<string | undefined>): string {
    return classes.filter(Boolean).join(' ');
  }

  function mergeStyles(...styles: Array<string | undefined>): string | undefined {
    const merged = styles
      .filter((style): style is string => Boolean(style?.trim()))
      .map((style) => style.trim().replace(/;$/, ''))
      .join('; ');

    return merged ? `${merged};` : undefined;
  }

  function splitTrackValues(value: string): string[] {
    const tracks: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of value.trim()) {
      if ((char === ' ' || char === '\n' || char === '\t') && depth === 0) {
        if (current.trim()) {
          tracks.push(current.trim());
          current = '';
        }
        continue;
      }

      if (char === '(' || char === '[') {
        depth += 1;
      } else if ((char === ')' || char === ']') && depth > 0) {
        depth -= 1;
      }

      current += char;
    }

    if (current.trim()) {
      tracks.push(current.trim());
    }

    return tracks;
  }

  function normalizeTracks(value: string | undefined, fallback: string): string {
    const source = value?.trim() ? value : fallback;
    const tracks = splitTrackValues(source);

    if (tracks.length === 0) {
      return fallback;
    }

    if (tracks.length === 1) {
      return `${tracks[0]} ${tracks[0]} ${tracks[0]}`;
    }

    if (tracks.length === 2) {
      return `${tracks[0]} ${tracks[1]} auto`;
    }

    return `${tracks[0]} ${tracks[1]} ${tracks[2]}`;
  }

  function getAreaMeta(name: AreaName) {
    return areaMeta[name];
  }

  let {
    root,
    children,
    label = 'text',
    class: className = '',
    style: styleName = undefined,
    debug = false,
    grid = 'full',
    items = undefined,
    content = undefined,
    rows = undefined,
    cols = undefined,
    size = undefined,
    topLeft: topLeftValue,
    top: topValue,
    topRight: topRightValue,
    left: leftValue,
    center: centerValue,
    right: rightValue,
    bottomLeft: bottomLeftValue,
    bottom: bottomValue,
    bottomRight: bottomRightValue,
    ...props
  }: RootProps = $props();

  const rowTracks = $derived(normalizeTracks(rows ?? size, 'auto auto auto'));
  const colTracks = $derived(
    normalizeTracks(cols ?? size, grid === 'inline' ? 'auto auto auto' : 'auto minmax(0, 1fr) auto')
  );
  const rootStyle = $derived(
    mergeStyles(
      `display: ${grid === 'inline' ? 'inline-grid' : 'grid'}`,
      grid === 'full' ? 'width: 100%' : undefined,
      items ? `place-items: ${items}` : undefined,
      content ? `place-content: ${content}` : undefined,
      `grid-template-rows: ${rowTracks}`,
      `grid-template-columns: ${colTracks}`
    )
  );

  const rootProps = $derived({
    ...props,
    class: mergeClasses(className, 'root-grid'),
    style: mergeStyles(rootStyle, styleName)
  });

  const hasExplicitContent = $derived(
    hasValue(topLeftValue) ||
      hasValue(topValue) ||
      hasValue(topRightValue) ||
      hasValue(leftValue) ||
      hasValue(centerValue) ||
      hasValue(rightValue) ||
      hasValue(bottomLeftValue) ||
      hasValue(bottomValue) ||
      hasValue(bottomRightValue) ||
      Boolean(children)
  );

  const leftContent = $derived(
    hasValue(leftValue)
      ? leftValue
      : !hasExplicitContent
        ? label
        : undefined
  );

  const centerContent = $derived(
    hasValue(centerValue)
      ? centerValue
      : children
        ? children
        : undefined
  );
</script>

{#snippet el(tag: string = 'div', value: ContentValue = undefined, position: string = '', classes: string = '')}
  <svelte:element
    this={tag}
    class={mergeClasses(position, classes)}
  >
    {#if isSnippet(value)}
      {@render value()}
    {:else}
      {value}
    {/if}
  </svelte:element>
{/snippet}

{#snippet area(name: AreaName, value: ContentValue = undefined)}
  {@const meta = getAreaMeta(name)}

  {#if debug}
    <div class="{meta.position} debug">{meta.label}</div>
  {/if}

  {#if hasValue(value)}
    {@render el(meta.tag, value, meta.position)}
  {/if}
{/snippet}

{#snippet layout()}
  {@render area('topLeft', topLeftValue)}
  {@render area('top', topValue)}
  {@render area('topRight', topRightValue)}
  {@render area('left', leftContent)}
  {@render area('center', centerContent)}
  {@render area('right', rightValue)}
  {@render area('bottomLeft', bottomLeftValue)}
  {@render area('bottom', bottomValue)}
  {@render area('bottomRight', bottomRightValue)}
{/snippet}

{@render root({ props: rootProps, layout })}

<style lang="postcss">
  :global {
    .root-grid { 
      gap: 0.5rem; 
      grid-template-areas:
        'top-left top top-right'
        'left center right'
        'bottom-left bottom bottom-right';
    }
    .root-grid > * {
      min-width: 0;
      min-height: 0;
    }

    .root-grid > .debug {
      background: #ccc; 
      opacity: 0.5;
    }
    .root-grid > * {
      z-index: 1;
      background: #ccc; /* neutral base */

      /* block */
      &:is(div) { background: #bfdbfe; }      /* soft blue */
      &:is(section) { background: #bbf7d0; }  /* soft green */
      &:is(article) { background: #fecaca; }  /* soft red */
      &:is(main) { background: #fde68a; }     /* soft amber */
      &:is(header) { background: #ddd6fe; }   /* soft purple */
      &:is(footer) { background: #fbcfe8; }   /* soft pink */

      /* inline */
      &:is(a) { background: #a7f3d0; }        /* mint */
      &:is(i) { background: #e9d5ff; }        /* lavender */
      &:is(span) { background: #fef9c3; }     /* pale yellow */
      &:is(strong) { background: #fecdd3; }   /* light rose */
      &:is(button) { background: #e5e7eb; }   /* soft gray */
    }

    /* GRID POSITIONS */
    .top-left { grid-area: top-left; }
    .top { grid-area: top; }
    .top-right { grid-area: top-right; }
    .left { grid-area: left; }
    .center { grid-area: center; }
    .right { grid-area: right; }
    .bottom-left { grid-area: bottom-left; }
    .bottom { grid-area: bottom; }
    .bottom-right { grid-area: bottom-right; }
  }
</style>
