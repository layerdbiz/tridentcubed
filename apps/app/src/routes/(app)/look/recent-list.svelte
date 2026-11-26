<script lang="ts">
	// PROTOTYPE (#161) run 12: what happened lately, of any page, the same in the bell's notifications and the menu's
	// Recent (Justin's run 12 note 14): a new team member, a new customer, an edited project... A tap opens what it is
	// about. Run 14 (note 1): each row shows its page's own icon (the folder, the face, the group...), not the photo
	// or logo, and ends in the same ⋮ menu as the page's rows, so it can be opened, edited or deleted from here. The
	// icon takes the colour of the project's state, or of the record's first label, as in the lists (2026-11-10).
	// Run 16: the list is no longer written here. It is the eight things changed last, from their own stamps. The
	// menu's Pinned list (#346) draws its rows here too, given as `items`.
	// #383: each row is the library ListRow; its ⋮ stands beside it, since a button cannot hold another.
	import { ListRow } from '@layerd/ui';
	import { PAGE_ICONS, type RecentType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import { openItem, recentOf, toneOfItem } from './records.data';

	let {
		look,
		size = 36,
		width = 40,
		words = '',
		items,
		onpick
	}: {
		look: LookState;
		// The rows to draw, when they are not the Recents (the menu's Pinned list).
		items?: RecentType[];
		size?: number;
		// The width the icon centres in, so the menu's icons line up in one column.
		width?: number;
		words?: string;
		onpick?: () => void;
	} = $props();

	function open(item: RecentType) {
		onpick?.();
		openItem(look, item);
	}
</script>

{#each items ?? recentOf(look) as item (`${item.page}-${item.id ?? item.name}`)}
	<div class="flex w-full items-center rounded-2xl hover:bg-slate-900/[0.04]">
		<ListRow
			tag="button"
			class="flex-1 gap-2 py-1.5"
			title={item.name}
			onclick={() => open(item)}
			label={item.name}
			note={item.note}
			textClass={words}
			labelClass="text-sm text-slate-800"
			noteClass="text-xs text-slate-400"
		>
			{#snippet start()}<span
					class="flex shrink-0 justify-center"
					style="width: {width}px"
					><span
						class="relative flex items-center justify-center overflow-hidden rounded-full {toneOfItem(
							look,
							item
						)}"
						style="width: {size}px; height: {size}px"
						><!-- The circle is the icon's own colour, let through at a tenth (run 18). --><span
							class="absolute inset-0 bg-current opacity-[0.12]"
						></span><span class="{PAGE_ICONS[item.page]} relative size-[55%]"></span></span
					></span
				>{/snippet}
		</ListRow>
		<span class="shrink-0 {words}">
			<MoreMenu
				{look}
				page={item.page}
				id={item.id ?? item.name}
				isOpenable
				onact={onpick}
			/>
		</span>
	</div>
{/each}
