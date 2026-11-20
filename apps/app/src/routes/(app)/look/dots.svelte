<script lang="ts">
	// The row of dots under a photo slider (#250): which dots to draw is slides.svelte.ts's `dotsOf`. White, for
	// over a photo. Nothing is drawn for a single photo.
	import { dotsOf } from './slides.svelte';

	let { at, count }: { at: number; count: number } = $props();

	const dots = $derived(dotsOf(at, count));
</script>

{#if count > 1}
	<span class="flex items-center justify-center gap-1.5">
		{#each dots as dot (dot.index)}
			<span
				class="rounded-full bg-white transition-all {dot.isLit
					? 'size-[7px]'
					: dot.isSmall
						? 'size-1 opacity-50'
						: 'size-1.5 opacity-50'}"
			></span>
		{/each}
	</span>
{/if}
