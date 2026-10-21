<script lang="ts">
	// PROTOTYPE (#161) look G: the three dashboard cards (Justin's notes 6 and 7). The icon sits on the left and
	// everything else to its right, the number over the label, so the cards stay short. A small question mark by the
	// label explains the card: a popover on hover with a mouse, a sheet from the bottom on a phone.
	import { fade, fly, scale } from 'svelte/transition';
	import { CLIENTS, DATASETS, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { TEAM } from './team.data';

	let { look }: { look: LookState } = $props();

	const SETS: DatasetType[] = ['projects', 'clients', 'team'];
	const HELP: Record<string, string> = {
		projects:
			'Every project in the workspace, whatever its status. The chart counts the ones still open, and the list below shows them all.',
		clients:
			'Companies Trident Cubed works for. A client counts once, however many projects they have. The chart counts clients with a project still open.',
		team: 'Everyone on the Trident Cubed team who can sign in. The chart counts the people working on a project that is still open.'
	};

	let hovered = $state<DatasetType>();
	let sheet = $state<DatasetType>();
	// A mouse gets the popover on hover; a finger gets the sheet.
	const hasHover =
		typeof window !== 'undefined' &&
		window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	function countOf(dataset: DatasetType) {
		if (dataset === 'projects') return look.projects.length;
		if (dataset === 'clients') return CLIENTS.length;
		return TEAM.length;
	}

	function ask(event: MouseEvent, dataset: DatasetType) {
		event.stopPropagation();
		if (hasHover) hovered = hovered === dataset ? undefined : dataset;
		else sheet = dataset;
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (sheet = hovered = undefined)} />

<div
	class="grid grid-cols-3 gap-2 md:gap-3"
	role="tablist"
	aria-label="What to count"
>
	{#each SETS as dataset (dataset)}
		{@const info = DATASETS[dataset]}
		{@const isOn = look.dataset === dataset}
		<div
			role="tab"
			tabindex="0"
			aria-selected={isOn}
			class="relative flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl p-2 transition duration-200 select-none md:gap-3 md:p-3 {hovered ===
			dataset
				? 'z-30'
				: ''} {isOn
				? 'bg-primary text-white shadow-lg shadow-primary/30'
				: 'bg-white text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_24px_-18px_rgb(15_23_42/0.3)] hover:-translate-y-0.5'}"
			onclick={() => look.pick(dataset)}
			onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && look.pick(dataset)}
		>
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-xl md:size-10 {isOn
					? 'bg-white/20'
					: 'bg-primary/10 text-primary'}"
				><span class="{isOn ? info.active : info.icon} size-[18px] md:size-5"></span></span
			>
			<span class="min-w-0 flex-1">
				<span class="block text-lg leading-tight font-semibold tabular-nums md:text-2xl"
					>{countOf(dataset)}</span
				>
				<span
					class="flex items-center gap-0.5 text-[11px] font-medium md:text-xs {isOn
						? 'text-white/85'
						: 'text-slate-500'}"
				>
					<span class="truncate">{info.label}</span>
					<button
						type="button"
						class="relative -m-1 flex shrink-0 items-center justify-center p-1 {isOn
							? 'text-white/70 hover:text-white'
							: 'text-slate-400 hover:text-slate-700'}"
						aria-label="What does {info.label} count?"
						onclick={(event) => ask(event, dataset)}
						onpointerenter={() => hasHover && (hovered = dataset)}
						onpointerleave={() => hasHover && (hovered = undefined)}
						><span class="icon-[mdi--help-circle-outline] size-3.5"></span></button
					>
				</span>
			</span>
			{#if hovered === dataset}
				<div
					class="pointer-events-none absolute top-full left-0 z-50 mt-2 w-64 rounded-2xl bg-slate-900 p-3 text-xs leading-relaxed text-white/90 shadow-xl"
					role="tooltip"
					transition:scale={{ start: 0.96, duration: 140 }}
				>
					<b class="mb-0.5 block text-sm text-white">{info.label}</b>{HELP[dataset]}
				</div>
			{/if}
		</div>
	{/each}
</div>

{#if sheet}
	{@const info = DATASETS[sheet]}
	<button
		type="button"
		class="fixed inset-0 z-[110] bg-slate-950/30"
		aria-label="Close"
		onclick={() => (sheet = undefined)}
		transition:fade={{ duration: 180 }}
	></button>
	<div
		class="fixed inset-x-0 bottom-0 z-[111] rounded-t-[28px] bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(15_23_42/0.18)]"
		role="dialog"
		aria-label="About {info.label}"
		transition:fly={{ y: 320, duration: 260 }}
	>
		<span class="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-slate-200"></span>
		<div class="flex items-center gap-3">
			<span class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
				><span class="{info.icon} size-6"></span></span
			>
			<p>
				<b class="block text-lg text-slate-900">{info.label}</b>
				<span class="text-sm text-slate-500">{countOf(sheet)} right now</span>
			</p>
		</div>
		<p class="mt-4 text-[15px] leading-relaxed text-slate-600">{HELP[sheet]}</p>
		<button
			type="button"
			class="mt-5 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white"
			onclick={() => (sheet = undefined)}>Got it</button
		>
	</div>
{/if}
