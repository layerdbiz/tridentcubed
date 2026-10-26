<script lang="ts">
	// PROTOTYPE (#161): one panel with its progress and controls, opening like an accordion. A panel that can be left
	// out has a switch coloured by its state (to do grey, in progress blue, complete green); a required panel shows one
	// big lock instead, in the light grey of the progress ring's track whatever its state (Justin's run 9 note 22). Lock
	// and switch sit in the same width, so every panel's percent lines up (note 23). A photo panel
	// drags by its whole header, with no handle (notes 6 and 7). An added panel also has an X top right that asks
	// before deleting (LookState.confirm, the same dialog as every other delete).
	// Every style keeps the cards apart with room to breathe and draws no borders.
	// `soft` (D): white card on a soft shadow, control badge on the corner, bar under.
	// `flat` (E): white card with no shadow until it opens, control inline.
	// `ring` (F): the icon sits in its own progress ring, so the card needs no bar.
	// Run 11 (Justin, 2026-10-26 19:22): a Sent or Complete project is frozen. Every panel's icon and ring take the
	// state's colour (Sent purple, Complete green), a lock in that colour stands where the switch was, and nothing
	// inside opens for editing, drags or deletes (panel-list.svelte says why, with Unsend).
	import { slide } from 'svelte/transition';
	import { STATUS, type PanelType } from './look.data';
	import { metricsOf, toneOf, type LookState } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import ProgressRing from './progress-ring.svelte';

	let {
		look,
		panel,
		index,
		style = 'soft'
	}: {
		look: LookState;
		panel: PanelType;
		index: number;
		style?: 'soft' | 'flat' | 'ring';
	} = $props();

	const metrics = $derived(metricsOf(panel));
	const tone = $derived(toneOf(metrics.status));
	const isOpen = $derived(look.panelId === panel.id);
	const isLocked = $derived(panel.control === 'locked');
	const frozen = $derived(look.isFrozen ? look.project.status : undefined);
	const FROZEN_RINGS: Record<string, string> = {
		Sent: 'stroke-violet-500',
		Complete: 'stroke-success'
	};
	const TRACKS = {
		'To do': 'bg-slate-400',
		'In progress': 'bg-primary',
		Complete: 'bg-success',
		Off: 'bg-slate-300'
	};

	function toggleOpen() {
		look.panelId = isOpen ? '' : panel.id;
	}

	function toggleEnabled() {
		panel.isEnabled = !panel.isEnabled;
		look.saved();
	}

	const shell = $derived(
		style === 'soft'
			? `rounded-[26px] bg-white ${isOpen ? 'shadow-[0_2px_4px_rgb(15_23_42/0.04),0_24px_48px_-20px_rgb(15_23_42/0.22)]' : 'shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_28px_-18px_rgb(15_23_42/0.2)]'}`
			: style === 'flat'
				? `rounded-3xl bg-white ${isOpen ? 'shadow-xl shadow-slate-900/[0.07]' : ''}`
				: `rounded-[28px] bg-white/90 ${isOpen ? 'shadow-xl shadow-slate-900/[0.08]' : 'shadow-[0_1px_2px_rgb(15_23_42/0.05)]'}`
	);
</script>

