<script lang="ts">
	import { Board } from '#lib';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#key data.entry.href}
	<Board
		entry={data.entry}
		section="Library"
	/>
{/key}
