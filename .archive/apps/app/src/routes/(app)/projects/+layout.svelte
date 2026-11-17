<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Component, Logo, Text } from '@layerd/ui';
	import * as projectDialog from './projects.dialog.svelte';

	let { children } = $props();

	async function handleOpenBetaDialog() {
		projectDialog.openPreviewIntro();

		if (page.params.projectId) {
			await goto('/projects');
		}
	}
</script>

{@render children()}

<Component
	id="openBetaDialog"
	tag="button"
	type="button"
	onclick={handleOpenBetaDialog}
	class="pointer-events fixed bottom-4 left-4 z-40 cursor-pointer gap-1.5 rounded-full bg-black py-0.75 pr-3 pl-1.5 md:bottom-6 md:left-6"
>
	{#snippet leftCC()}
		<Logo
			mode="current"
			class="size-6 text-warning-400"
		/>
	{/snippet}

	{#snippet centerCC()}
		<Text
			p="BETA"
			class="text-[11px] font-black tracking-[0.24em] text-white uppercase"
		/>
	{/snippet}
</Component>
