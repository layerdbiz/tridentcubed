<!-- Root.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

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
	type RootContent = Snippet | string | number | boolean | null | undefined;
	type RootSnippetConfig = {
		tag?: keyof SvelteHTMLElements;
		class?: string;
	};
	type RootLayoutSnippet = Snippet;
	type RootRenderArgs = {
		props: Record<string, unknown> & { class?: string; style?: string };
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
		snippets?: Partial<Record<AreaName, RootSnippetConfig>>;
		topLeft?: RootContent;
		top?: RootContent;
		topRight?: RootContent;
		left?: RootContent;
		center?: RootContent;
		right?: RootContent;
		bottomLeft?: RootContent;
		bottom?: RootContent;
		bottomRight?: RootContent;
	} & Record<string, unknown>;

	const areaMeta: Record<AreaName, { tag: keyof SvelteHTMLElements; position: string; label: string }> = {
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

	const areaOrder: AreaName[] = [
		'topLeft',
		'top',
		'topRight',
		'left',
		'center',
		'right',
		'bottomLeft',
		'bottom',
		'bottomRight'
	];

	let {
		root,
		children,
		label = 'Component',
		class: className = '',
		style: styleName = undefined,
		debug = false,
		grid = 'full',
		items = undefined,
		content = undefined,
		rows = undefined,
		cols = undefined,
		size = undefined,
		snippets = {},
		topLeft,
		top,
		topRight,
		left,
		center,
		right,
		bottomLeft,
		bottom,
		bottomRight,
		...props
	}: RootProps = $props();

	const namedAreaValues = $derived({
		topLeft,
		top,
		topRight,
		left,
		center,
		right,
		bottomLeft,
		bottom,
		bottomRight
	});
	const hasNamedContent = $derived(hasContent(namedAreaValues));
	const leftContent = $derived(
		hasValue(left)
			? left
			: children
				? children
				: !hasNamedContent
					? label
					: undefined
	);
	const areaValues = $derived({
		topLeft,
		top,
		topRight,
		left: leftContent,
		center,
		right,
		bottomLeft,
		bottom,
		bottomRight
	});
	const rowTracks = $derived(resolveRows(rows, size));
	const colTracks = $derived(resolveCols(cols, size, grid));
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

	function isSnippet(value: unknown): value is Snippet {
		return typeof value === 'function';
	}

	function hasValue(value: RootContent): boolean {
		return (
			isSnippet(value) ||
			(value !== null && value !== undefined && value !== false && value !== true && value !== '')
		);
	}

	function hasContent(values: Partial<Record<AreaName, RootContent>>): boolean {
		for (const areaName of areaOrder) {
			if (hasValue(values[areaName])) {
				return true;
			}
		}

		return false;
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

	function resolveRows(rows: string | undefined, size: string | undefined): string {
		return resolveTracks(rows ?? size, 'auto auto auto');
	}

	function resolveCols(cols: string | undefined, size: string | undefined, grid: GridValue): string {
		return resolveTracks(
			cols ?? size,
			grid === 'inline' ? 'auto auto auto' : 'auto minmax(0, 1fr) auto'
		);
	}

	function resolveTracks(value: string | undefined, fallback: string): string {
		const tracks = readTracks(value?.trim() || fallback);

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

	function readTracks(value: string): string[] {
		const protectedSpace = '\u0000';
		let depth = 0;
		const normalized = value
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/[()[\]]| /g, (char) => {
				if (char === '(' || char === '[') {
					depth += 1;
				}

				if (char === ')' || char === ']') {
					depth = Math.max(0, depth - 1);
				}

				return char === ' ' && depth > 0 ? protectedSpace : char;
			});

		return normalized
			.split(' ')
			.filter(Boolean)
			.map((track) => track.replaceAll(protectedSpace, ' '));
	}

	function getAreaMeta(name: AreaName) {
		return areaMeta[name];
	}

	function getTag(name: AreaName) {
		return snippets[name]?.tag ?? getAreaMeta(name).tag;
	}

	function getClasses(name: AreaName) {
		return mergeClasses(getAreaMeta(name).position, snippets[name]?.class);
	}
</script>

{#snippet layout()}
	{#each areaOrder as areaName (areaName)}
		{@const meta = getAreaMeta(areaName)}
		{@const value = areaValues[areaName]}

		{#if debug}
			<div class="{meta.position} debug">{meta.label}</div>
		{/if}

		{#if hasValue(value)}
			<svelte:element this={getTag(areaName)} class={getClasses(areaName)}>
				{#if isSnippet(value)}
					{@render value()}
				{:else}
					{value}
				{/if}
			</svelte:element>
		{/if}
	{/each}
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
			background: #ccc;

			&:is(div) { background: #bfdbfe; }
			&:is(section) { background: #bbf7d0; }
			&:is(article) { background: #fecaca; }
			&:is(main) { background: #fde68a; }
			&:is(header) { background: #ddd6fe; }
			&:is(footer) { background: #fbcfe8; }

			&:is(a) { background: #a7f3d0; }
			&:is(i) { background: #e9d5ff; }
			&:is(span) { background: #fef9c3; }
			&:is(strong) { background: #fecdd3; }
			&:is(button) { background: #e5e7eb; }
			&:is(b) { background: #93c5fd; }
		}

		.top-left { grid-area: top-left; }
		.top { grid-area: top; }
		.top-right { grid-area: top-right; }
		.left { grid-area: left; }
		.center { grid-area: center; }
		.right { grid-area: right; }
		.bottom-left { grid-area: bottom-left; }
		.bottom { grid-area: bottom; }
		.bottom-right { grid-area: bottom-right; }

		.btn {
			margin: 0.5rem;
			padding: 0.75rem;
			border-radius: 10px;
		}
	}
</style>