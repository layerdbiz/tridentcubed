<script lang="ts">
	// The Activity (#306; Justin, 2026-11-24, the glossary's Activity): the organization's running list of what happens
	// in the app, newest first, with sign-ins, projects added and every change in the history, and above it when each
	// person last signed in, which no other screen shows. An Admin opens it from the menu on their profile picture. It
	// is built like the Organization's Page: a dark top with a white sheet under it, the one page header, and the
	// Online list's faces, words and device icons. Two views (Justin, 2026-11-26): Grouped, first, folds one person's
	// back-to-back entries into one line that opens like an accordion (`toRuns`), so the page is not one huge list;
	// By Time lists every entry. The names in bold open what they name: a person's Team page, a project, a record. Its newest entries are read each time it opens (`fetchActivity`),
	// and Show Older reads the next ones before the oldest shown through the same query; how it stays up to date while
	// open is the live updates research's to decide (#282), and plugs in behind that one query.
	import { Accordion, Avatar, Button, Tabs } from '@layerd/ui';
	import { fetchActivity } from '#lib/activity/activity.remote.js';
	import type {
		ActivityEventType,
		ActivityKindType,
		ChangeEventType,
		LastSignInType
	} from '#lib/activity/activity.types.js';
	import {
		toRunSummary,
		toRuns,
		type ActivityRunSummaryType,
		type ActivityRunType
	} from '#lib/activity/activity.utils.js';
	import { ICON_192 } from '#lib/install/install.constants.js';
	import type { DeviceKindType } from '#lib/presence/presence.utils.js';
	import { toDeviceIcons, toDuration } from '#lib/presence/presence.utils.js';
	import type { LookState } from './look.state.svelte';
	import { FOLD_LOOK } from './fold';
	import { faceOf } from './marks';
	import PageHeader from './page-header.svelte';
	import type { PageType } from './records.data';

	let { look }: { look: LookState } = $props();

	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	// Each kind's mark on the face, the way a dashboard row marks its state.
	const KINDS: Record<ActivityKindType, { icon: string; tone: string; label: string }> = {
		signIn: { icon: 'icon-[mdi--login-variant]', tone: 'bg-emerald-500', label: 'Signed in' },
		signOut: { icon: 'icon-[mdi--logout-variant]', tone: 'bg-slate-400', label: 'Signed out' },
		code: {
			icon: 'icon-[mdi--email-alert-outline]',
			tone: 'bg-rose-500',
			label: 'Sign-in code never used'
		},
		open: { icon: 'icon-[mdi--folder-open-outline]', tone: 'bg-sky-500', label: 'Opened' },
		download: {
			icon: 'icon-[mdi--file-download-outline]',
			tone: 'bg-violet-500',
			label: 'Downloaded the PDF'
		},
		add: { icon: 'icon-[mdi--plus]', tone: 'bg-primary', label: 'Added' },
		change: { icon: 'icon-[mdi--pencil]', tone: 'bg-amber-500', label: 'Changed' },
		trash: {
			icon: 'icon-[mdi--trash-can-outline]',
			tone: 'bg-slate-500',
			label: 'Moved to the Trash'
		}
	};

	// The two views, Grouped first (Justin, 2026-11-26: "Show the group first"). The page opens on Grouped every time.
	const VIEWS = [
		{ id: 'grouped', label: 'Grouped', icon: 'icon-[mdi--format-list-group]' },
		{ id: 'time', label: 'By Time', icon: 'icon-[mdi--clock-outline]' }
	] as const;
	// Raw, so the picked view stays the very object in VIEWS that the library Tabs compares it with.
	let view = $state.raw<(typeof VIEWS)[number]>(VIEWS[0]);

	// The record page a row's name opens, by the row's table.
	const PAGE_OF_TABLE: Partial<Record<ChangeEventType['table'], PageType>> = {
		customer: 'customers',
		team: 'team',
		transport: 'transport',
		facility: 'facilities'
	};

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

	// The time every "3 hours ago" here is read at.
	const now = Date.now();

	// The page header shows its bar once the dark top has scrolled away.
	let reveal = $state(0);
	function onscroll(event: Event) {
		const top = (event.currentTarget as HTMLElement).scrollTop;
		reveal = Math.min(1, Math.max(0, (top - 80) / 60));
	}

	function dayOf(at: string) {
		const date = new Date(at);
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}

	// "Today", "Yesterday", else the day in words.
	function toDayLabel(at: string) {
		const date = new Date(at);
		const today = new Date(now);
		const yesterday = new Date(now - 86_400_000);
		if (dayOf(at) === dayOf(today.toISOString())) return 'Today';
		if (dayOf(at) === dayOf(yesterday.toISOString())) return 'Yesterday';
		return date.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' })
		});
	}

	function toTime(at: string) {
		return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function toWhen(at: string) {
		return new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}

	// Entries or runs, newest first, a heading before the first of each day.
	function byDay<T extends { id: string }>(items: T[], atOf: (item: T) => string) {
		const days: { label: string; items: T[] }[] = [];
		for (const item of items) {
			const label = toDayLabel(atOf(item));
			if (days.at(-1)?.label === label) days.at(-1)?.items.push(item);
			else days.push({ label, items: [item] });
		}
		return days;
	}

	// "2 panels, 3 photo groups and 1 stop".
	function toList(parts: string[]) {
		return parts.length < 2
			? parts.join('')
			: `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
	}

	// "a customer", "an attachment".
	function toIndefiniteArticle(thing: string) {
		return /^[aeiou]/i.test(thing) ? 'an' : 'a';
	}

	// What a tap on a name opens, or nothing when it is gone (in the Trash, renamed since) or has no page of its own.
	function toPersonOpener(who: string) {
		return look.has('team', who) ? () => look.openRecord('team', who) : undefined;
	}

	function toProjectOpener(id: string | undefined) {
		return id && look.projects.some((project) => project.id === id)
			? () => look.open(id)
			: undefined;
	}

	function toRowOpener(event: ChangeEventType) {
		if (event.table === 'project') return toProjectOpener(event.projectId);
		const project = event.projectId;
		// A panel opens on its project's Edit tab, at that panel, unless this entry moved it to the Trash.
		if (event.table === 'panel' && event.kind !== 'trash' && toProjectOpener(project))
			return () => {
				look.open(project ?? '', 'edit');
				look.panelId = event.rowId;
			};
		const page = PAGE_OF_TABLE[event.table];
		const name = event.name;
		return page && name && look.has(page, name) ? () => look.openRecord(page, name) : undefined;
	}

	// "1 change", "3 changes"; "a project" for one when `one` is given.
	function toCount(count: number, word: string, one = `1 ${word}`) {
		return count === 1 ? one : `${count} ${word}s`;
	}

	// "made 97 changes", "signed in, opened 2 projects and made 3 changes", "signed in 2 times".
	function toRunWords(summary: ActivityRunSummaryType) {
		const changes = summary.added + summary.changed + summary.trashed;
		const said: string[] = [];
		if (summary.codes)
			said.push(
				summary.codes === 1
					? 'asked for a sign-in code and never used it'
					: `asked for ${summary.codes} sign-in codes and never used them`
			);
		if (summary.signIns)
			said.push(summary.signIns === 1 ? 'signed in' : `signed in ${summary.signIns} times`);
		if (summary.opened) said.push(`opened ${toCount(summary.opened, 'project', 'a project')}`);
		if (changes) said.push(`made ${toCount(changes, 'change')}`);
		if (summary.downloads) said.push(`downloaded ${toCount(summary.downloads, 'PDF', 'a PDF')}`);
		if (summary.signOuts)
			said.push(summary.signOuts === 1 ? 'signed out' : `signed out ${summary.signOuts} times`);
		return toList(said);
	}

	// "12 added · 85 changed · 3 moved to the Trash", when a run's changes are of more than one kind.
	function toRunKinds(summary: ActivityRunSummaryType) {
		const kinds = [
			[summary.added, 'added'],
			[summary.changed, 'changed'],
			[summary.trashed, 'moved to the Trash']
		].filter(([count]) => count);
		return kinds.length < 2 ? '' : kinds.map(([count, words]) => `${count} ${words}`).join(' · ');
	}

	function isSameMinute(a: string, b: string) {
		return toTime(a) === toTime(b) && toDayLabel(a) === toDayLabel(b);
	}

	// A press on a name inside a run's header opens it, and leaves the run open or shut as it was.
	function press(event: Event, open: () => void) {
		event.stopPropagation();
		open();
	}

	// Enter and Space on a name are its own, not the run header's round it.
	function keepKey(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
	}
</script>

<!-- A device, by the Online list's icons (#337), and its words. -->
{#snippet device(kind: DeviceKindType | undefined, name: string)}
	{@const icons = toDeviceIcons(kind, name)}
	<span class="flex shrink-0 items-center gap-1 text-xs text-slate-500">
		{#if icons.kind}<span class="{icons.kind} size-3.5 text-slate-400"></span>{/if}
		{#if icons.system}<span class="{icons.system} size-3"></span>{/if}
		{#if icons.isApp}<img
				src={ICON_192}
				alt=""
				class="size-3 rounded-[3px]"
			/>{:else if icons.browser}<span class="{icons.browser} size-3"></span>{/if}
		<span class="truncate">{name}</span>
	</span>
{/snippet}

<!-- A name in bold, which opens what it names when that has a page (Justin, 2026-11-26): the library Button with the
     look of an underlined bold word. A name too long for the rest of its line starts the next one. -->
{#snippet named(text: string, open: (() => void) | undefined)}
	<!-- In a flex box, so the space the Button leaves after itself never shows: "lift, Sample", not "lift , Sample". -->
	{#if open}<span class="inline-flex"
			><Button
				unstyled
				label={text}
				class="cursor-pointer text-left font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-900"
				onclick={(event: MouseEvent) => press(event, open)}
				onkeydown={keepKey}
			/></span
		>{:else}<b class="font-semibold text-slate-900">{text}</b>{/if}
{/snippet}

<!-- A person's face, the library Avatar from the app's one look (#379). -->
{#snippet face(who: string, hasPresence = true)}
	<Avatar
		{...faceOf(who, { hasPresence })}
		size={36}
		ring="ring-2 ring-slate-200"
	/>
{/snippet}

<!-- A day's heading over its entries or runs. -->
{#snippet dayHeading(label: string)}
	<h4 class="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
		{label}
	</h4>
{/snippet}

<!-- What happened, in words: who first (left out inside a person's run), then what they did, the names they did it
     to in bold. -->
{#snippet sentence(event: ActivityEventType, hasWho = true)}
	{#if hasWho}{@render named(event.who, toPersonOpener(event.who))}{/if}
	{#if event.kind === 'signIn'}
		signed in{#if event.isGuest}, waiting for access{/if}
	{:else if event.kind === 'signOut'}
		signed out
	{:else if event.kind === 'code'}
		asked for a sign-in code and never used it
	{:else if event.kind === 'open' || event.kind === 'download'}
		{event.kind === 'open' ? 'opened' : 'downloaded the PDF of'}
		{#if event.project !== undefined}{@render named(
				event.project,
				toProjectOpener(event.projectId)
			)}{:else}a project no longer there{/if}
	{:else if event.kind === 'add'}
		added {event.name ? `the ${event.thing}` : `${toIndefiniteArticle(event.thing)} ${event.thing}`}
		{#if event.name}{@render named(event.name, toRowOpener(event))}{/if}
		{#if event.project !== undefined}to {@render named(
				event.project,
				toProjectOpener(event.projectId)
			)}{/if}
	{:else}
		{event.kind === 'trash' ? 'moved' : 'changed'} the {event.thing}
		{#if event.name}{@render named(event.name, toRowOpener(event))}{/if}
		{#if event.project !== undefined}in {@render named(
				event.project,
				toProjectOpener(event.projectId)
			)}{/if}
		{#if event.kind === 'trash'}to the Trash{/if}
	{/if}
{/snippet}

<!-- What a run did besides the who: the line under it, its words and the projects it touched. -->
{#snippet details(event: ActivityEventType)}
	{#if event.kind === 'signIn' || event.kind === 'signOut'}
		{#if event.device}
			<span class="mt-0.5 flex">{@render device(event.deviceKind, event.device)}</span>
		{/if}
	{:else if event.kind === 'code'}
		<!-- The address it was sent to, when the name above is not already it. -->
		{#if event.email !== event.who}
			<span class="mt-0.5 block text-xs break-words text-slate-500">To {event.email}</span>
		{/if}
	{:else if event.kind === 'add' || event.kind === 'change' || event.kind === 'trash'}
		{#if event.parts?.length}
			<span class="mt-0.5 block text-xs text-slate-500">With {toList(event.parts)}</span>
		{:else if event.columns.length}
			<span class="mt-0.5 block text-xs text-slate-500">{event.columns.join(', ')}</span>
		{/if}
	{/if}
{/snippet}

{#snippet person(each: LastSignInType)}
	<li>
		<button
			type="button"
			class="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-900/[0.03]"
			title="{each.isFirst ? 'First signed in' : 'Last signed in'} {toWhen(each.at)}"
			onclick={toPersonOpener(each.who)}
		>
			{@render face(each.who)}
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-slate-900">{each.who}</span>
				<span class="block truncate text-xs text-slate-500"
					>{each.isFirst ? 'First signed in' : 'Signed in'}
					{toDuration(now - Date.parse(each.at))} ago</span
				>
				<!-- A Guest, with the email an Admin lets them in with. -->
				{#if each.isGuest}<span class="block text-xs break-words text-amber-700"
						>Waiting for access · {each.email}</span
					>{/if}
			</span>
			{#if each.device}{@render device(each.deviceKind, each.device)}{/if}
		</button>
	</li>
{/snippet}

{#snippet line(event: ActivityEventType, isBoxed = false)}
	{@const kind = KINDS[event.kind]}
	<li
		class={[
			'flex min-w-0 items-start gap-3',
			isBoxed ? [FOLD_LOOK.class, 'py-3 pr-[42px] pl-3'] : 'px-4 py-3'
		]}
	>
		<span
			class="relative mt-0.5 shrink-0"
			role="img"
			aria-label="{event.who}, {kind.label}"
		>
			{@render face(event.who, false)}
			<span
				class="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-slate-50 {kind.tone}"
				><span class="{kind.icon} size-3"></span></span
			>
		</span>
		<span class="min-w-0 flex-1">
			<span class="block text-sm leading-snug break-words text-slate-600"
				>{@render sentence(event)}</span
			>
			{@render details(event)}
		</span>
		<time
			class="shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums"
			datetime={event.at}
			title={toWhen(event.at)}>{toTime(event.at)}</time
		>
	</li>
{/snippet}

<!-- One entry inside a person's run: its kind's mark where the face was, and what they did. Its time lines up with
     the run's, left of the Accordion's chevron. -->
{#snippet entry(event: ActivityEventType)}
	{@const kind = KINDS[event.kind]}
	<li class="flex min-w-0 items-start gap-3 py-1.5 pr-[26px] pl-0">
		<span class="flex w-9 shrink-0 justify-center pt-0.5">
			<span
				class="flex size-[22px] items-center justify-center rounded-full text-white {kind.tone}"
				role="img"
				aria-label={kind.label}><span class="{kind.icon} size-3.5"></span></span
			>
		</span>
		<span class="min-w-0 flex-1">
			<span class="block text-sm leading-snug break-words text-slate-600 first-letter:uppercase"
				>{@render sentence(event, false)}</span
			>
			{@render details(event)}
		</span>
		<time
			class="shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums"
			datetime={event.at}
			title={toWhen(event.at)}>{toTime(event.at)}</time
		>
	</li>
{/snippet}

<!-- A person's back-to-back entries as one section of the library Accordion: who, how much and where, and when it
     began and ended; it opens to show every entry. A run of one is its entry's own line, in the same box. -->
{#snippet run(each: ActivityRunType)}
	{#if each.events.length === 1}
		{@render line(each.events[0], true)}
	{:else}
		{@const summary = toRunSummary(each)}
		{@const kinds = toRunKinds(summary)}
		<li>
			<Accordion {...FOLD_LOOK}>
				{#snippet head()}
					<span class="flex min-w-0 flex-1 items-start gap-3">
						<span class="mt-0.5 shrink-0">
							{@render face(each.who, false)}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block text-sm leading-snug break-words text-slate-600"
								>{@render named(each.who, toPersonOpener(each.who))}
								{toRunWords(summary)}</span
							>
							{#if summary.projects.length}
								<span class="mt-0.5 block text-xs leading-snug text-slate-500"
									>In {#each summary.projects.slice(0, 2) as project, index (project.id ?? project.title)}{#if index}{summary
												.projects.length === 2
												? ' and '
												: ', '}{/if}{@render named(
											project.title,
											toProjectOpener(project.id)
										)}{/each}{#if summary.projects.length > 2}{` and ${summary.projects.length - 2} more`}{/if}</span
								>
							{/if}
							{#if kinds}<span class="mt-0.5 block text-xs text-slate-400">{kinds}</span>{/if}
						</span>
						<span class="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
							<time
								class="text-xs text-slate-400 tabular-nums"
								datetime={each.to}
								title={toWhen(each.to)}>{toTime(each.to)}</time
							>
							{#if !isSameMinute(each.from, each.to)}
								<time
									class="text-xs text-slate-400 tabular-nums"
									datetime={each.from}
									title={toWhen(each.from)}>from {toTime(each.from)}</time
								>
							{/if}
						</span>
					</span>
				{/snippet}
				<ul
					class="-ml-1"
					aria-label="{each.who}, {each.events.length} entries"
				>
					{#each each.events as event (event.id)}{@render entry(event)}{/each}
				</ul>
			</Accordion>
		</li>
	{/if}
{/snippet}

<div class="relative h-dvh overflow-clip bg-white">
	<PageHeader
		{look}
		title="Activity"
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
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Activity</h1>
			<p class="mt-1.5 max-w-md text-sm text-white/75">
				Sign-ins and sign-outs, projects opened, PDFs downloaded and every change in {look
					.organization.name}, newest first.
			</p>
		</div>
		<div
			class="relative -mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+112px)]"
		>
			<div class="mx-auto max-w-3xl space-y-6">
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
						<section>
							<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Last Sign-In</h3>
							{#if found.people.length}
								<ul class="divide-y divide-slate-900/[0.05] overflow-hidden {CARD}">
									{#each found.people as each (each.userId)}{@render person(each)}{/each}
								</ul>
							{:else}
								<p class="px-4 py-3 text-sm text-slate-500 {CARD}">Nobody has signed in yet.</p>
							{/if}
						</section>
						<section>
							<div class="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
								<h3 class="text-sm font-semibold text-slate-900">All Activity</h3>
								<Tabs
									class="inline-flex rounded-full bg-slate-900/[0.05] p-1"
									label="Activity view"
									options={VIEWS}
									bind:value={view}
								>
									{#snippet option({ value: item, isOn, props })}
										<button
											{...props}
											type="button"
											class="flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition {isOn
												? 'bg-white text-slate-900 shadow-sm'
												: 'text-slate-500'}"
											id="activity-view-{item.id}"
											aria-controls="activity-entries"
											><span class="{item.icon} size-4"></span>{item.label}</button
										>
									{/snippet}
								</Tabs>
							</div>
							{#if found.events.length}
								{@const events = [...found.events, ...older]}
								<div
									class="space-y-4"
									id="activity-entries"
									role="tabpanel"
									aria-labelledby="activity-view-{view.id}"
								>
									{#if view.id === 'grouped'}
										{#each byDay(toRuns(events), (each) => each.to) as day (day.label)}
											<div>
												{@render dayHeading(day.label)}
												<ul class="space-y-2">
													{#each day.items as each (each.id)}{@render run(each)}{/each}
												</ul>
											</div>
										{/each}
									{:else}
										{#each byDay(events, (event) => event.at) as day (day.label)}
											<div>
												{@render dayHeading(day.label)}
												<ul class="divide-y divide-slate-900/[0.05] overflow-hidden {CARD}">
													{#each day.items as event (event.id)}{@render line(event)}{/each}
												</ul>
											</div>
										{/each}
									{/if}
								</div>
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
							{:else}
								<p class="px-4 py-3 text-sm text-slate-500 {CARD}">Nothing has happened yet.</p>
							{/if}
						</section>
					{/if}
				{:catch}
					<p class="px-1 py-10 text-center text-sm text-slate-500">
						The Activity could not load. Check the connection and open it again.
					</p>
				{/await}
			</div>
		</div>
	</div>
</div>
