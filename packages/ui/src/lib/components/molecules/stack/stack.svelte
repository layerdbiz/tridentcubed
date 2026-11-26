<script lang="ts">
	/**
	 * @tags ui, avatar
	 */
	// A few avatars overlapping, the first in front and each of the others tucked behind the one before, then a count
	// of the rest (#379, moved from the app's face stack and logo stacks). Like the avatar, it repeats in every
	// dashboard row, so it is plain spans with no base component (#365 item 7).
	import { Avatar, type AvatarProps } from '@layerd/ui';

	export interface StackItemType extends Omit<AvatarProps, 'size'> {
		// What tells one apart from the next: a name, an id.
		id: string;
	}

	export interface StackProps {
		items: StackItemType[];
		// Each avatar's width and height in pixels.
		size?: number;
		// How many show before the rest become a count.
		max?: number;
		// How far each tucks behind the one before, as a share of its size.
		overlap?: number;
		class?: string;
	}

	let { items, size = 32, max = 4, overlap = 0.32, class: className = '' }: StackProps = $props();

	const shown = $derived(items.slice(0, max));
	const more = $derived(items.length - shown.length);
	const tuck = $derived(-size * overlap);
</script>

<span class="flex items-center {className}">
	{#each shown as { id, title, ...item }, index (id)}
		<span
			class="relative"
			data-slot
			{title}
			style="z-index: {shown.length - index}; margin-left: {index ? tuck : 0}px"
		>
			<Avatar
				{...item}
				{size}
			/>
		</span>
	{/each}
	{#if more > 0}
		<span
			class="relative flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 ring-2 ring-white"
			style="width: {size}px; height: {size}px; margin-left: {tuck}px">+{more}</span
		>
	{/if}
</span>
