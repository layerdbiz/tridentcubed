<script lang="ts">
	// PROTOTYPE (#161) run 12: what happened lately, of any page, the same in the bell's notifications and the menu's
	// Recent (Justin's run 12 note 14): a new team member, a new customer, an edited project... Every icon is a full
	// circle: the customer's logo, the person's photo, or the page's icon. A tap opens what it is about.
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import { PAGE_ICONS, RECENT, type RecentType } from './look.data';
	import type { LookState } from './look.state.svelte';

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
	<button
		class="flex w-full items-center gap-2 rounded-2xl py-1.5 pr-2 text-left hover:bg-slate-900/[0.04]"
		title={item.name}
		onclick={() => open(item)}
	>
		<span
			class="flex shrink-0 justify-center"
			style="width: {width}px"
		>
			{#if item.page === 'team'}
				<Avatar
					name={item.name}
					{size}
					hasPresence={false}
				/>
			{:else if item.page === 'customers'}
				<ClientLogo
					name={item.name}
					{size}
					shape="circle"
				/>
			{:else}
				<span
					class="flex items-center justify-center rounded-full {item.page === 'projects'
						? 'bg-primary/10 text-primary'
						: 'bg-slate-900 text-white'}"
					style="width: {size}px; height: {size}px"
					><span class="{PAGE_ICONS[item.page].active} size-1/2"></span></span
				>
			{/if}
		</span>
		<span class="min-w-0 flex-1 {words}">
			<span class="block truncate text-sm text-slate-800">{item.name}</span>
			<span class="block truncate text-xs text-slate-400">{item.note}</span>
		</span>
	</button>
{/each}
