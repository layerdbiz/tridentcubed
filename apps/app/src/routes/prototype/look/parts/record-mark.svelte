<script lang="ts">
	// PROTOTYPE (#161) run 12: a record's round icon, the same in the list, the cards, the board and its own page: a
	// customer's logo, a team member's photo, or a transport's or facility's icon. Its projects show as a number badge
	// at the bottom right (Justin's run 12 notes 9 and 10, in place of "1 project · 1 open"): blue while one is still
	// open, grey when they are all done, 9+ above nine, none at all with no projects. A team member's photo has a ring
	// in their role's colour, so admins and managers stand out at a glance (note 8): blue for an admin, violet for a
	// manager, none for a member.
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import { badgeOf, type RecordType } from './records.data';

	let {
		record,
		size = 44,
		hasBadge = true
	}: { record: RecordType; size?: number; hasBadge?: boolean } = $props();

	const RING = {
		admin: 'ring-primary ring-offset-2 ring-offset-white',
		manager: 'ring-violet-500 ring-offset-2 ring-offset-white',
		team: 'ring-slate-200'
	};
	const badge = $derived(Math.max(16, Math.round(size * 0.4)));
</script>

<span
	class="relative inline-block shrink-0"
	style="width: {size}px; height: {size}px"
>
	{#if record.page === 'customers'}
		<ClientLogo
			name={record.key}
			{size}
			shape="circle"
		/>
	{:else if record.page === 'team'}
		<Avatar
			name={record.key}
			{size}
			ring={RING[record.member?.role ?? 'team']}
		/>
	{:else}
		<span
			class="flex items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-900 text-white"
			style="width: {size}px; height: {size}px"><span class="{record.icon} size-1/2"></span></span
		>
	{/if}
	{#if hasBadge && record.count}
		<span
			class="absolute -right-1 -bottom-1 flex items-center justify-center rounded-full px-1 font-bold text-white tabular-nums ring-2 ring-white {record.open
				? 'bg-primary'
				: 'bg-slate-400'}"
			style="min-width: {badge}px; height: {badge}px; font-size: {Math.round(badge * 0.6)}px"
			title="{record.count} project{record.count === 1 ? '' : 's'}, {record.open} open"
			>{badgeOf(record.count)}</span
		>
	{/if}
</span>
