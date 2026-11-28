<script lang="ts">
	// A day's changes in What's New (#363, #399): each kind under its heading with a rule, the way Discord's changelog
	// sets its sections (Justin's screenshot, 2026-11-26), Features, then Fixes, and only those two (Justin,
	// 2026-11-27). Each bullet sits in a column as wide as its heading's icon, centred on the first line, so the icons,
	// the bullets and the words line up. Every line of a release looks the same (Justin, 2026-11-27): what is new to
	// this person is told once, at the top of What's New, never line by line. The bullets wear their kind's colour,
	// light (Justin, 2026-11-27): green for a feature, blue for a fix, the theme's success and info (KIND_COLORS).
	// A release on dev tells each feature or fix under a short bold title in the dark text, with its highlights on those
	// bullets under it (Justin, 2026-11-28; highlights.ts); the title starts where the heading's icon does.
	import type { HistoryChangeType } from './history.utils';
	import { KIND_COLORS } from './releases.constants';
	import type { ChangeKindType } from './releases.utils';

	let { changes }: { changes: HistoryChangeType[] } = $props();

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

<!-- A bullet in a column as wide as the heading's icon, centred on the first line, in its kind's light colour. -->
{#snippet bullet(kind: ChangeKindType)}
	<span
		class="flex h-[1lh] w-4 shrink-0 items-center justify-center"
		aria-hidden="true"><span class="size-1.5 rounded-full {KIND_COLORS[kind].bullet}"></span></span
	>
{/snippet}

{#each sections as section (section.kind)}
	<h3
		class="mt-4 flex items-center gap-3 text-xs font-bold tracking-wide uppercase after:h-0.5 after:flex-1 after:rounded-full first:mt-1 {section.tone}"
	>
		<span
			class="{section.icon} size-4 shrink-0"
			aria-hidden="true"
		></span>{section.label}
	</h3>
	<ul
		class="mt-2.5 {section.changes.some((change) => change.points) ? 'space-y-4' : 'space-y-2.5'}"
	>
		{#each section.changes as change (change.text)}
			<li class="text-[15px] leading-snug text-slate-700">
				{#if change.points}
					<p class="font-bold text-slate-900">{change.text}</p>
					<ul class="mt-1.5 space-y-1.5">
						{#each change.points as point (point)}
							<li class="flex gap-3">
								{@render bullet(section.kind)}
								<span class="min-w-0 flex-1">{point}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="flex gap-3">
						{@render bullet(section.kind)}
						<span class="min-w-0 flex-1">{change.text}</span>
					</p>
				{/if}
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
