<!-- The shell's top bar (#342): the menu button, the page's name, and the page's own buttons on the right. It sits
     above the devices, never over them, so a prototype's own corner buttons stay free. Library pieces only. -->
<script lang="ts">
	import { Button, Component } from '@layerd/ui';
	import type { Snippet } from 'svelte';
	import { isSideShown, toggleSide } from './side.svelte';

	type BarProps = { section?: string; title: string; actions?: Snippet };

	let { section = '', title, actions }: BarProps = $props();
</script>

<Component
	tag="header"
	class="theme-base box-content flex h-12 shrink-0 items-center gap-1 border-b border-base-200-800 px-2"
	style="padding-top: env(safe-area-inset-top, 0px)"
>
	<Button
		ghost
		variant="icon"
		icon="icon-[mdi--menu]"
		label={isSideShown() ? 'Hide the menu' : 'Show the menu'}
		aria-label={isSideShown() ? 'Hide the menu' : 'Show the menu'}
		aria-expanded={isSideShown()}
		onclick={toggleSide}
	/>
	<h1 class="m-0 flex min-w-0 flex-1 items-baseline gap-2 text-[15px] whitespace-nowrap">
		{#if section}
			<span class="text-[11px] font-bold tracking-[0.08em] text-base-500-400 uppercase"
				>{section}</span
			>
		{/if}
		<span class="truncate font-bold">{title}</span>
	</h1>
	<div class="flex shrink-0 items-center gap-1">{@render actions?.()}</div>
</Component>
