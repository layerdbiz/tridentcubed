<script lang="ts">
	// PROTOTYPE (#161) run 24: the one top part of anything opened from the dashboard, a project and a customer,
	// team member, transport mode or facility alike (Justin, 2026-11-11: "we need to use the exact same component
	// for that page header, but have different views so we can show or hide a particular part"). The back arrow at
	// the left and the ⋮ at the right are always there, in the same place on every tab, as bare icons. `reveal`
	// runs from 0 to 1 and shows the rest: at 0 (the Page) nothing else, so the picture runs to the top; at 1 (Edit,
	// Preview) the white blurred bar with the name, the save cloud and, for a project, its percent, state and
	// progress. In between they fade, so it follows a swipe. `isLight` says the Page is showing a photo, where the
	// two icons are white. `hasChevron` (Header C) draws back as a chevron, not an arrow. `onprogress` makes the
	// percent a button: a project's lists its empty inputs (#305).
	import type { Snippet } from 'svelte';
	import { ProgressBar } from '@layerd/ui';
	import { DATASETS, type DatasetType, type PanelStatusType, type StatusType } from './look.data';
	import { progressToneOf, type LookState } from './look.state.svelte';
	import Back from './back.svelte';
	import MoreMenu from './more-menu.svelte';
	import Percent from './percent.svelte';
	import SaveCloud from './save-cloud.svelte';

	let {
		look,
		page,
		id,
		title,
		kind = '',
		progress,
		status,
		whose = 'this project',
		reveal = 1,
		isLight = false,
		hasCloud = false,
		hasChevron = false,
		height = $bindable(0),
		mark,
		onprogress
	}: {
		look: LookState;
		// What the ⋮ acts on: its page, and a project's id or a record's name. Left out (the Organization), there is
		// no ⋮ and back is simply Back.
		page?: DatasetType;
		id?: string;
		title: string;
		// A second line under the name: "Customer", "Facility".
		kind?: string;
		// A project's percent and state, or a Team member's profile's (2026-11-28); left out, the header has no progress.
		progress?: number;
		status?: StatusType | PanelStatusType;
		/** Whose percent, in words: "this project", "Profile". */
		whose?: string;
		reveal?: number;
		isLight?: boolean;
		hasCloud?: boolean;
		hasChevron?: boolean;
		height?: number;
		// A logo or a face before the name.
		mark?: Snippet;
		// What a tap on the percent does; left out, it is not a button.
		onprogress?: () => void;
	} = $props();

	const shown = $derived(Math.min(1, Math.max(0, reveal)));
	const isBar = $derived(shown >= 0.5);
	const tone = $derived(status ? progressToneOf(status) : undefined);
	const ghost = $derived(
		isLight && !isBar
			? 'text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]'
			: 'text-slate-900 hover:bg-slate-900/5'
	);
</script>

<header
	class="absolute inset-x-0 top-0 z-20 pt-[env(safe-area-inset-top)] {isBar
		? ''
		: 'pointer-events-none'}"
	bind:clientHeight={height}
>
	<span
		class="absolute inset-0 bg-white/75 backdrop-blur-xl backdrop-saturate-150"
		style:opacity={shown}
		aria-hidden="true"
	></span>
	<div class="relative flex items-start gap-1 px-1.5 py-2">
		<Back
			label={page ? `Back to ${DATASETS[page].label}` : 'Back'}
			over={isLight && !isBar ? 'dark' : 'white'}
			{hasChevron}
			class="pointer-events-auto shrink-0"
			onclick={() => look.home()}
		/>
		<div
			class="min-w-0 flex-1"
			style:opacity={shown}
			inert={!isBar}
		>
			<div class="flex min-h-10 items-center gap-2">
				{@render mark?.()}
				<span class="min-w-0 flex-1">
					<span class="block truncate font-semibold text-slate-900">{title}</span>
					{#if kind}<span class="block truncate text-xs text-slate-500">{kind}</span>{/if}
				</span>
				{#if hasCloud}<SaveCloud {look} />{/if}
				{#if progress !== undefined && tone}
					<Percent
						percent={progress}
						status={status ?? ''}
						{whose}
						tone={tone.text}
						title="{progress}% of {whose} is done"
						onclick={onprogress}
					/>
				{/if}
			</div>
			{#if progress !== undefined && tone}
				<ProgressBar
					value={progress}
					label="{whose === 'this project' ? 'Project' : whose} progress"
					track="bg-slate-900/[0.07]"
					fill={tone.bar}
					class="mt-1.5"
				/>
			{/if}
		</div>
		{#if page && id}
			<span
				class="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full transition-colors {ghost}"
				><MoreMenu
					{look}
					{page}
					{id}
					tone="bare"
				/></span
			>
		{/if}
	</div>
</header>
