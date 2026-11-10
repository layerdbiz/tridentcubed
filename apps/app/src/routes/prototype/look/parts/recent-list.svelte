<script lang="ts">
	// PROTOTYPE (#161) run 12: what happened lately, of any page, the same in the bell's notifications and the menu's
	// Recent (Justin's run 12 note 14): a new team member, a new customer, an edited project... A tap opens what it is
	// about. Run 14 (note 1): each row shows its page's own icon (the folder, the face, the group...), not the photo
	// or logo, and ends in the same ⋮ menu as the page's rows, so it can be opened, edited or deleted from here.
	import { PAGE_ICONS, RECENT, type RecentType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';

	let {
		look,
		size = 36,
		width = 40,
		words = '',
		onpick
	}: {
		look: LookState;
		size?: number;
		// The width the icon centres in, so the menu's icons line up in one column.
		width?: number;
		words?: string;
		onpick?: () => void;
	} = $props();

	function open(item: RecentType) {
		onpick?.();
		if (item.page === 'projects') {
			if (look.projects.some((project) => project.id === item.id)) look.open(item.id!);
		} else if (look.has(item.page, item.name)) look.openRecord(item.page, item.name);
		else look.say(`${item.name} is no longer there`);
	}
</script>

{#each RECENT as item (item.name)}
	<div class="flex w-full items-center rounded-2xl hover:bg-slate-900/[0.04]">
		<button
			class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
			title={item.name}
			onclick={() => open(item)}
		>
			<span
				class="flex shrink-0 justify-center"
				style="width: {width}px"
			>
				<span
					class="flex items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-900"
					style="width: {size}px; height: {size}px"
					><span class="{PAGE_ICONS[item.page]} size-[55%]"></span></span
				>
			</span>
			<span class="min-w-0 flex-1 {words}">
				<span class="block truncate text-sm text-slate-800">{item.name}</span>
				<span class="block truncate text-xs text-slate-400">{item.note}</span>
			</span>
		</button>
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
