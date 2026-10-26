<script lang="ts">
	// PROTOTYPE (#161): where a project's trip starts, an arrow in the colour of its state, and where it ends
	// (Justin, 2026-10-26 19:22), from the Start and End stops of its Transport panel. `isLight` for over a photo.
	import { routeOf, STATUS, type ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';

	let {
		look,
		project,
		isLight = false
	}: { look: LookState; project: ProjectType; isLight?: boolean } = $props();

	const route = $derived(routeOf(project, look.facilities));
</script>

<span
	class="flex min-w-0 items-center gap-1 text-xs {isLight ? 'text-white/85' : 'text-slate-500'}"
	title={route.to ? `${route.from} to ${route.to}` : route.from}
>
	{#if route.to}
		<span class="min-w-0 truncate">{route.from}</span>
		<span class="icon-[mdi--arrow-right-thick] size-3.5 shrink-0 {STATUS[project.status].tone}"
		></span>
		<span class="min-w-0 truncate">{route.to}</span>
	{:else}
		<span
			class="icon-[mdi--map-marker] size-3.5 shrink-0 {isLight ? 'text-white' : 'text-slate-400'}"
		></span>
		<span class="min-w-0 truncate">{route.from}</span>
	{/if}
</span>
