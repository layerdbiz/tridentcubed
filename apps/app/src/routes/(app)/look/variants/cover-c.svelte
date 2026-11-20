<script lang="ts">
	// Report Cover, look C (#247; Justin, 2026-11-19): the cover's list once the trip is drawn as a strip above
	// it. Customer, Company, Team Members, Project Type, Date Created, Date Completed; Transport Mode and Facility
	// are the strip's. A line's note (the customer's own number) follows its value in smaller, lighter words. Looks
	// A and B are kept beside it as they were.
	import Faces from '../faces.svelte';

	export type CoverLineType = {
		label: string;
		value: string;
		icon: string;
		note?: string;
		// The people the line names, lead first: their faces stand in place of the value.
		names?: string[];
	};

	let { lines }: { lines: CoverLineType[] } = $props();
</script>

<dl
	class="mx-auto grid w-fit max-w-[440px] grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2 text-left text-[12px]"
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
				class="line-clamp-2 pl-2 leading-snug tabular-nums {line.value
					? 'text-slate-600'
					: 'text-slate-300 italic'}"
			>
				{line.value || 'Not filled in yet'}
				{#if line.value && line.note}<span class="text-[10px] text-slate-500">{line.note}</span
					>{/if}
			</dd>
		{/if}
	{/each}
</dl>
