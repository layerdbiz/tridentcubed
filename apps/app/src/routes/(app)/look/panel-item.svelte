<script lang="ts">
	// PROTOTYPE (#161): one panel with its progress and controls, opening like an accordion. A panel that can be left
	// out has a switch coloured by its state (to do grey, in progress blue, complete green); a required panel shows one
	// big lock instead, in the light grey of the progress ring's track whatever its state (Justin's run 9 note 22). Lock
	// and switch sit in the same width, so every panel's percent lines up (note 23). A photo panel
	// drags by its whole header, with no handle (notes 6 and 7). An added panel also has an X top right that asks
	// before deleting (LookState.confirm, the same dialog as every other delete).
	// The styles (`soft`, `flat`, `ring`) are panel-card.svelte's.
	// Run 11 (Justin, 2026-10-26 19:22): a Sent or Complete project is frozen. Every panel's icon and ring take the
	// state's colour (Sent purple, Complete green), a lock in that colour stands where the switch was, and nothing
	// inside opens for editing, drags or deletes (panel-list.svelte says why, with Unsend). #335: the colour is set
	// once, on the panel list (themeOf), so the ring, icon, state word and bar here need no frozen colours of their
	// own; a frozen panel is never quiet, so its "To do" takes the colour too.
	// Run 26 (Justin, 2026-11-11), Panel List B: a panel with nothing done yet is quiet, its icon and its "To do"
	// grey like its empty ring; blue starts with the first thing filled in.
	// #305: the percent and state are a button of their own beside the one that opens the panel: a tap on them lists
	// the panel's empty inputs in a toast (LookState.showEmpty). A panel switched off counts for nothing, so its
	// percent lists nothing.
	// 2026-11-28 (Justin: the Team member's Edit is to be "the exact same UI, bit by bit"): how a panel looks is
	// panel-card.svelte, which a Team member's panels are drawn in too; this is what a project's panel is and does.
	import { Switch } from '@layerd/ui';
	import { STATUS, type PanelType } from './look.data';
	import { metricsOf, type LookState } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import PanelCard from './panel-card.svelte';
	import { addPhotos, filesLabelOf, hasFiles } from './photos';
	import { createPhotoToast } from './toasts';

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

	const metrics = $derived(metricsOf(panel, look));
	// #402: a shut photo panel a dragged selection rests on opens beside the open one (sortable.ts), until either
	// header is tapped. Only one that is switched on, as Move to… lists only those.
	const isOpen = $derived(look.panelId === panel.id || look.selection.alsoOpen === panel.id);
	const frozen = $derived(look.isFrozen ? look.project.status : undefined);
	const isQuiet = $derived(
		look.variant('panels') !== 'A' && !frozen && panel.isEnabled && metrics.status === 'To do'
	);
	const isLocked = $derived(panel.control === 'locked');
	const TRACKS = {
		'To do': 'bg-slate-400',
		'In progress': 'bg-primary',
		Complete: 'bg-success',
		'Not planned': 'bg-slate-300'
	};

	// Photo files dragged in from the desktop and dropped on a photo panel, open or shut, join its last group
	// (photos.ts, run 27). A drop on one of its groups is that group's own.
	let isOver = $state(false);

	function overFiles(event: DragEvent) {
		if (panel.kind !== 'photos' || frozen || !hasFiles(event)) return;
		event.preventDefault();
		isOver = true;
	}

	function leaveFiles(event: DragEvent) {
		const box = event.currentTarget as HTMLElement;
		if (!box.contains(event.relatedTarget as Node | null)) isOver = false;
	}

	function dropFiles(event: DragEvent) {
		if (panel.kind !== 'photos' || frozen || !hasFiles(event)) return;
		event.preventDefault();
		isOver = false;
		const files = [...(event.dataTransfer?.files ?? [])];
		const count = addPhotos(panel, files, {
			projectId: look.projectId,
			toast: createPhotoToast
		});
		if (!count) return;
		look.say(`${filesLabelOf(files)} added to ${panel.name}`);
		look.saved();
	}

	function toggleOpen() {
		const wasAlso = look.selection.alsoOpen === panel.id;
		look.selection.alsoOpen = '';
		if (!wasAlso) look.panelId = isOpen ? '' : panel.id;
	}

	function toggleEnabled() {
		panel.isEnabled = !panel.isEnabled;
		look.saved();
	}
</script>

{#snippet control(isBadge: boolean)}
	{#if frozen}
		<span
			class="icon-[mdi--lock] size-7 shrink-0 {STATUS[frozen].tone}"
			role="img"
			aria-label="{panel.name} can't be edited while {frozen}"
			title="{frozen}: read only"
		></span>
	{:else}
		{@render toggle(isBadge)}
	{/if}
{/snippet}

{#snippet toggle(isBadge: boolean)}
	<Switch
		checked={panel.isEnabled}
		label="{panel.isEnabled ? 'Turn off' : 'Turn on'} {panel.name}"
		track={TRACKS[metrics.status]}
		class={isBadge ? 'ring-4 ring-white' : ''}
		onchange={toggleEnabled}
	/>
{/snippet}

<PanelCard
	name={panel.name}
	icon={panel.icon}
	{metrics}
	{style}
	{isOpen}
	isEnabled={panel.isEnabled}
	{isQuiet}
	class="{isOver ? 'ring-2 ring-primary' : ''} data-[drop]:ring-2 data-[drop]:ring-primary"
	head={{
		'data-grip': panel.isDraggable && !frozen ? 'panels' : undefined,
		title: panel.isDraggable && !frozen ? 'Hold and drag to reorder' : undefined
	}}
	percentTitle={panel.isEnabled ? 'Show what is not filled in yet' : undefined}
	data-sort="panels"
	data-photo-card={panel.kind === 'photos' && panel.isEnabled && !isOpen && !frozen
		? panel.id
		: undefined}
	data-index={index}
	ondragover={overFiles}
	ondragleave={leaveFiles}
	ondrop={dropFiles}
	control={isLocked && !frozen ? undefined : control}
	{corner}
	ontoggle={toggleOpen}
	onpercent={() => look.showEmpty(panel.id)}
>
	<PanelBody
		{look}
		{panel}
	/>
</PanelCard>

{#snippet corner()}
	{#if panel.control === 'remove' && !frozen}
		<button
			type="button"
			class="absolute -top-1.5 -right-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-slate-900 text-white shadow ring-2 ring-white transition hover:bg-danger"
			aria-label="Delete {panel.name}"
			title="Delete panel"
			onclick={() =>
				look.confirm({
					title: 'Delete panel?',
					note: 'Its photos leave the report.',
					onyes: () => look.removePanel(panel.id)
				})}><span class="icon-[mdi--close] size-3.5"></span></button
		>
	{/if}
{/snippet}
