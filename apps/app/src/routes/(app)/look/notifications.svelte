<script lang="ts">
	// The bell's Notifications (#403; Justin, 2026-11-27, picked on the prototype): a heading with how many are new,
	// then the one list the Activity Log wears (activity-list.svelte), one by one, newest first, with no sorting or
	// filters. Only what is about the person signed in, and What's New's days. A line is light blue until it is
	// tapped; a tap opens what it is about and closes the Notifications. Group folds one person's back-to-back work
	// into one line, as in the Activity Log, which opens from the top right (Justin, 2026-11-27; for everyone since
	// 2026-11-28, each seeing only what they are privy to). On a phone they fill the screen with a back arrow; on a
	// desktop they hang from the bell, half the screen tall at most (Justin, 2026-11-27: the box ran all the way down
	// the page). The heading stays put while the list scrolls in the library Scroller, fading at its top and bottom
	// like every list, under the day headings that stick to its top on a desktop as on a phone.
	import { Button, Scroller } from '@layerd/ui';
	import { whatsNew } from '#lib/releases/releases.state.svelte.js';
	import ActivityList, { HEADING, HEADING_HEIGHT } from './activity-list.svelte';
	import type { LookState } from './look.state.svelte';
	import type { NotificationsState } from './bell.svelte';

	let {
		look,
		notifications,
		hasBack = false,
		onclose,
		onall
	}: {
		look: LookState;
		notifications: NotificationsState;
		// A phone's: the page's back arrow.
		hasBack?: boolean;
		// Told when they close: by the back arrow, or by a line opening what it is about (`hasOpened`).
		onclose: (hasOpened?: boolean) => void;
		// "Activity Log": the full Log in Settings (Justin, 2026-11-27: in the cog's place), everyone's for an Admin.
		onall?: () => void;
	} = $props();

	// The library Button in the type picked on #386, as the shell's.
	const ROUND = { secondary: true, ghost: true, md: true };
</script>

<div class="flex min-h-0 flex-col {hasBack ? 'h-full' : 'max-h-[50dvh]'}">
	<header
		class="flex shrink-0 items-center gap-1 px-2 {hasBack
			? 'pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2'
			: 'pt-2 pb-1 pl-3'}"
	>
		{#if hasBack}<Button
				{...ROUND}
				icon="icon-[mdi--arrow-left]"
				aria-label="Close Notifications"
				onclick={() => onclose()}
			/>{/if}
		<h2 class="min-w-0 truncate font-semibold text-slate-900 {hasBack ? 'text-lg' : 'text-base'}">
			Notifications
		</h2>
		{#if notifications.count}<span
				class="ml-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
				>{notifications.count} new</span
			>{/if}
		<!-- Group, as the Activity Log's: one person's back-to-back work as one line that opens. -->
		<Button
			{...notifications.isGrouped
				? { primary: true, lite: true }
				: { secondary: true, ghost: true }}
			sm
			icon="icon-[mdi--format-list-group]"
			label={hasBack ? undefined : 'Group'}
			aria-label="Group"
			aria-pressed={notifications.isGrouped}
			title={notifications.isGrouped
				? 'Grouped: tap to list one by one'
				: 'One by one: tap to group'}
			class="ml-auto shrink-0"
			onclick={() => (notifications.isGrouped = !notifications.isGrouped)}
		/>
		{#if onall}<Button
				primary
				ghost
				sm
				label="Activity Log"
				title="See all activity"
				class="shrink-0"
				onclick={onall}
			/>{/if}
	</header>
	<Scroller
		fade="y"
		inset={{ top: HEADING_HEIGHT }}
		keep={HEADING}
		class="min-h-0 flex-1 overscroll-y-contain px-2 pb-3"
	>
		{#if !notifications.isRead}
			<p class="px-3 py-10 text-center text-sm text-slate-500">Loading…</p>
		{:else if notifications.hasFailed && !notifications.events.length}
			<p class="px-3 py-10 text-center text-sm text-slate-500">
				The Notifications could not be read. Check the connection and open them again.
			</p>
		{:else if !notifications.events.length && !notifications.releases.length}
			<p class="px-3 py-10 text-center text-sm text-slate-500">
				Nothing new. Changes others make in your projects show here.
			</p>
		{:else}
			<ActivityList
				{look}
				events={notifications.events}
				unread={notifications.unread}
				releases={notifications.releases}
				isGrouped={notifications.isGrouped}
				ontap={(event) => {
					notifications.see(event.id);
					onclose(true);
				}}
				onrelease={(release) => {
					onclose(true);
					whatsNew.openAt(release.from);
				}}
			/>
		{/if}
	</Scroller>
</div>
