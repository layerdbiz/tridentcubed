<script lang="ts">
	// PROTOTYPE (#161) run 5, B only: the whole project's percent as a full-width bar under the header, like the
	// dashboard's project bars (Justin's note 25), so it reads apart from each panel's ring.
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look }: { look: LookState } = $props();
</script>

<span
	class="flex w-full items-center gap-2"
	title="{look.overall}% of this project is done"
>
	<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/[0.07]">
		<span
			class="block h-full rounded-full transition-[width] duration-500 {STATUS[look.project.status]
				.bar}"
			style="width: {look.overall}%"
		></span>
	</span>
	<span class="w-9 text-right text-xs font-semibold text-slate-600 tabular-nums"
		>{look.overall}%</span
	>
</span>
