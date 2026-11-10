<script lang="ts">
	// PROTOTYPE (#161) run 11: what the floating bar's blue + opens (Justin, 2026-10-26 19:22): one sheet from the
	// bottom to add a project, customer, team, transport mode or facility. It opens on the page being looked at; the
	// chips at its top switch what is added. Run 16 (Justin, 2026-11-10): the sheet asks for everything Edit does,
	// through the same components. A new project is the Project panel itself (panel-body.svelte, over a draft); the
	// others are record-fields.svelte over an empty record. Nothing exists until Create or Add; then a project
	// opens on Edit and anything else on its Page.
	import BottomSheet from './bottom-sheet.svelte';
	import {
		DATASETS,
		draftOf,
		draftPanel,
		ME,
		PAGE_ICONS,
		PAGES,
		type DatasetType
	} from './look.data';
	import type { LookState, RecordDraftType } from './look.state.svelte';
	import PanelBody from './panel-body.svelte';
	import RecordFields from './record-fields.svelte';
	import type { PageType } from './records.data';

	let { look }: { look: LookState } = $props();

	const HINTS: Record<DatasetType, string> = {
		projects: 'The same Project panel it opens with. The rest is added inside.',
		customers: 'A company the organization works for.',
		team: 'They get an email to sign in.',
		transport: 'A ship, barge, plane, train or truck, picked in any project.',
		facilities: 'A port, airport, rail yard or depot, picked in any project.'
	};

	function fresh(): Record<PageType, RecordDraftType> {
		return {
			customers: draftOf('customers'),
			team: draftOf('team'),
			transport: draftOf('transport'),
			facilities: draftOf('facilities')
		};
	}

	let kind = $derived<DatasetType>(look.adding ?? 'projects');
	let drafts = $state(fresh());
	// svelte-ignore state_referenced_locally
	let panel = $state(draftPanel(look.organization.name, ME));

	// Every time the sheet opens it starts empty, with the organization as it is named now.
	let wasOpen = false;
	$effect(() => {
		const isOpen = Boolean(look.adding);
		if (isOpen && !wasOpen) {
			drafts = fresh();
			panel = draftPanel(look.organization.name, ME);
		}
		wasOpen = isOpen;
	});

	const canAdd = $derived(kind === 'projects' || Boolean(drafts[kind].name.trim()));

	function close() {
		look.adding = undefined;
	}

	function add() {
		if (kind === 'projects') return look.create(panel);
		const page = kind;
		const name = drafts[page].name.trim();
		if (!look.add(page, drafts[page])) return;
		close();
		if (look.dataset !== page) look.pick(page);
		look.openRecord(page, name, 'page');
	}
</script>

{#snippet chip(isOn: boolean, label: string, onclick: () => void, icon = '')}
	<button
		type="button"
		class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition {isOn
			? 'bg-primary text-white'
			: 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
		aria-pressed={isOn}
		{onclick}
		>{#if icon}<span class="{icon} size-4"></span>{/if}{label}</button
	>
{/snippet}

{#if look.adding}
	<BottomSheet
		label="Add"
		onclose={close}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				add();
			}}
		>
			<div class="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
				{#each PAGES as id (id)}
					{@render chip(kind === id, DATASETS[id].one, () => (look.adding = id), PAGE_ICONS[id])}
				{/each}
			</div>
			<!-- The whole form scrolls inside the sheet, so a long one never pushes the buttons off the screen. -->
			<div class="-mx-5 max-h-[62dvh] touch-pan-y overflow-y-auto overscroll-contain px-5 pb-1">
				<div class="mb-4 flex items-center gap-3">
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
						><span class="{PAGE_ICONS[kind]} size-6"></span></span
					>
					<div>
						<p class="text-lg font-semibold text-slate-900">New {DATASETS[kind].one}</p>
						<p class="text-xs text-slate-500">{HINTS[kind]}</p>
					</div>
				</div>
				{#if kind === 'projects'}
					<PanelBody
						{look}
						{panel}
						isDraft
					/>
				{:else}
					{#key kind}
						<RecordFields
							page={kind}
							value={drafts[kind]}
							set={(change) => Object.assign(drafts[kind as PageType], change)}
							isNew
						/>
					{/key}
				{/if}
			</div>
			<div class="mt-4 flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-full border border-slate-200 py-2.5 font-medium text-slate-600"
					onclick={close}>Cancel</button
				>
				<button
					type="submit"
					class="flex-1 rounded-full bg-primary py-2.5 font-medium text-white disabled:opacity-40"
					disabled={!canAdd}>{kind === 'projects' ? 'Create' : 'Add'}</button
				>
			</div>
		</form>
	</BottomSheet>
{/if}
