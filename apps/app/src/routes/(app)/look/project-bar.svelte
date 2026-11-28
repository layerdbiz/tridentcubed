<script lang="ts">
	// PROTOTYPE (#161): the top of an open project, on the phone and the desktop alike. Back, the title with the
	// project's percent and state at its right (the state in its colour, the way each panel shows them), the bar under
	// both, from where the title starts (run 9 notes 10 and 12), and a ⋮ at the far right with what can be done to the
	// whole project (note 11), the same MoreMenu the dashboard's lists use. The save cloud stands after the title
	// (#372: the bars that held it instead are gone). A Sent, Complete or Archived project's bar is all in its status
	// colour, the cloud too (themeOf, #335). #305: a tap on the percent lists the project's empty inputs in a toast.
	// 2026-11-28 (Justin: a Team member's Edit "should use the exact same UI, bit by bit", with "the top part where it
	// shows how complete the profile is with the percentage bar, just like how complete the project is"): a Team
	// member's Edit column on a desktop has this bar too, given their name, face, percent and state; left out, they are
	// the open project's.
	import type { Snippet } from 'svelte';
	import { ProgressBar } from '@layerd/ui';
	import Back from './back.svelte';
	import {
		DATASETS,
		STATUS,
		type DatasetType,
		type PanelStatusType,
		type StatusType
	} from './look.data';
	import { progressToneOf, themeOf, type LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import Percent from './percent.svelte';
	import SaveCloud from './save-cloud.svelte';

	let {
		look,
		title = undefined,
		kind = '',
		mark = undefined,
		percent = undefined,
		status = undefined,
		whose = 'this project',
		page = 'projects',
		id = undefined,
		onprogress = undefined
	}: {
		look: LookState;
		/** Whose bar it is: the open project's when left out. */
		title?: string;
		/** A second line under the name: "Team". */
		kind?: string;
		/** A face before the name. */
		mark?: Snippet;
		percent?: number;
		status?: StatusType | PanelStatusType;
		/** Whose percent, in words: "this project", "Profile". */
		whose?: string;
		/** What the ⋮ acts on: its page, and a project's id or a record's name. */
		page?: DatasetType;
		id?: string;
		/** A tap on the percent: what is still empty. */
		onprogress?: () => void;
	} = $props();

	const shown = $derived({
		title: title ?? look.project.title,
		percent: percent ?? look.overall,
		status: status ?? look.project.status,
		id: id ?? look.project.id
	});
	const tone = $derived(progressToneOf(shown.status));
	const theme = $derived(shown.status in STATUS ? themeOf(shown.status as StatusType) : '');
</script>

<div class="flex items-start gap-1 {theme}">
	<Back
		label="Back to {page === 'projects' ? 'Home' : DATASETS[page].label}"
		class="shrink-0"
		onclick={() => look.home()}
	/>
	<div
		class="min-w-0 flex-1"
		title="{shown.percent}% of {whose} is done"
	>
		<div class="flex min-h-10 items-center gap-2">
			{@render mark?.()}
			<span class="min-w-0 flex-1">
				<span class="block truncate font-semibold text-slate-900">{shown.title}</span>
				{#if kind}<span class="block truncate text-xs text-slate-500">{kind}</span>{/if}
			</span>
			<SaveCloud {look} />
			<Percent
				percent={shown.percent}
				status={shown.status}
				{whose}
				tone={tone.text}
				onclick={onprogress ?? (() => look.showEmpty())}
			/>
		</div>
		<ProgressBar
			value={shown.percent}
			label="{whose === 'this project' ? 'Project' : whose} progress"
			track="bg-slate-900/[0.07]"
			fill={tone.bar}
			class="mt-1.5"
		/>
	</div>
	<span class="flex size-10 shrink-0 items-center justify-center"
		><MoreMenu
			{look}
			{page}
			id={shown.id}
		/></span
	>
</div>
