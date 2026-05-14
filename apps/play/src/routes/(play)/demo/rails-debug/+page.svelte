<script lang="ts">
	import { page } from '$app/state';
	import { Component } from '@layerd/ui';

	const surfaceClass = 'gap-4 rounded-2xl bg-slate-50 p-4';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
	const debugPairs = [
		{
			rail: 'gutter-lg',
			inset: undefined,
			label: 'rail="gutter-lg"',
			className: 'rounded-xl bg-sky-200 px-4 py-5 text-slate-950'
		},
		{
			rail: 'content',
			inset: 'lg',
			label: 'rail="content" inset="lg"',
			className: 'rounded-xl bg-violet-200 px-4 py-5 text-slate-950'
		},
		{
			rail: 'full',
			inset: 'lg',
			label: 'rail="full" inset="lg"',
			className: 'rounded-xl bg-rose-200 px-4 py-5 text-slate-950'
		}
	];
</script>

<svelte:head>
	<title>Rails Debug | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h1 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Rails Debug</h1>

	<h2 class="text-2xl font-black tracking-tight text-slate-950">1. rails=&quot;xl&quot; + debug rails</h2>
	<Component
		tag="section"
		rails="xl"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="sm" class="rounded-xl bg-slate-950 px-4 py-5 font-black text-white" />
		<Component rail="left-lg" class="rounded-xl bg-amber-200 px-4 py-5 font-black text-slate-950" />
		<Component rail="gutter-lg" class="rounded-xl bg-sky-200 px-4 py-5 font-black text-slate-950" />
	</Component>

	<h2 class="text-2xl font-black tracking-tight text-slate-950">1. rails=&quot;xl&quot; + debug rails</h2>
	<Component
		tag="section"
		rails="xl"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="sm" class="rounded-xl bg-slate-950 px-4 py-5 font-black text-white" />
		<Component rail="left-lg" class="rounded-xl bg-amber-200 px-4 py-5 font-black text-slate-950" />
		<Component rail="gutter-lg" class="rounded-xl bg-sky-200 px-4 py-5 font-black text-slate-950" />
	</Component>

	<h2 class="text-2xl font-black tracking-tight text-slate-950">2. gutter rail vs content inset vs full inset</h2>
	{#each debugPairs as entry (entry.label)}
		<p class="text-sm font-black text-slate-700">{entry.label}</p>
		<Component
			tag="section"
			rails="full"
			debug={showRailsDebug ? { rails: true } : false}
			class={surfaceClass}
		>
			<Component rail={entry.rail} inset={entry.inset} class={entry.className} />
		</Component>
	{/each}
</div>