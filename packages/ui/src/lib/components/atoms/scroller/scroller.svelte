<script lang="ts">
	/**
	 * @tags scroll, fade, list, overflow
	 */
	// The scroller: a box whose content scrolls and fades out at the edges it is told, instead of stopping at a hard
	// line (Justin, 2026-11-27: "a linear gradient scroll, to where it fades to nothing"). `fade` names the edges: `y`
	// for the top and the bottom, `x` for the left and the right, `all`, or a list of them. Each edge fades only as
	// far as there is more to see past it: at the very top the top shows whole, and the fade grows with the first
	// `depth` pixels scrolled (the app's rule since 2026-11-16; every list in the app fades through here); at the very
	// end the end shows whole. With no `fade` it is a plain scrolling box. `inset` starts a fade that far in from its
	// edge, leaving a strip there whole for a heading that sticks to it (#403: the Notifications' Today, Yesterday...),
	// so the heading shows whole and what scrolls fades away under it. `keep` names, as a selector, what inside never
	// fades wherever it stands (Justin, 2026-11-27: "It should not fade the sticky text. It should only fade the
	// notifications"): a heading on its way up through the fade shows whole, as it does once it sticks.
	//
	// It is the base component, and its look is set from outside (Justin, 2026-11-26): the box takes `class`, `size`
	// and everything else given, its colours included. The fade is a mask, so whatever lies behind shows through it.
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	/** An edge a scroller can fade at. */
	export type ScrollerEdgeType = 'top' | 'bottom' | 'left' | 'right';

	export interface ScrollerProps extends Omit<ComponentProps, 'children'> {
		/** Which way it scrolls: down (`y`, unless told), across (`x`) or both. */
		axis?: 'x' | 'y' | 'both';
		/** The edges that fade: `y` (top and bottom), `x` (left and right), `all`, or a list of them. */
		fade?: 'x' | 'y' | 'all' | ScrollerEdgeType[];
		/** How deep a fade grows, in pixels, once there is that much more to see past its edge. */
		depth?: number;
		/** How far in from each edge its fade starts, in pixels: room for a heading that sticks to that edge. */
		inset?: Partial<Record<ScrollerEdgeType, number>>;
		/** What inside never fades, as a selector: a heading, whole wherever it stands. */
		keep?: string;
		children?: Snippet;
	}

	let {
		axis = 'y',
		fade = [],
		depth = 56,
		inset = {},
		keep = '',
		children,
		...props
	}: ScrollerProps = $props();

	const EDGES: Record<string, ScrollerEdgeType[]> = {
		x: ['left', 'right'],
		y: ['top', 'bottom'],
		all: ['top', 'bottom', 'left', 'right']
	};
	const edges = $derived(typeof fade === 'string' ? EDGES[fade] : fade);
	const isFadingY = $derived(edges.includes('top') || edges.includes('bottom'));
	const isFadingX = $derived(edges.includes('left') || edges.includes('right'));
	const overflow = $derived(
		axis === 'both'
			? 'overflow-auto'
			: axis === 'x'
				? 'overflow-x-auto overflow-y-hidden'
				: 'overflow-y-auto overflow-x-hidden'
	);
	const mask = $derived(
		isFadingX && isFadingY
			? 'scroller-xy'
			: isFadingX
				? 'scroller-x'
				: isFadingY
					? 'scroller-y'
					: ''
	);

	// How far each edge fades now, in whole pixels: how much more there is to see past it, up to `depth`. Drawn as
	// the box's own style, so a style handed in from outside, one that changes too, sits beside it and never wipes it.
	const shown = $state({ top: 0, bottom: 0, left: 0, right: 0 });
	// Where what `keep` names stands in the box now, in whole pixels: each a layer of the mask that shows whole.
	let kept = $state.raw<{ x: number; y: number; width: number; height: number }[]>([]);

	// The mask's layers for what is kept: one solid layer each, sized and placed on it, added to the fades.
	function keptLayers(each: (rect: (typeof kept)[number]) => string) {
		return kept.length ? kept.map(each).join(', ') : undefined;
	}

	const follow: Attachment<HTMLElement> = (node) => {
		const named = edges;
		const deep = depth;
		const selector = keep;
		// What is kept and in view, measured against the box: the mask stands still while what it holds scrolls.
		function measureKept() {
			if (!selector) return;
			const box = node.getBoundingClientRect();
			kept = [...node.querySelectorAll(selector)]
				.map((each) => each.getBoundingClientRect())
				.filter((rect) => rect.height > 0 && rect.bottom > box.top && rect.top < box.bottom)
				.map((rect) => ({
					x: Math.round(rect.left - box.left),
					y: Math.round(rect.top - box.top),
					width: Math.round(rect.width),
					height: Math.round(rect.height)
				}));
		}
		function measure() {
			const past = {
				top: node.scrollTop,
				bottom: node.scrollHeight - node.clientHeight - node.scrollTop,
				left: node.scrollLeft,
				right: node.scrollWidth - node.clientWidth - node.scrollLeft
			};
			for (const edge of ['top', 'bottom', 'left', 'right'] as const)
				shown[edge] = named.includes(edge)
					? Math.round(Math.min(Math.max(past[edge], 0), deep))
					: 0;
			measureKept();
		}
		untrack(measure);
		if (named.length === 0) return;
		node.addEventListener('scroll', measure, { passive: true });
		// What it holds may grow or shrink (a section opens, a list arrives): the end may move.
		const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
		resize?.observe(node);
		for (const child of node.children) resize?.observe(child);
		return () => {
			node.removeEventListener('scroll', measure);
			resize?.disconnect();
		};
	};
