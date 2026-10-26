<script lang="ts">
	// PROTOTYPE (#161): the top of an open project, on the phone and the desktop alike. Back, the title with the
	// project's percent and state at its right (the state in its colour, the way each panel shows them), the bar under
	// both, from where the title starts (run 9 notes 10 and 12), and a ⋮ at the far right with what can be done to the
	// whole project (note 11). `isCloud` adds the save cloud after the title (the phone has it on the floating bar).
	import { STATUS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu, { type OptionType } from './menu.svelte';
	import SaveCloud from './save-cloud.svelte';

	let { look, isCloud = false }: { look: LookState; isCloud?: boolean } = $props();

	const status = $derived(STATUS[look.project.status]);

	const ACTIONS: OptionType[] = [
		{ id: 'send', label: 'Send project', icon: 'icon-[mdi--send-outline]' },
		{ id: 'sent', label: 'Mark sent', icon: 'icon-[mdi--send-check-outline]' },
		{ id: 'delete', label: 'Delete project', icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
	];

	function act(id: string) {
		const { project } = look;
		if (id === 'send') look.say('Send opens the send flow in V1. Not wired up in this prototype.');
		if (id === 'sent') {
			project.status = 'Sent';
			look.saved();
			look.say(`"${project.title}" marked sent`);
		}
		if (id === 'delete')
			look.confirm({
				title: `Delete ${project.title}?`,
				note: 'It moves to Trash, where an admin can restore it.',
				onyes: () => {
					look.home();
					look.remove(project.id);
				}
			});
	}
</script>

<div class="flex items-start gap-1">
	<button
		class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
		aria-label="Back to Home"
		onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
	>
	<div
		class="min-w-0 flex-1"
		title="{look.overall}% of this project is done"
	>
		<div class="flex min-h-10 items-center gap-2">
			<span class="min-w-0 flex-1 truncate font-semibold text-slate-900">{look.project.title}</span>
			{#if isCloud}<SaveCloud {look} />{/if}
			<span class="shrink-0 text-right">
				<span class="block text-lg leading-tight font-semibold text-slate-900 tabular-nums"
					>{look.overall}%</span
				>
				<span class="block text-[10px] font-semibold tracking-[0.12em] uppercase {status.tone}"
					>{look.project.status}</span
				>
			</span>
		</div>
		<span class="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-900/[0.07]">
			<span
				class="block h-full rounded-full transition-[width] duration-500 {status.bar}"
				style="width: {look.overall}%"
			></span>
		</span>
	</div>
	<Menu
		label="Project actions"
		value=""
		options={ACTIONS}
		onpick={act}
	>
		{#snippet trigger(_, isOpen)}
			<span
				class="flex size-10 items-center justify-center rounded-full text-slate-700 transition {isOpen
					? 'bg-slate-900/[0.06]'
					: 'hover:bg-slate-900/5'}"><span class="icon-[mdi--dots-vertical] size-6"></span></span
			>
		{/snippet}
	</Menu>
</div>
