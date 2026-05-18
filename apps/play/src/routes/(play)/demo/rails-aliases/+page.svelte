<script lang="ts">
	import { page } from '$app/state';
	import { Component } from '@layerd/ui';
	const aliasGroups = [
		{
			title: 'center aliases',
			values: ['md']
		},
		{
			title: 'wide aliases',
			values: ['popout']
		},
		{
			title: 'directional rails',
			values: ['bleed-left', 'bleed-left-lg', 'bleed-right', 'bleed-right-xl']
		},
		{
			title: 'gutter rails',
			values: ['gutter-2', 'inset-sm', 'full-inset-sm', 'gutter-4', 'inset-lg', 'full-inset-lg']
		}
	];
	const surfaceClass = 'rounded-2xl bg-slate-50';
	const railClass = 'rounded-xl bg-slate-950 p-4 font-black text-white';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
</script>

<svelte:head>
	<title>Rails Aliases | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h1 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Rails Aliases</h1>

	{#each aliasGroups as group (group.title)}
		<h2 class="text-2xl font-black tracking-tight text-slate-950">{group.title}</h2>
		{#each group.values as value (value)}
			<p class="text-sm font-black text-slate-700">{value}</p>
			<Component
				tag="section"
				rails="full"
				debug={showRailsDebug ? { rails: true } : false}
				class={surfaceClass}
			>
				<Component rail={value} class={railClass} />
			</Component>
		{/each}
	{/each}
</div>