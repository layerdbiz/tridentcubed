<!-- The controls (#342). On a desktop they float top right over the canvas, and the devices are laid out in the room
     beside them; on a phone they rise from the bottom in the library's Dialog. Library pieces only. -->
<script lang="ts">
	import { Button, Component, Dialog } from '@layerd/ui';
	import type { Snippet } from 'svelte';
	import { isWide } from './side.svelte';

	type DockProps = { isOpen: boolean; children: Snippet };

	let { isOpen = $bindable(), children }: DockProps = $props();
</script>

{#if isOpen}
	{#if isWide()}
		<Component
			tag="aside"
			aria-label="Controls"
			class="theme-base absolute top-3 right-3 z-30 flex max-h-[calc(100%-1.5rem)] w-[300px] flex-col overflow-hidden rounded-box border border-base-200-800 shadow-xl"
		>
			<div class="flex shrink-0 items-center gap-2 border-b border-base-200-800 py-1 ps-4 pe-1">
				<b class="flex-1 text-sm">Controls</b>
				<Button
					ghost
					sm
					variant="icon"
					icon="icon-[mdi--close]"
					label="Close the controls"
					aria-label="Close the controls"
					onclick={() => (isOpen = false)}
				/>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">{@render children()}</div>
		</Component>
	{:else}
		<Dialog
			label="Controls"
			variant="tall"
			class="theme-base"
			onclose={() => (isOpen = false)}
		>
			{#snippet header()}
				<b class="block px-4 pt-1 pb-2">Controls</b>
			{/snippet}
			{@render children()}
		</Dialog>
	{/if}
{/if}
