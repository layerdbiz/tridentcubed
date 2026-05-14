<script lang="ts">
	import { page } from '$app/state';
	import { Component } from '@layerd/ui';
	const surfaceClass = 'rounded-2xl bg-slate-50 p-4';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
	const gutterRails = [
		{ rail: 'gutter-xs', className: 'rounded-xl bg-sky-200 px-4 py-5 font-black text-slate-950' },
		{ rail: 'gutter-md', className: 'rounded-xl bg-sky-300 px-4 py-5 font-black text-slate-950' },
		{ rail: 'gutter-lg', className: 'rounded-xl bg-sky-400 px-4 py-5 font-black text-slate-950' },
		{ rail: 'gutter-xxl', className: 'rounded-xl bg-sky-500 px-4 py-5 font-black text-white' }
	];
	const contentInsets = [
		{ inset: '1', label: 'rail="content" inset="1"', className: 'rounded-xl bg-violet-200 px-4 py-5 text-slate-950' },
		{ inset: 'lg', label: 'rail="content" inset="lg"', className: 'rounded-xl bg-violet-300 px-4 py-5 text-slate-950' }
	];
	const fullInsets = [
		{ inset: '4', label: 'rail="full" inset="4"', className: 'rounded-xl bg-amber-200 px-4 py-5 text-slate-950' },
		{ inset: 'clamp(2rem, 8vw, 5rem)', label: 'rail="full" inset="clamp(...)"', className: 'rounded-xl bg-amber-300 px-4 py-5 text-slate-950' }
	];
</script>

<svelte:head>
	<title>Rails Gutters + Insets | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h1 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Rails Gutters + Insets</h1>

	<h2 class="text-2xl font-black tracking-tight text-slate-950">1. gutter rails</h2>
	{#each gutterRails as entry (entry.rail)}
		<p class="text-sm font-black text-slate-700">{entry.rail}</p>
		<Component
			tag="section"
			rails="full"
			debug={showRailsDebug ? { rails: true } : false}
			class={surfaceClass}
		>
			<Component rail={entry.rail} class={entry.className} />
		</Component>
	{/each}

	<h2 class="text-2xl font-black tracking-tight text-slate-950">2. content inset</h2>
	{#each contentInsets as entry (entry.label)}
		<p class="text-sm font-black text-slate-700">{entry.label}</p>
		<Component
			tag="section"
			rails="full"
			debug={showRailsDebug ? { rails: true } : false}
			class={surfaceClass}
		>
			<Component rail="content" inset={entry.inset} class={entry.className} />
		</Component>
	{/each}

	<h2 class="text-2xl font-black tracking-tight text-slate-950">3. full inset</h2>
	{#each fullInsets as entry (entry.label)}
		<p class="text-sm font-black text-slate-700">{entry.label}</p>
		<Component
			tag="section"
			rails="full"
			debug={showRailsDebug ? { rails: true } : false}
			class={surfaceClass}
		>
			<Component rail="full" inset={entry.inset} class={entry.className} />
		</Component>
	{/each}
</div>