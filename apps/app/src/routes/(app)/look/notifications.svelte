<script lang="ts">
	// The bell's Notifications (#403; Justin, 2026-11-27, picked on the prototype): a heading with how many are new,
	// then the one list the Activity Log wears (activity-list.svelte), one by one, newest first, with no sorting or
	// filters. Only what is about the person signed in, and What's New's days. A line is light blue until it is
	// tapped; a tap opens what it is about and closes the Notifications. On a phone they fill the screen with a back
	// arrow; on a desktop they hang from the bell.
	import { Button } from '@layerd/ui';
	import { whatsNew } from '#lib/releases/releases.state.svelte.js';
	import ActivityList from './activity-list.svelte';
	import type { LookState } from './look.state.svelte';
	import type { NotificationsState } from './bell.svelte';

	let {
		look,
		notifications,
		hasBack = false,
		onclose,
		onsettings
	}: {
		look: LookState;
		notifications: NotificationsState;
		// A phone's: the page's back arrow.
		hasBack?: boolean;
		// Told when they close: by the back arrow, or by a line opening what it is about (`hasOpened`).
		onclose: (hasOpened?: boolean) => void;
		// The cog: what rings the bell, on Settings.
		onsettings?: () => void;
	} = $props();

	// The library Button in the type picked on #386, as the shell's.
	const ROUND = { secondary: true, ghost: true, md: true };
</script>

<div class="flex min-h-0 flex-col {hasBack ? 'h-full' : ''}">
	<header
		class="sticky top-0 z-20 flex shrink-0 items-center gap-1 bg-white px-2 {hasBack
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
		{#if onsettings}<Button
				{...ROUND}
				icon="icon-[mdi--cog-outline]"
				aria-label="Notification settings"
				title="Notification settings"
				class="ml-auto"
				onclick={onsettings}
			/>{/if}
	</header>
	<div class="min-h-0 flex-1 px-2 pb-3 {hasBack ? 'overflow-y-auto overscroll-y-contain' : ''}">
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
				ontap={(event) => {
					notifications.see(event.id);
					onclose(true);
				}}
				onrelease={() => {
					onclose(true);
					whatsNew.openAll();
				}}
			/>
		{/if}
	</div>
</div>
