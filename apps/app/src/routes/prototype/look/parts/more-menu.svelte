<script lang="ts">
	// PROTOTYPE (#161): the one ⋮ menu, the same on every page and wherever a thing shows (Justin's run 9 note 11,
	// 2026-10-26 16:34, and run 12 note 19: every page's rows, not only Projects). A project offers Send, Mark sent (or
	// Unsend, back to its state before) and Delete; a customer, team member, transport or facility offers Edit and
	// Delete. Every delete asks first. `isOpenable` adds Open first, for the lists; `tone` 'photo' is white dots in a
	// dark glass circle, readable on any photo; 'bare' just the dots, in the colour around them (a Page's top bar).
	import { DATASETS, type DatasetType } from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu, { type OptionType } from './menu.svelte';

	let {
		look,
		page,
		id,
		isOpenable = false,
		tone = 'plain',
		onact
	}: {
		look: LookState;
		page: DatasetType;
		// A project's id, or a record's name.
		id: string;
		isOpenable?: boolean;
		tone?: 'plain' | 'photo' | 'bare';
		// Runs after any pick, so a drawer the menu sits in can close (the menu's Recent, run 14).
		onact?: () => void;
	} = $props();

	const project = $derived(
		page === 'projects' ? look.projects.find((item) => item.id === id) : undefined
	);
	const name = $derived(project?.title ?? id);
	const one = $derived(DATASETS[page].one.toLowerCase());

	const options = $derived<OptionType[]>([
		...(isOpenable
			? [{ id: 'open', label: `Open ${one}`, icon: 'icon-[mdi--arrow-top-right]' }]
			: []),
		...(project
			? [
					{ id: 'send', label: 'Send project', icon: 'icon-[mdi--send-outline]' },
					project.status === 'Sent'
						? { id: 'unsend', label: 'Unsend', icon: 'icon-[mdi--undo-variant]' }
						: { id: 'sent', label: 'Mark sent', icon: 'icon-[mdi--send-check-outline]' }
				]
			: [{ id: 'edit', label: `Edit ${one}`, icon: 'icon-[mdi--pencil-outline]' }]),
		{ id: 'delete', label: `Delete ${one}`, icon: 'icon-[mdi--trash-can-outline]', isDanger: true }
	]);

	function act(choice: string) {
		if (choice !== 'delete') onact?.();
		if (page !== 'projects') {
			if (choice === 'open') look.openRecord(page, id, 'page');
			if (choice === 'edit') look.openRecord(page, id, 'edit');
			if (choice === 'delete')
				look.confirm({
					title: `Delete ${name}?`,
					note: 'It moves to Trash, where an admin can restore it. Projects that use it keep its name.',
					onyes: () => look.removeRecord(page, id)
				});
			return;
		}
		if (!project) return;
		if (choice === 'open') look.open(project.id);
		if (choice === 'send')
			look.say('Send opens the send flow in V1. Not wired up in this prototype.');
		if (choice === 'sent') look.markSent(project);
		if (choice === 'unsend') look.unsend(project);
		if (choice === 'delete')
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
	label="More for {name}"
	value=""
	{options}
	onpick={act}
>
	{#snippet trigger(_, isOpen)}
		{#if tone === 'bare'}
			<span class="flex size-9 items-center justify-center"
				><span class="icon-[mdi--dots-vertical] size-[22px]"></span></span
			>
		{:else if tone === 'photo'}
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