{#snippet control(isBadge: boolean)}
	{#if frozen}
		<span
			class="icon-[mdi--lock] size-7 shrink-0 {STATUS[frozen].tone}"
			role="img"
			aria-label="{panel.name} can't be edited while {frozen}"
			title="{frozen}: read only"
		></span>
	{:else if isLocked}
		<span
			class="icon-[mdi--lock] size-7 shrink-0 text-slate-200"
			role="img"
			aria-label="{panel.name} is required"
			title="Required panel"
		></span>
	{:else}
		{@render toggle(isBadge)}
	{/if}
{/snippet}

{#snippet toggle(isBadge: boolean)}
	<button
		type="button"
		role="switch"
		aria-checked={panel.isEnabled}
		aria-label="{panel.isEnabled ? 'Turn off' : 'Turn on'} {panel.name}"
		class="flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors {TRACKS[
			metrics.status
		]} {panel.isEnabled ? 'justify-end' : 'justify-start'} {isBadge ? 'ring-4 ring-white' : ''}"
		onclick={toggleEnabled}><span class="size-5 rounded-full bg-white shadow"></span></button
	>
{/snippet}

<div
	class="relative transition-shadow duration-300 {shell} {panel.isEnabled ? '' : 'opacity-75'}"
	data-sort="panels"
	data-index={index}
>
	{#if style === 'soft'}
		<div class="absolute -top-2 -right-2 z-10">{@render control(true)}</div>
	{/if}
	{#if panel.control === 'remove' && !frozen}
		<button
			type="button"
			class="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-slate-900 text-white shadow ring-2 ring-white transition hover:bg-danger"
			aria-label="Delete {panel.name}"
			title="Delete panel"
			onclick={() =>
				look.confirm({
					title: `Delete ${panel.name}?`,
					note: 'Its photos leave the report.',
					onyes: () => look.removePanel(panel.id)
				})}><span class="icon-[mdi--close] size-3.5"></span></button
		>
	{/if}
	<div
		class="flex items-center gap-1 p-4 select-none [-webkit-touch-callout:none] {style === 'ring'
			? ''
			: 'pb-3'}"
		data-grip={panel.isDraggable && !frozen ? 'panels' : undefined}
		title={panel.isDraggable && !frozen ? 'Hold and drag to reorder' : undefined}
	>
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-3 text-left"
			aria-expanded={isOpen}
			onclick={toggleOpen}
		>
			{#if style === 'ring'}
				<ProgressRing
					percent={panel.isEnabled ? metrics.percent : 0}
					size={52}
					stroke={4}
					tone={frozen && panel.isEnabled ? FROZEN_RINGS[frozen] : tone.ring}
				>
					<span
						class="{panel.icon} relative size-6 {frozen && panel.isEnabled
							? STATUS[frozen].tone
							: panel.isEnabled
								? metrics.status === 'Complete'
									? 'text-success'
									: 'text-primary'
								: 'text-slate-300'}"
					></span>
				</ProgressRing>
			{:else}
				<span
					class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition {metrics.status ===
					'Complete'
						? 'bg-success/10 text-success'
						: metrics.status === 'Off'
							? 'bg-slate-100 text-slate-300'
							: 'bg-primary/10 text-primary'}"><span class="{panel.icon} size-6"></span></span
				>
			{/if}
			<span class="min-w-0 flex-1">
				<span
					class="block truncate font-semibold {panel.isEnabled
						? 'text-slate-900'
						: 'text-slate-400'}">{panel.name}</span
				>
				<span class="block text-xs text-slate-500"
					>{panel.isEnabled
						? `${metrics.done} of ${metrics.total} complete`
						: 'Left out of the report'}</span
				>
			</span>
			<span class="shrink-0 text-right">
				<span
					class="block text-lg leading-tight font-semibold tabular-nums {panel.isEnabled
						? 'text-slate-900'
						: 'text-slate-300'}">{panel.isEnabled ? `${metrics.percent}%` : 'Off'}</span
				>
				<span class="block text-[10px] font-semibold tracking-[0.12em] uppercase {tone.text}"
					>{metrics.status}</span
				>
			</span>
		</button>
		{#if style !== 'soft'}
			<span class="ml-2 flex w-11 shrink-0 justify-center">{@render control(false)}</span>
		{/if}
	</div>
	{#if style !== 'ring'}
		<div class="mx-4 mb-4 h-2 overflow-hidden rounded-full bg-slate-900/[0.05]">
			<div
				class="h-full rounded-full transition-[width,background-color] duration-500 ease-out {tone.bar}"
				style="width: {panel.isEnabled ? metrics.percent : 0}%"
			></div>
		</div>
	{/if}
	{#if isOpen}
		<div
			class="px-4 pt-1 pb-5"
			transition:slide={{ duration: 200 }}
		>
			<PanelBody
				{look}
				{panel}
			/>
		</div>
	{/if}
</div>
