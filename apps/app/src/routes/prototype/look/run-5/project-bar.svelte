<script lang="ts">
	// PROTOTYPE (#161) run 8 (Justin's note 2): the top of an open project. The caller's row (back, title) on the left,
	// the project's percent at the right with its state under it in the state's colour, the way each panel shows
	// them, and the full-width bar under both.
	import type { Snippet } from 'svelte';
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look, children }: { look: LookState; children: Snippet } = $props();

	const status = $derived(STATUS[look.project.status]);
</script>

<div title="{look.overall}% of this project is done">
	<div class="flex items-center gap-2">
		<div class="flex min-w-0 flex-1 items-center gap-1">{@render children()}</div>
		<span class="shrink-0 text-right">
			<span class="block text-lg leading-tight font-semibold text-slate-900 tabular-nums"
				>{look.overall}%</span
			>
			<span class="block text-[10px] font-semibold tracking-[0.12em] uppercase {status.tone}"
				>{look.project.status}</span
			>
		</span>
	</div>
	<span class="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-900/[0.07]">
		<span
			class="block h-full rounded-full transition-[width] duration-500 {status.bar}"
			style="width: {look.overall}%"
		></span>
	</span>
</div>
