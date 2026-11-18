<script lang="ts">
	// PROTOTYPE (#161) Report Cover, variant A: the cover's list as it was before run 19, one centred column of
	// icon, label and value. Run 20 (Justin, 2026-11-11) put its lines in the Project panel's order: Project Type,
	// Customer, Lead, then the Transport Mode panel's two, then the dates.
	// #217 (Justin, 2026-11-18): Team Members in place of the Lead, as the app's stacked faces, the lead in front and
	// the assigned team behind; Created Date and Completed Date in place of Dates. #225: the faces stand alone, with
	// no names beside them, and the list no longer sets its own gap above: the cover stands it on the band's floor.
	import Faces from '../faces.svelte';

	export type CoverLineType = {
		label: string;
		value: string;
		icon: string;
		// The people the line names, lead first: their faces stand in place of the value.
		names?: string[];
	};

	let { lines }: { lines: CoverLineType[] } = $props();
</script>

<dl
	class="mx-auto grid w-fit max-w-[400px] grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2 text-left text-[12px]"
>
	{#each lines as line (line.label)}
		<span class="{line.icon} mt-px size-4 text-primary"></span>
		<dt class="font-semibold text-slate-900">{line.label}</dt>
		{#if line.names?.length}
			<dd class="-my-0.5 flex min-w-0 items-center pl-2">
				<Faces
					names={line.names}
					size={20}
					max={8}
					hasPresence={false}
				/>
			</dd>
		{:else}
			<dd
				class="line-clamp-2 pl-2 leading-snug {line.value
					? 'text-slate-600'
					: 'text-slate-300 italic'}"
			>
				{line.value || 'Not filled in yet'}
			</dd>
		{/if}
	{/each}
</dl>
