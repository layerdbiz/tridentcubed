<script lang="ts">
	// PROTOTYPE (#161): a project's ⋮ menu, the same wherever a project shows: the project header, and the top right of
	// each project in the list, cards and board (Justin's run 9 note 11 and 2026-10-26 16:34, in place of the Open and
	// Delete buttons). A Sent project offers Unsend in place of Mark sent, back to its state before (2026-10-26 19:22).
	// `isOpenable` adds Open first, for the lists; `tone` 'photo' is white dots in a dark glass circle, readable on any photo.
	import type { ProjectType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu, { type OptionType } from './menu.svelte';

	let {
		look,
		project,
		isOpenable = false,
		tone = 'plain'
	}: {
		look: LookState;
		project: ProjectType;
		isOpenable?: boolean;
		tone?: 'plain' | 'photo';
	} = $props();

	const options = $derived<OptionType[]>([
		...(isOpenable
			? [{ id: 'open', label: 'Open project', icon: 'icon-[mdi--arrow-top-right]' }]
			: []),
		{ id: 'send', label: 'Send project', icon: 'icon-[mdi--send-outline]' },
		project.status === 'Sent'
			? { id: 'unsend', label: 'Unsend', icon: 'icon-[mdi--undo-variant]' }
			: { id: 'sent', label: 'Mark sent', icon: 'icon-[mdi--send-check-outline]' },
		{ id: 'delete', label: 'Delete project', icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
	]);

	function act(id: string) {
		if (id === 'open') look.open(project.id);
		if (id === 'send') look.say('Send opens the send flow in V1. Not wired up in this prototype.');
		if (id === 'sent') look.markSent(project);
		if (id === 'unsend') look.unsend(project);
		if (id === 'delete')
			look.confirm({
				title: `Delete ${project.title}?`,
				note: 'It moves to Trash, where an admin can restore it.',
				onyes: () => {
					if (look.screen === 'workspace') look.home();
					look.remove(project.id);
				}
			});
	}
</script>

<Menu
	label="More for {project.title}"
	value=""
	{options}
	onpick={act}
>
	{#snippet trigger(_, isOpen)}
		{#if tone === 'photo'}
			<span
				class="flex size-9 items-center justify-center rounded-full bg-slate-950/25 text-white backdrop-blur-sm"
				><span class="icon-[mdi--dots-vertical] size-[22px]"></span></span
			>
		{:else}
			<span
				class="flex size-9 items-center justify-center rounded-full text-slate-500 transition {isOpen
					? 'bg-slate-900/[0.06] text-slate-900'
					: 'hover:bg-slate-900/5 hover:text-slate-900'}"
				><span class="icon-[mdi--dots-vertical] size-[22px]"></span></span
			>
		{/if}
	{/snippet}
</Menu>
