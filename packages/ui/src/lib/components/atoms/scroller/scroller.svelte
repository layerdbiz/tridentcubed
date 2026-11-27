<script lang="ts">
	/**
	 * @tags scroll, fade, list, overflow
	 */
	// The scroller: a box whose content scrolls and fades out at the edges it is told, instead of stopping at a hard
	// line (Justin, 2026-11-27: "a linear gradient scroll, to where it fades to nothing"). `fade` names the edges: `y`
	// for the top and the bottom, `x` for the left and the right, `all`, or a list of them. Each edge fades only as
	// far as there is more to see past it: at the very top the top shows whole, and the fade grows with the first
	// `depth` pixels scrolled (the app's rule since 2026-11-16, fade.ts); at the very end the end shows whole. With no
	// `fade` it is a plain scrolling box.
	//
	// It is the base component, and its look is set from outside (Justin, 2026-11-26): the box takes `class`, `size`
	// and everything else given, its colours included. The fade is a mask, so whatever lies behind shows through it.
	import type { Snippet } from 'svelte';
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
		children?: Snippet;
	}

	let { axis = 'y', fade = [], depth = 56, children, ...props }: ScrollerProps = $props();

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

	// How far each named edge fades now: how much more there is to see past it, up to `depth`.
	const follow: Attachment<HTMLElement> = (node) => {
		const named = edges;
		const deep = depth;
		function measure() {
			const past = {
				top: node.scrollTop,
				bottom: node.scrollHeight - node.clientHeight - node.scrollTop,
				left: node.scrollLeft,
				right: node.scrollWidth - node.clientWidth - node.scrollLeft
			};
			for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
				const size = named.includes(edge) ? Math.min(Math.max(past[edge], 0), deep) : 0;
				node.style.setProperty(`--scroller-${edge}`, `${Math.round(size)}px`);
			}
		}
		measure();
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
		:global(.scroller-y) {
			mask-image: linear-gradient(
				to bottom,
				transparent,
				black var(--scroller-top, 0px),
				black calc(100% - var(--scroller-bottom, 0px)),
				transparent
			);
		}
		:global(.scroller-x) {
			mask-image: linear-gradient(
				to right,
				transparent,
				black var(--scroller-left, 0px),
				black calc(100% - var(--scroller-right, 0px)),
				transparent
			);
		}
		:global(.scroller-xy) {
			mask-image:
				linear-gradient(
					to bottom,
					transparent,
					black var(--scroller-top, 0px),
					black calc(100% - var(--scroller-bottom, 0px)),
					transparent
				),
				linear-gradient(
					to right,
					transparent,
					black var(--scroller-left, 0px),
					black calc(100% - var(--scroller-right, 0px)),
					transparent
				);
			mask-composite: intersect;
		}
	}
</style>
