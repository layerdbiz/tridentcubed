<script lang="ts">
	// The card every panel on an Edit tab is drawn in, a project's panels and a Team member's alike (Justin,
	// 2026-11-28: "I want the exact same page setup that we have in the project edit panels for the team member edit
	// panels ... It should use the exact same UI, bit by bit"): its icon, in its own progress ring in the `ring` style,
	// its name and "N of M complete", its percent and state, which a tap turns into the list of what is still empty,
	// the switch or lock at its right, and, open, what it holds, sliding down like an accordion. What the panel is
	// and what its switch does are the caller's (panel-item.svelte for a project's); this is only how it looks.
	// Every style keeps the cards apart with room to breathe and draws no borders.
	// `soft` (D): white card on a soft shadow, control badge on the corner, bar under.
	// `flat` (E): white card with no shadow until it opens, control inline.
	// `ring` (F): the icon sits in its own progress ring, so the card needs no bar.
	// Run 26 (Justin, 2026-11-11), Panel List B: a panel with nothing done yet is quiet (`isQuiet`), its icon and its
	// "To do" grey like its empty ring; blue starts with the first thing filled in. Inside an open panel that is
	// complete, everything the app draws in its blue turns green (Justin, 2026-11-16: "all those colors need to update
	// as the status changes for every icon, not just some"). The theme's colours are read where they are used
	// (@theme inline), so it is the theme's own variable that is set here.
	// #412 (Justin, 2026-11-28: "apply it to the edit panels"): a panel a tap on its header opens glides to the top of
	// the list it scrolls in while the open one slides shut, one smooth move with no jump (the library's `glide`, as
	// What's New's sections do), so its header and what it holds start at the top. A tap that shuts it, or a panel
	// opened from elsewhere (the report, a list of empty inputs), leaves the list where it is. The list says where
	// the top is with its `scroll-padding-top`, under a header that sits over it.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';
	import { glide, ProgressBar } from '@layerd/ui';
	import { toneOf, type MetricsType } from './look.state.svelte';
	import Percent from './percent.svelte';
	import ProgressRing from './progress-ring.svelte';

	let {
		name,
		icon,
		metrics,
		style = 'soft',
		isOpen,
		isEnabled = true,
		isQuiet = false,
		head = {},
		percentTitle = undefined,
		control = locked,
		corner = undefined,
		ontoggle,
		onpercent,
		children,
		class: className = '',
		...rest
	}: {
		name: string;
		icon: string;
		metrics: MetricsType;
		style?: 'soft' | 'flat' | 'ring';
		isOpen: boolean;
		/** A panel switched off reads quiet, with nothing done. */
		isEnabled?: boolean;
		/** Nothing done yet: its icon and state grey. */
		isQuiet?: boolean;
		/** What the header row carries: a drag grip and its hint. */
		head?: Record<string, unknown>;
		/** The hint on its percent. */
		percentTitle?: string;
		/**
		 * The switch or lock at its right, given whether it is the corner badge of the `soft` style. Left out, the lock
		 * of a panel that is always there.
		 */
		control?: Snippet<[boolean]>;
		/** Anything on its top right corner: an added panel's X. */
		corner?: Snippet;
		ontoggle: () => void;
		/** A tap on its percent: what is still empty. */
		onpercent: () => void;
		/** What it holds, shown open. */
		children: Snippet;
	} & Omit<HTMLAttributes<HTMLDivElement>, 'children'> = $props();

	let card = $state<HTMLElement>();

	function toggle() {
		const isOpening = !isOpen;
		ontoggle();
		if (isOpening && card) glide(card);
	}

	const tone = $derived(toneOf(metrics.status));
	const recolour = $derived(
		metrics.status === 'Complete' ? '[--theme-color-primary:var(--theme-color-success)]' : ''
	);
	const shell = $derived(
		style === 'soft'
			? `rounded-[26px] bg-white ${isOpen ? 'shadow-[0_2px_4px_rgb(15_23_42/0.04),0_24px_48px_-20px_rgb(15_23_42/0.22)]' : 'shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_28px_-18px_rgb(15_23_42/0.2)]'}`
			: style === 'flat'
				? `rounded-3xl bg-white ${isOpen ? 'shadow-xl shadow-slate-900/[0.07]' : ''}`
				: `rounded-[28px] bg-white/90 ${isOpen ? 'shadow-xl shadow-slate-900/[0.08]' : 'shadow-[0_1px_2px_rgb(15_23_42/0.05)]'}`
	);
