<script lang="ts">
	import { page } from '$app/state';
	import { Component } from '@layerd/ui';
	const railWidths = [
		'xs',
		'sm',
		'content',
		'lg',
		'xl',
		'xxl',
		'full'
	];
	const gutterWidths = [
		'xs',
		'sm',
		'md',
		'lg',
		'xl',
		'xxl'
	];
	const surfaceClass = 'rounded-2xl bg-slate-50 p-4';
	const railClass = 'rounded-xl bg-sky-200 px-4 py-5 font-black text-slate-950';
	const showRailsDebug = $derived(page.url.searchParams.get('railsDebug') === '1');
</script>

<svelte:head>
	<title>Rails Widths | Play</title>
</svelte:head>

<div class="grid gap-4 p-4 md:p-5">
	<h2 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Quick Example</h2>

	<Component
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="xs" class={railClass} />
	</Component>
</div>

<div class="grid gap-4 p-4 md:p-5">
	<h2 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Rails Widths</h2>

	<Component
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		{#each railWidths as rail (rail)}
			<Component rail={rail} class={railClass} />
		{/each}
	</Component>
</div>

<div class="grid gap-4 p-4 md:p-5">
	<h2 class="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Gutter Widths</h2>

	<Component
		rails="full"
		debug={showRailsDebug ? { rails: true } : false}
		class={surfaceClass}
	>
		<Component rail="full" class={railClass} />
		{#each gutterWidths as rail (rail)}
			<Component rail="gutter-{rail}" class={railClass} />
		{/each}
	</Component>
</div>