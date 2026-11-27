<script lang="ts">
	// The Activity Log's list and how it loads (#306; #403, Justin, 2026-11-27): worn by the Activity Log's own page
	// and by Settings. Its newest entries are read each time it opens (`fetchActivity`), and Show Older reads the next
	// ones before the oldest shown through the same query; how it stays up to date while open is the live updates
	// research's to decide (#282). It opens on All, grouped (#306: grouped first). What others did since the person
	// last opened it is light blue for this visit; on the first visit, nothing is. The lines they tapped in the bell
	// are seen already.
	import { Button } from '@layerd/ui';
	import { untrack } from 'svelte';
	import { fetchActivity } from '#lib/activity/activity.remote.js';
	import type { ActivityEventType } from '#lib/activity/activity.types.js';
	import ActivityList, { type ActivityTabType } from './activity-list.svelte';
	import type { LookState } from './look.state.svelte';
	import { logSeenAt, markLogSeen } from './seen';

	let { look }: { look: LookState } = $props();

	const since = untrack(() => logSeenAt(look));
	const tapped = untrack(() => new Set(look.seen.map((each) => each.line)));
	untrack(() => markLogSeen(look));
	function unreadOf(events: ActivityEventType[]) {
		if (!since) return new Set<string>();
		return new Set(
			events
				.filter(
					(event) => event.at > since && event.userId !== look.userId && !tapped.has(event.id)
				)
				.map((event) => event.id)
		);
	}

	let tab = $state<ActivityTabType>('all');
	let isGrouped = $state(true);

	// The entries Show Older added below the newest, oldest last, and the time the next ones are read before (none
	// when nothing older is left).
	let older = $state<ActivityEventType[]>([]);
	let olderBefore = $state<string>();
	let isLoadingOlder = $state(false);
	let hasOlderFailed = $state(false);

	// Read once as it opens. A query already asked for on an earlier visit is asked again, so it is never stale.
	async function load() {
		const query = fetchActivity();
		await query.refresh();
		const found = await query;
		if (found.isAllowed) olderBefore = found.olderBefore;
		return found;
	}
	const activity = load();

	async function showOlder() {
		if (!olderBefore || isLoadingOlder) return;
		isLoadingOlder = true;
		hasOlderFailed = false;
		try {
			const page = await fetchActivity({ before: olderBefore });
			if (page.isAllowed) {
				older.push(...page.events);
				olderBefore = page.olderBefore;
			}
		} catch {
			hasOlderFailed = true;
		} finally {
			isLoadingOlder = false;
		}
	}
</script>

{#await activity}
	<div
		class="flex justify-center py-16"
		role="status"
	>
		<span class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"></span>
		<span class="sr-only">Loading</span>
	</div>
{:then found}
	{#if !found.isAllowed}
		<p class="px-1 py-10 text-center text-sm text-slate-500">{found.reason}</p>
	{:else}
		<ActivityList
			{look}
			events={[...found.events, ...older]}
			unread={unreadOf([...found.events, ...older])}
			isFull
			bind:tab
			bind:isGrouped
		/>
		{#if olderBefore}
			<div class="mt-4 flex flex-col items-center gap-2">
				<Button
					neutral
					lite
					sm
					icon={isLoadingOlder ? 'icon-[svg-spinners--ring-resize]' : undefined}
					label="Show Older"
					disabled={isLoadingOlder}
					onclick={showOlder}
				/>
				{#if hasOlderFailed}
					<p class="text-xs text-slate-500">
						Older activity could not load. Check the connection and try again.
					</p>
				{/if}
			</div>
		{/if}
	{/if}
{:catch}
	<p class="px-1 py-10 text-center text-sm text-slate-500">
		The Activity Log could not load. Check the connection and open it again.
	</p>
{/await}