</script>

<!-- A required panel shows one big lock, in the light grey of the progress ring's track whatever its state (Justin's
     run 9 note 22); it sits in the switch's width, so every panel's percent lines up (note 23). -->
{#snippet locked()}
	<span
		class="icon-[mdi--lock] size-7 shrink-0 text-slate-200"
		role="img"
		aria-label="{name} is required"
		title="Required panel"
	></span>
{/snippet}

<div
	bind:this={card}
	class="relative transition-shadow duration-300 {shell} {isEnabled
		? ''
		: 'opacity-75'} {className}"
	role="group"
	aria-label={name}
	{...rest}
>
	{#if style === 'soft'}
		<div class="absolute -top-2 -right-2 z-10">{@render control(true)}</div>
	{/if}
	{@render corner?.()}
	<div
		class="flex items-center gap-1 p-4 select-none [-webkit-touch-callout:none] {style === 'ring'
			? ''
			: 'pb-3'}"
		{...head}
	>
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-3 text-left"
			aria-expanded={isOpen}
			onclick={toggle}
		>
			{#if style === 'ring'}
				<ProgressRing
					percent={isEnabled ? metrics.percent : 0}
					size={52}
					stroke={4}
					tone={tone.ring}
				>
					<span
						class="{icon} relative size-6 {isEnabled
							? metrics.status === 'Complete'
								? 'text-success'
								: isQuiet
									? 'text-slate-400'
									: 'text-primary'
							: 'text-slate-300'}"
					></span>
				</ProgressRing>
			{:else}
				<span
					class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition {metrics.status ===
					'Complete'
						? 'bg-success/10 text-success'
						: metrics.status === 'Not planned'
							? 'bg-slate-100 text-slate-300'
							: isQuiet
								? 'bg-slate-100 text-slate-400'
								: 'bg-primary/10 text-primary'}"><span class="{icon} size-6"></span></span
				>
			{/if}
			<span class="min-w-0 flex-1">
				<span
					class="block leading-tight font-semibold {isEnabled
						? 'text-slate-900'
						: 'text-slate-400'}">{name}</span
				>
				<!-- A panel switched off reads like the rest, with nothing done: "0 of 4 complete", 0%, Not planned
				     (Justin, 2026-11-18, #225). -->
				<span class="block text-xs text-slate-500">{metrics.done} of {metrics.total} complete</span>
			</span>
		</button>
		<Percent
			class="ml-2"
			percent={metrics.percent}
			status={metrics.status}
			whose={name}
			tone={isQuiet ? 'text-slate-400' : tone.text}
			percentTone={isEnabled ? 'text-slate-900' : 'text-slate-300'}
			disabled={!isEnabled}
			title={percentTitle}
			onclick={onpercent}
		/>
		{#if style !== 'soft'}
			<span class="ml-2 flex w-11 shrink-0 justify-center">{@render control(false)}</span>
		{/if}
	</div>
	{#if style !== 'ring'}
		<ProgressBar
			value={isEnabled ? metrics.percent : 0}
			label="{name} progress"
			track="bg-slate-900/[0.05]"
			fill={tone.bar}
			class="mx-4 mb-4"
		/>
	{/if}
	{#if isOpen}
		<div
			class="px-4 pt-1 pb-5 {recolour}"
			transition:slide={{ duration: 200 }}
		>
			{@render children()}
		</div>
	{/if}
</div>
