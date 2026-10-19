<script lang="ts">
	// PROTOTYPE (#161): one panel with its progress and controls, opening like an accordion.
	// `card` is the app prototype's panel card, restyled (A); `row` is the compact sidebar row (B),
	// where the icon sits inside its own progress ring.
	import { slide } from 'svelte/transition';
	import type { PanelType } from './look.data';
	import { metricsOf, toneOf, type LookState } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import ProgressRing from './progress-ring.svelte';

	let {
		look,
		panel,
		index,
		style = 'card'
	}: { look: LookState; panel: PanelType; index: number; style?: 'card' | 'row' } = $props();

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
</script>

{#snippet control(isSmall: boolean)}
	{#if panel.control === 'locked'}
		<span
			class="flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 {isSmall
				? 'size-6'
				: 'size-7 ring-4 ring-white'}"
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
				: 'justify-start bg-slate-300'} {isSmall ? '' : 'ring-4 ring-white'}"
			onclick={toggleEnabled}
			><span class="block size-5 rounded-full bg-white shadow"></span></button
		>
	{:else}
		<button
			type="button"
			class="flex shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-danger {isSmall
				? 'size-6'
				: 'size-7 ring-4 ring-white'}"
			aria-label="Remove {panel.name}"
			title="Remove panel"
			onclick={() => look.removePanel(panel.id)}
			><span class="icon-[mdi--close] size-4"></span></button
		>
	{/if}
{/snippet}

{#if style === 'card'}
	<div
		class="relative rounded-3xl border bg-white transition {isOpen
			? 'border-primary/30 shadow-lg shadow-primary/5'
			: 'border-slate-200 shadow-sm hover:border-slate-300'} {panel.isEnabled ? '' : 'bg-slate-50'}"
		data-sort="panels"
		data-index={index}
	>
		<div class="absolute -top-2.5 -right-2.5 z-10">{@render control(false)}</div>
		<div class="flex items-center gap-1 p-4 pb-3">
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
				<span
					class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition {metrics.status ===
					'Complete'
						? 'bg-success/10 text-success'
						: metrics.status === 'Off'
							? 'bg-slate-100 text-slate-300'
							: 'bg-primary/10 text-primary'}"><span class="{panel.icon} size-6"></span></span
				>
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
		</div>
		<div class="mx-4 mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
			<div
				class="h-full rounded-full transition-[width,background-color] duration-500 ease-out {tone.bar}"
				style="width: {panel.isEnabled ? metrics.percent : 0}%"
			></div>
		</div>
		{#if isOpen}
			<div
				class="border-t border-slate-100 px-4 pt-4 pb-5"
				transition:slide={{ duration: 200 }}
			>
				<PanelBody
					{look}
					{panel}
				/>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="rounded-2xl transition {isOpen ? 'bg-white shadow-sm ring-1 ring-slate-200' : ''}"
		data-sort="panels"
		data-index={index}
	>
		<div class="flex items-center gap-1 px-1.5 py-1.5">
			<span
				class="flex w-5 shrink-0 justify-center {panel.isDraggable
					? 'cursor-grab touch-none text-slate-300 hover:text-slate-500'
					: 'text-transparent'}"
				data-grip={panel.isDraggable ? 'panels' : undefined}
				title={panel.isDraggable ? 'Drag to reorder' : undefined}
				><span class="icon-[mdi--drag-vertical] size-4"></span></span
			>
			<button
				type="button"
				class="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left"
				aria-expanded={isOpen}
				onclick={toggleOpen}
			>
				<ProgressRing
					percent={panel.isEnabled ? metrics.percent : 0}
					size={40}
					stroke={3}
					tone={tone.ring}
				>
					<span
						class="{panel.icon} relative size-5 {panel.isEnabled
							? metrics.status === 'Complete'
								? 'text-success'
								: 'text-slate-600'
							: 'text-slate-300'}"
					></span>
				</ProgressRing>
				<span class="min-w-0 flex-1">
					<span
						class="block truncate text-sm font-medium {panel.isEnabled
							? 'text-slate-900'
							: 'text-slate-400'}">{panel.name}</span
					>
					<span class="block text-xs text-slate-400 tabular-nums"
						>{panel.isEnabled
							? `${metrics.done} of ${metrics.total} · ${metrics.percent}%`
							: 'Off · left out'}</span
					>
				</span>
			</button>
			<span class="px-1.5">{@render control(true)}</span>
		</div>
		{#if isOpen}
			<div
				class="px-3 pt-1 pb-4"
				transition:slide={{ duration: 200 }}
			>
				<PanelBody
					{look}
					{panel}
				/>
			</div>
		{/if}
	</div>
{/if}