</script>

<Component
	{...props}
	tag="div"
	>{#snippet component({ props: root }: { props: ComponentReturn })}<div
			{...root}
			class="scroller {overflow} {mask} {root.class}"
			data-fade={edges.join(' ') || undefined}
			style:--scroller-top="{shown.top}px"
			style:--scroller-bottom="{shown.bottom}px"
			style:--scroller-left="{shown.left}px"
			style:--scroller-right="{shown.right}px"
			style:--scroller-inset-top="{inset.top ?? 0}px"
			style:--scroller-inset-bottom="{inset.bottom ?? 0}px"
			style:--scroller-inset-left="{inset.left ?? 0}px"
			style:--scroller-inset-right="{inset.right ?? 0}px"
			style:--scroller-keep-image={keptLayers(() => 'linear-gradient(black, black)')}
			style:--scroller-keep-size={keptLayers((rect) => `${rect.width}px ${rect.height}px`)}
			style:--scroller-keep-position={keptLayers((rect) => `${rect.x}px ${rect.y}px`)}
			style:--scroller-keep-composite={keptLayers(() => 'add')}
			{@attach follow}
		>
			{@render children?.()}
		</div>{/snippet}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* The fades, in the components layer, where a place's own class beats it. An edge not named fades 0px: none. In a
	   mask, black is no colour that shows, only "keep this": the content shows where the mask is black, and fades
	   where it turns clear. */
	@layer components {
		/* Each gradient runs from one edge to the other: whole in the edge's inset strip, clear where the fade starts,
		   whole again once it has grown its depth, and the same backwards at the far edge. On top of the fades lie the
		   layers of what is kept (none unless told), each solid on its own place and added to them. */
		:global(.scroller-y),
		:global(.scroller-x),
		:global(.scroller-xy) {
			mask-repeat: no-repeat;
		}
		:global(.scroller-y) {
			mask-image:
				var(--scroller-keep-image, none),
				linear-gradient(
					to bottom,
					black var(--scroller-inset-top, 0px),
					transparent var(--scroller-inset-top, 0px),
					black calc(var(--scroller-inset-top, 0px) + var(--scroller-top, 0px)),
					black calc(100% - var(--scroller-inset-bottom, 0px) - var(--scroller-bottom, 0px)),
					transparent calc(100% - var(--scroller-inset-bottom, 0px)),
					black calc(100% - var(--scroller-inset-bottom, 0px))
				);
			mask-size: var(--scroller-keep-size, auto), auto;
			mask-position:
				var(--scroller-keep-position, 0 0),
				0 0;
			mask-composite: var(--scroller-keep-composite, add), add;
		}
		:global(.scroller-x) {
			mask-image:
				var(--scroller-keep-image, none),
				linear-gradient(
					to right,
					black var(--scroller-inset-left, 0px),
					transparent var(--scroller-inset-left, 0px),
					black calc(var(--scroller-inset-left, 0px) + var(--scroller-left, 0px)),
					black calc(100% - var(--scroller-inset-right, 0px) - var(--scroller-right, 0px)),
					transparent calc(100% - var(--scroller-inset-right, 0px)),
					black calc(100% - var(--scroller-inset-right, 0px))
				);
			mask-size: var(--scroller-keep-size, auto), auto;
			mask-position:
				var(--scroller-keep-position, 0 0),
				0 0;
			mask-composite: var(--scroller-keep-composite, add), add;
		}
		:global(.scroller-xy) {
			mask-image:
				var(--scroller-keep-image, none),
				linear-gradient(
					to bottom,
					black var(--scroller-inset-top, 0px),
					transparent var(--scroller-inset-top, 0px),
					black calc(var(--scroller-inset-top, 0px) + var(--scroller-top, 0px)),
					black calc(100% - var(--scroller-inset-bottom, 0px) - var(--scroller-bottom, 0px)),
					transparent calc(100% - var(--scroller-inset-bottom, 0px)),
					black calc(100% - var(--scroller-inset-bottom, 0px))
				),
				linear-gradient(
					to right,
					black var(--scroller-inset-left, 0px),
					transparent var(--scroller-inset-left, 0px),
					black calc(var(--scroller-inset-left, 0px) + var(--scroller-left, 0px)),
					black calc(100% - var(--scroller-inset-right, 0px) - var(--scroller-right, 0px)),
					transparent calc(100% - var(--scroller-inset-right, 0px)),
					black calc(100% - var(--scroller-inset-right, 0px))
				);
			mask-size: var(--scroller-keep-size, auto), auto, auto;
			mask-position:
				var(--scroller-keep-position, 0 0),
				0 0,
				0 0;
			mask-composite: var(--scroller-keep-composite, add), intersect, add;
		}
	}
</style>
