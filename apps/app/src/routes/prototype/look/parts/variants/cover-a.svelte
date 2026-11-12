<script lang="ts">
	// PROTOTYPE (#161) Report Cover, variant A: the cover's list as it was before run 19, one centred column of
	// icon, label and value. Run 20 (Justin, 2026-11-11) put its lines in the Project panel's order: Project Type,
	// Customer, Lead, then the Transport Mode panel's two, then the dates.
	export type CoverLineType = { label: string; value: string; icon: string };

	let { lines }: { lines: CoverLineType[] } = $props();
</script>

<dl
	class="mx-auto mt-12 grid w-fit max-w-[400px] grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2 text-left text-[12px]"
>
	{#each lines as line (line.label)}
		<span class="{line.icon} mt-px size-4 text-primary"></span>
		<dt class="font-semibold text-slate-900">{line.label}</dt>
		<dd
			class="line-clamp-2 pl-2 leading-snug {line.value
				? 'text-slate-600'
				: 'text-slate-300 italic'}"
		>
			{line.value || 'Not filled in yet'}
		</dd>
	{/each}
</dl>
