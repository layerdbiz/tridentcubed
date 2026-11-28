<script lang="ts">
	// PROTOTYPE (#161) run 12: a record's Edit tab, the same form for a customer, a team, a transport mode and a
	// facility (Justin's run 12 note 18). Every change is kept as it is typed, like a project's panels; a new name is
	// kept when the field is left, and follows the record into every project that uses it. Delete is at the bottom and
	// asks first. Run 15 added everything a report prints about the record. Run 16: the fields themselves are
	// record-fields.svelte, shared with the + sheet, so this is only where their changes go (`look.patch`) and Delete.
	import type { Snippet } from 'svelte';
	import { Button } from '@layerd/ui';
	import { DATASETS } from './look.data';
	import type { LookState } from './look.state.svelte';
	import RecordFields from './record-fields.svelte';
	import { customerOf, type RecordType } from './records.data';

	let {
		look,
		record,
		children = undefined
	}: {
		look: LookState;
		record: RecordType;
		/** What stands in place of the fields, before Delete: a Team member's panels (team-edit.svelte, 2026-11-28). */
		children?: Snippet;
	} = $props();

	const value = $derived(
		record.page === 'customers'
			? customerOf(look, record.key)
			: record.page === 'team'
				? record.member
				: record.page === 'transport'
					? look.transports.find((item) => item.name === record.key)
					: look.facilities.find((item) => item.name === record.key)
	);

	function remove() {
		look.confirm({
			title: `Delete ${DATASETS[record.page].one}?`,
			note: 'It moves to Trash, where an admin can restore it. Projects that use it keep its name.',
			onyes: () => look.removeRecord(record.page, record.key)
		});
	}
</script>

<div class="space-y-4">
	{#if children}
		{@render children()}
	{:else if value}
		<RecordFields
			{look}
			page={record.page}
			{value}
			set={(change) => look.patch(record.page, record.key, change)}
			onname={(name) => look.rename(record.page, record.key, name)}
		/>
	{/if}

	<Button
		danger
		lite
		sm
		width="full"
		align="center"
		icon="icon-[mdi--trash-can-outline]"
		label="Delete"
		onclick={remove}
	/>
</div>
