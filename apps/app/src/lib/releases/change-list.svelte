<script lang="ts">
	// A list of new features and fixes (#363, #396), as What's New and the new version window show them: each kind
	// under its heading with a rule, the way Discord's changelog sets its sections (Justin's screenshot, 2026-11-26),
	// each change a line or two with its pictures under it when it has them.
	import type { ChangeKindType, ReleaseChangeType } from './releases.utils';

	let { changes }: { changes: ReleaseChangeType[] } = $props();

	const SECTIONS: { kind: ChangeKindType; label: string; icon: string; tone: string }[] = [
		{
			kind: 'feature',
			label: 'New features',
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
		class="mt-6 flex items-center gap-3 text-sm font-bold tracking-wide uppercase after:h-0.5 after:flex-1 after:rounded-full {section.tone}"
	>
		<span
			class="{section.icon} size-[18px] shrink-0"
			aria-hidden="true"
		></span>{section.label}
	</h3>
	<ul class="mt-3 space-y-3">
		{#each section.changes as change (change.text)}
			<li class="text-[15px] leading-snug text-slate-700">
				<p class="flex gap-2.5">
					<span
						class="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-slate-400"
						aria-hidden="true"
					></span>
					<span class="min-w-0 flex-1">{change.text}</span>
				</p>
				{#if change.pictures?.length}
					<div class="mt-2 grid gap-2 pl-4">
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
