<script lang="ts">
	// PROTOTYPE (#161) run 18: Change Status (Justin, 2026-11-10: "a way to update the status for projects in
	// multiple different areas"). One sheet with every status in the order a project moves through them, opened
	// from any project's ⋮ menu and from the status on its Page. The ⋮ menu keeps its shortcuts (Mark Sent, Mark
	// Complete); this is for everything else, such as back to Review or on to Archived.
	import BottomSheet from './bottom-sheet.svelte';
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { STATES } from './records.data';

	let { look }: { look: LookState } = $props();

	const project = $derived(look.projects.find((item) => item.id === look.statusFor));
</script>

{#if project}
	<BottomSheet
		label="Change Status"
		onclose={() => (look.statusFor = undefined)}
	>
		<p class="text-lg font-semibold text-slate-900">Change Status</p>
		<p class="truncate text-sm text-slate-500">{project.title}</p>
		<div class="mt-4 space-y-1">
			{#each STATES as status (status)}
				{@const isOn = project.status === status}
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition {isOn
						? 'bg-primary/[0.08] font-semibold text-slate-900'
						: 'text-slate-700 hover:bg-slate-900/[0.04]'}"
					aria-pressed={isOn}
					onclick={() => {
						look.setStatus(project, status);
						look.statusFor = undefined;
					}}
				>
					<span class="size-3 shrink-0 rounded-full {STATUS[status].dot}"></span>
					<span class="flex-1">{status}</span>
					{#if isOn}<span class="icon-[mdi--check] size-5 text-primary"></span>{/if}
				</button>
			{/each}
		</div>
	</BottomSheet>
{/if}
