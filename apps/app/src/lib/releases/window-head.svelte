<script lang="ts">
	// The head of What's New and the new version window (#363, #396): the title, a quieter line under it, and a close
	// at the left, over a rule, as Discord's changelog has it.
	import { Button } from '@layerd/ui';

	let { title, note, onclose }: { title: string; note: string; onclose: () => void } = $props();
</script>

<header
	class="relative -mx-5 flex shrink-0 flex-col items-center border-b border-slate-200 px-14 pb-3 text-center"
>
	<Button
		secondary
		ghost
		md
		icon="icon-[mdi--close]"
		aria-label="Close"
		class="absolute! top-0 left-3"
		onclick={onclose}
	/>
	<h2 class="text-xl font-bold text-slate-900">{title}</h2>
	{#if note}<p class="text-sm text-slate-500">{note}</p>{/if}
</header>
