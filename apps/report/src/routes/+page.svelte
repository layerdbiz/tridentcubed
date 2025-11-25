<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSlidesData } from '$lib/slides/slides.remote';
	import { onMount } from 'svelte';

	// Fetch all slides (prerender function uses .current)
	const allSlides = getSlidesData().current ?? [];

	// Redirect to first slide on mount
	onMount(() => {
		if (allSlides.length > 0) {
			goto(`/${allSlides[0].slug}`, { replaceState: true });
		}
	});
</script>

<div class="flex h-svh max-h-svh items-center justify-center">
	<div class="text-center">
		<h1 class="mb-4 text-2xl font-bold text-neutral-600">Loading Slideshow...</h1>
		{#if allSlides.length === 0}
			<p class="text-neutral-500">No slides found.</p>
		{/if}
	</div>
</div>
