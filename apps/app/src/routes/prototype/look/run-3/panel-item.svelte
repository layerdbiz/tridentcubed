<script lang="ts">
	// PROTOTYPE (#161): one panel with its progress and controls, opening like an accordion. Run 3: every style keeps
	// the cards apart with room to breathe and draws no borders.
	// `soft` (D): white card on a soft shadow, control badge on the corner, bar under.
	// `flat` (E): white card with no shadow until it opens, control inline.
	// `ring` (F): the icon sits in its own progress ring, so the card needs no bar.
	import { slide } from 'svelte/transition';
	import type { PanelType } from './look.data';
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
	{#if panel.control === 'locked'}
		<span
			class="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 {isBadge
				? 'bg-slate-100 ring-4 ring-white'
				: 'bg-slate-900/[0.04]'}"
			title="Required panel"
			aria-label="{panel.name} is required"><span class="icon-[mdi--lock] size-3.5"></span></span
		>
	{:else if panel.control === 'switch'}
		<button
			type="button"
			role="switch"
			aria-checked={panel.isEnabled}
			aria-label="{panel.isEnabled ? 'Turn off' : 'Turn on'} {panel.name}"
			class="flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition {panel.isEnabled
				? 'justify-end bg-success'
				: 'justify-start bg-slate-300'} {isBadge ? 'ring-4 ring-white' : ''}"
			onclick={toggleEnabled}
			><span class="block size-5 rounded-full bg-white shadow"></span></button
		>
	{:else}
		<button
			type="button"
			class="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-danger {isBadge
				? 'ring-4 ring-white'
				: ''}"
			aria-label="Remove {panel.name}"
			title="Remove panel"
			onclick={() => look.removePanel(panel.id)}
			><span class="icon-[mdi--close] size-4"></span></button
		>
	{/if}
{/snippet}

<div
	class="relative transition-shadow duration-300 {shell} {panel.isEnabled ? '' : 'opacity-75'}"
	data-sort="panels"
	data-index={index}
>
	{#if style === 'soft'}
		<div class="absolute -top-2 -right-2 z-10">{@render control(true)}</div>
	{/if}
	<div class="flex items-center gap-1 p-4 {style === 'ring' ? '' : 'pb-3'}">
		{#if panel.isDraggable}
			<span
				class="-ml-2 flex h-12 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-slate-300 hover:text-slate-500"
				data-grip="panels"
				title="Drag to reorder"><span class="icon-[mdi--drag-vertical] size-5"></span></span
			>
		{/if}
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
					tone={tone.ring}
				>
					<span
						class="{panel.icon} relative size-6 {panel.isEnabled
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
			<span class="ml-2">{@render control(false)}</span>
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
