<script lang="ts">
	// A day's changes in What's New (#363, #399): each kind under its heading with a rule, the way Discord's changelog
	// sets its sections (Justin's screenshot, 2026-11-26), Features, then Fixes, and only those two (Justin,
	// 2026-11-27). Each bullet sits in a column as wide as its heading's icon, centred on the first line, so the icons,
	// the bullets and the words line up. A change that landed after the last press on What's New's button (`seenAt`)
	// says New.
	import { Chip } from '@layerd/ui';
	import type { HistoryChangeType } from './history.utils';
	import type { ChangeKindType } from './releases.utils';

	let { changes, seenAt = -1 }: { changes: HistoryChangeType[]; seenAt?: number } = $props();

	const SECTIONS: { kind: ChangeKindType; label: string; icon: string; tone: string }[] = [
		{
			kind: 'feature',
			label: 'Features',
			icon: 'icon-[mdi--star-four-points-outline]',
			tone: 'text-emerald-600 after:bg-emerald-500/60'
		},
		{
			kind: 'fix',
			label: 'Fixes',
			icon: 'icon-[mdi--wrench-outline]',
			tone: 'text-sky-600 after:bg-sky-500/60'
		}
	];

	const sections = $derived(
		SECTIONS.map((section) => ({
			...section,
			changes: changes.filter((change) => change.kind === section.kind)
		})).filter((section) => section.changes.length > 0)
	);
</script>

{#each sections as section (section.kind)}
	<h3
		class="mt-4 flex items-center gap-3 text-xs font-bold tracking-wide uppercase after:h-0.5 after:flex-1 after:rounded-full first:mt-1 {section.tone}"
	>
		<span
			class="{section.icon} size-4 shrink-0"
			aria-hidden="true"
		></span>{section.label}
	</h3>
	<ul class="mt-2.5 space-y-2.5">
		{#each section.changes as change (change.text)}
			{@const isNew = seenAt >= 0 && change.landed > seenAt}
			<li class="text-[15px] leading-snug text-slate-700">
				<p class="flex gap-3">
					<span
						class="flex h-[1lh] w-4 shrink-0 items-center justify-center"
						aria-hidden="true"
						><span class="size-1.5 rounded-full {isNew ? 'bg-emerald-500' : 'bg-slate-400'}"
						></span></span
					>
					<span class="min-w-0 flex-1"
						>{change.text}{#if isNew}<Chip
								label="New"
								class="ml-2 inline-block bg-emerald-50 px-1.5 py-0 align-[0.1em] text-[11px] font-semibold text-emerald-700"
							/>{/if}</span
					>
				</p>
				{#if change.pictures?.length}
					<div class="mt-2 grid gap-2 pl-7">
						{#each change.pictures as picture (picture)}
							<img
								class="w-full rounded-xl border border-slate-200"
								src={picture}
								alt="Before and after: {change.text}"
								loading="lazy"
							/>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/each}
