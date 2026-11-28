<script lang="ts">
	// A Team member's Edit, built as a project's is (Justin, 2026-11-28: "I want the exact same page setup that we
	// have in the project edit panels for the team member edit panels ... It should use the exact same UI, bit by
	// bit"): their panels in the cards a project's panels are drawn in (panel-card.svelte), each with its icon in its
	// progress ring, "N of M complete", its percent and state, and the lock of a panel that is always there; open, the
	// sections a Project panel has (group.svelte), only the first open to start with. Profile holds their Details and
	// how to reach them, the same fields the + sheet asks for (record-fields.svelte); the Email Signature, for them or
	// an Admin, its Photo and Banners (signature-edit.svelte). What each counts is tally.ts's (`teamPanelsOf`), which
	// the header's percent reads too. A tap on a percent lists what is still empty in the app's toast, as a project's
	// does, and an entry opens its panel and section and puts the focus on it. One panel is open at a time, Profile to start with.
	import { untrack } from 'svelte';
	import { focusInput, inputIn } from './focus';
	import Group from './group.svelte';
	import { metricsFrom, type LookState } from './look.state.svelte';
	import PanelCard from './panel-card.svelte';
	import RecordFields from './record-fields.svelte';
	import type { RecordType } from './records.data';
	import SignatureEdit from './signature-edit.svelte';
	import type { SignatureState } from './signature.svelte';
	import { emptyOf, toEmptyNote, valuesOf, type EmptyType, type TeamPanelType } from './tally';

	let {
		look,
		record,
		panels,
		signature,
		emptyFor = $bindable('')
	}: {
		look: LookState;
		record: RecordType;
		panels: TeamPanelType[];
		signature: SignatureState;
		/** Whose empty inputs the toast lists: a panel's id, `all` for the whole profile (the header's percent). */
		emptyFor?: string;
	} = $props();

	// The focus goes to an input once its panel and section have slid open (panel-body.svelte's wait).
	const SETTLE = 260;
	const SECTIONS: Record<string, string> = {
		details: 'Details',
		contact: 'Contact',
		'signature-photo': 'Photo',
		'signature-banners': 'Banners'
	};

	let openId = $state('profile');
	let openSections = $state<string[]>(['details']);
	let root = $state<HTMLDivElement>();

	const emptyPanel = $derived(panels.find((panel) => panel.id === emptyFor));
	const empties = $derived(
		(emptyFor === 'all' ? panels : emptyPanel ? [emptyPanel] : []).flatMap((panel) =>
			emptyOf(panel.sections).map((input) => ({ ...input, panel }))
		)
	);

	// The list shows in the app's toasts (look.svelte), read anew as each input is filled in; it goes once nothing
	// is left, or the page is left.
	$effect(() => {
		if (emptyFor && !empties.length) untrack(() => (emptyFor = ''));
		look.recordEmpties = empties.length
			? {
					note: toEmptyNote(empties.length, emptyPanel?.name, 'this profile'),
					items: empties.map((input) => ({
						label: `${input.label}, ${input.panel.name} panel`,
						onclick: () => openInput(input.panel, input)
					})),
					onclose: () => (emptyFor = '')
				}
			: undefined;
		return () => (look.recordEmpties = undefined);
	});

	function toggle(list: string[], id: string) {
		return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
	}

	function showEmpty(panel: TeamPanelType) {
		if (!emptyOf(panel.sections).length) {
			emptyFor = '';
			return look.say(`Everything in ${panel.name} is filled in`);
		}
		emptyFor = panel.id;
	}

	function openInput(panel: TeamPanelType, input: EmptyType) {
		openId = panel.id;
		if (!openSections.includes(input.section)) openSections = [...openSections, input.section];
		setTimeout(() => {
			const shown = root?.querySelector<HTMLElement>(`[data-panel="${panel.id}"]`);
			if (shown) focusInput(inputIn(shown, input) ?? shown);
		}, SETTLE);
	}

	function set(change: Record<string, unknown>) {
		look.patch(record.page, record.key, change);
	}
</script>

{#snippet section(id: string, icon: string, panel: TeamPanelType)}
	<Group
		title={SECTIONS[id]}
		section={id}
		values={valuesOf(panel.sections, id)}
		{icon}
		isOpen={openSections.includes(id)}
		ontoggle={() => (openSections = toggle(openSections, id))}
	>
		{#if record.member}
			<RecordFields
				{look}
				page="team"
				value={record.member}
				section={id === 'contact' ? 'contact' : 'details'}
				{set}
				onname={(name) => look.rename(record.page, record.key, name)}
			/>
		{/if}
	</Group>
{/snippet}

<div
	class="space-y-4"
	bind:this={root}
>
	{#each panels as panel (panel.id)}
		{@const metrics = metricsFrom(panel.sections)}
		<PanelCard
			name={panel.name}
			icon={panel.icon}
			{metrics}
			style="ring"
			isOpen={openId === panel.id}
			isQuiet={metrics.status === 'To do'}
			percentTitle="Show what is not filled in yet"
			data-panel={panel.id}
			ontoggle={() => (openId = openId === panel.id ? '' : panel.id)}
			onpercent={() => showEmpty(panel)}
		>
			<div class="min-w-0 space-y-3">
				{#if panel.id === 'profile'}
					{@render section('details', 'icon-[mdi--account]', panel)}
					{@render section('contact', 'icon-[mdi--card-account-phone]', panel)}
				{:else}
					<SignatureEdit
						{look}
						{signature}
						sections={panel.sections}
					/>
				{/if}
			</div>
		</PanelCard>
	{/each}
</div>
