<script lang="ts">
	// PROTOTYPE (#161): the top of an open project, on the phone and the desktop alike. Back, the title with the
	// project's percent and state at its right (the state in its colour, the way each panel shows them), the bar under
	// both, from where the title starts (run 9 notes 10 and 12), and a ⋮ at the far right with what can be done to the
	// whole project (note 11), the same MoreMenu the dashboard's lists use. The save cloud stands after the title
	// (#372: the bars that held it instead are gone). A Sent, Complete or Archived project's bar is all in its status
	// colour, the cloud too (themeOf, #335). #305: a tap on the percent lists the project's empty inputs in a toast.
	import Back from './back.svelte';
	import { STATUS } from './look.data';
	import { themeOf, type LookState } from './look.state.svelte';
	import MoreMenu from './more-menu.svelte';
	import Percent from './percent.svelte';
	import SaveCloud from './save-cloud.svelte';

	let { look }: { look: LookState } = $props();

	const status = $derived(STATUS[look.project.status]);
</script>

<div class="flex items-start gap-1 {themeOf(look.project.status)}">
	<Back
		label="Back to Home"
		class="shrink-0"
		onclick={() => look.home()}
	/>
	<div
		class="min-w-0 flex-1"
		title="{look.overall}% of this project is done"
	>
		<div class="flex min-h-10 items-center gap-2">
			<span class="min-w-0 flex-1 truncate font-semibold text-slate-900">{look.project.title}</span>
			<SaveCloud {look} />
			<Percent
				percent={look.overall}
				status={look.project.status}
				whose="this project"
				tone={status.tone}
				onclick={() => look.showEmpty()}
			/>
		</div>
		<span class="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-900/[0.07]">
			<span
				class="block h-full rounded-full transition-[width] duration-500 {status.bar}"
				style="width: {look.overall}%"
			></span>
		</span>
	</div>
	<span class="flex size-10 shrink-0 items-center justify-center"
		><MoreMenu
			{look}
			page="projects"
			id={look.project.id}
		/></span
	>
</div>
