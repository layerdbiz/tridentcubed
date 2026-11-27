<script lang="ts">
	// The Activity Log (#306; #403, Justin, 2026-11-27): the organization's running list of what happens in the app,
	// newest first: sign-ins and sign-outs, projects opened, PDFs downloaded and every change in the history. An Admin
	// opens it from the menu on their profile picture. It is built like the Organization's Page: a dark top with a white
	// sheet under it and the one page header. The list is the one the bell wears too (activity-list.svelte), in the
	// look Justin picked on the prototype: the face of who did it with the action as its badge, sorted All, Projects or
	// Users, grouped or not, with filters. It opens on All, grouped (#306: grouped first). Its newest entries are read
	// each time it opens (`fetchActivity`), and Show Older reads the next ones before the oldest shown through the same
	// query; how it stays up to date while open is the live updates research's to decide (#282).
	import { Button } from '@layerd/ui';
	import { fetchActivity } from '#lib/activity/activity.remote.js';
	import type { ActivityEventType } from '#lib/activity/activity.types.js';
	import ActivityList, { type ActivityTabType } from './activity-list.svelte';
	import type { LookState } from './look.state.svelte';
	import PageHeader from './page-header.svelte';

	let { look }: { look: LookState } = $props();

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

	// The page header shows its bar once the dark top has scrolled away.
	let reveal = $state(0);
	function onscroll(event: Event) {
		const top = (event.currentTarget as HTMLElement).scrollTop;
		reveal = Math.min(1, Math.max(0, (top - 80) / 60));
	}
</script>

<div class="relative h-dvh overflow-clip bg-white">
	<PageHeader
		{look}
		title="Activity Log"
		kind={look.organization.name}
		{reveal}
		isLight
		hasChevron={look.variant('header') === 'C'}
	/>
	<div
		class="h-full overflow-y-auto overscroll-y-contain"
		{onscroll}
	>
		<div
			class="flex flex-col items-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16 text-center text-white"
		>
			<span class="flex size-16 items-center justify-center rounded-3xl bg-white/10"
				><span class="icon-[mdi--timeline-clock-outline] size-9"></span></span
			>
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Activity Log</h1>
			<p class="mt-1.5 max-w-md text-sm text-white/75">
				Sign-ins and sign-outs, projects opened, PDFs downloaded and every change in {look
					.organization.name}, newest first.
			</p>
		</div>
		<div
			class="relative -mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+112px)]"
		>
			<div class="mx-auto max-w-3xl">
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
			</div>
		</div>
	</div>
</div>
