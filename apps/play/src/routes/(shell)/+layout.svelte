<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Shell } from '#lib';

	let { children }: { children: Snippet } = $props();
</script>

<Shell>{@render children()}</Shell>
