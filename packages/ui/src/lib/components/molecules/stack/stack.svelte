<script lang="ts">
	/**
	 * @tags ui, avatar
	 */
	// A few avatars overlapping, the first in front and each of the others tucked behind the one before, then a count
	// of the rest (#379, moved from the app's face stack and logo stacks). It is the base component (Justin,
	// 2026-11-26), so `color`, `appearance` and `class` land on its box; like the avatar, it repeats in every dashboard
	// row, so it takes the base component's light path. The count's grey is still slate, listed in look.json.
	import {
		Avatar,
		Component,
		type AvatarProps,
		type ComponentProps,
		type ComponentRenderArgs
	} from '@layerd/ui';

	export interface StackItemType extends Omit<AvatarProps, 'size'> {
		// What tells one apart from the next: a name, an id.
		id: string;
	}

	export interface StackProps extends Omit<
		ComponentProps,
		'size' | 'items' | 'label' | 'children'
	> {
		items: StackItemType[];
		// Each avatar's width and height in pixels.
		size?: number;
		// How many show before the rest become a count.
		max?: number;
		// How far each tucks behind the one before, as a share of its size.
		overlap?: number;
		class?: string;
	}

	let {
		items,
		size = 32,
		max = 4,
		overlap = 0.32,
		class: className = '',
		...props
	}: StackProps = $props();

	const shown = $derived(items.slice(0, max));
</script>

<!-- Each avatar's props one by one, not spread, and no whitespace between the parts: it repeats in every row (#379,
     measured). The count of the rest is drawn by the stack itself, so the list is its only child. -->
<Component
	{...props}
	tag="span"
	class={`stack flex items-center ${className}`}
	>{#snippet component({ props: root }: ComponentRenderArgs)}<span
			{...root}
			style="--size: {size}px; --tuck: {-size * overlap}px"
			data-more={items.length > max ? `+${items.length - max}` : undefined}
			>{#each shown as item, index (item.id)}<span
					class="relative"
					data-slot
					title={item.title}
					style="z-index: {shown.length - index}; margin-left: {index ? -size * overlap : 0}px"
					><Avatar
						src={item.src}
						alt={item.alt}
						{size}
						shape={item.shape}
						fit={item.fit}
						ring={item.ring}
						isMuted={item.isMuted}
						presence={item.presence}
						badge={item.badge}
						fallback={item.fallback}
						crossorigin={item.crossorigin}
					/></span
				>{/each}</span
		>{/snippet}</Component
>

<style lang="postcss">
	@reference "#ui.css";

	/* The count of the rest, tucked behind the last like the others. */
	.stack[data-more]::after {
		content: attr(data-more);
		width: var(--size);
		height: var(--size);
		margin-left: var(--tuck);
		@apply relative flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-surface;
	}
</style>
