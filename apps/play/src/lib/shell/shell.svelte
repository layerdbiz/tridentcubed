<!-- The play shell (#342): the menu and the page beside it. On a phone the menu slides in over the page. Its colours
     are the UI library's theme; it brings none of its own. -->
<script lang="ts">
	import { Component } from '@layerd/ui';
	import type { Snippet } from 'svelte';
	import Sidebar from './sidebar.svelte';
	import { isSideShown, isWide, shutSide } from './side.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Component class="theme-base fixed inset-0 flex overflow-hidden [text-size-adjust:100%]">
	{#if isWide()}
		{#if isSideShown()}
			<div class="relative shrink-0"><Sidebar /></div>
		{/if}
	{:else}
		<div
			class="absolute inset-y-0 left-0 z-40 shadow-2xl transition-transform duration-200"
			class:-translate-x-full={!isSideShown()}
			class:shadow-none={!isSideShown()}
			inert={!isSideShown()}
		>
			<Sidebar />
		</div>
		{#if isSideShown()}
			<button
				type="button"
				class="absolute inset-0 z-39 border-0 bg-scrim"
				aria-label="Close the menu"
				onclick={shutSide}
			></button>
		{/if}
	{/if}
	<div class="flex min-h-0 min-w-0 flex-1 flex-col">{@render children()}</div>
</Component>
