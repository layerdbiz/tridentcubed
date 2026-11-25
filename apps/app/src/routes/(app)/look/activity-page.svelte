<script lang="ts">
	// The Activity (#306; Justin, 2026-11-24, the glossary's Activity): the organization's running list of what happens
	// in the app, newest first, with sign-ins, projects added and every change in the history, and above it when each
	// person last signed in, which no other screen shows. An Admin opens it from the menu on their profile picture. It
	// is built like the Organization's Page: a dark top with a white sheet under it, the one page header, and the
	// Online list's faces, words and device icons. Its newest entries are read each time it opens (`fetchActivity`),
	// and Show Older reads the next ones before the oldest shown through the same query; how it stays up to date while
	// open is the live updates research's to decide (#282), and plugs in behind that one query.
	import { fetchActivity } from '#lib/activity/activity.remote.js';
	import type {
		ActivityEventType,
		ActivityKindType,
		LastSignInType
	} from '#lib/activity/activity.types.js';
	import { ICON_192 } from '#lib/install/install.constants.js';
	import type { DeviceKindType } from '#lib/presence/presence.utils.js';
	import { toDeviceIcons, toDuration } from '#lib/presence/presence.utils.js';
	import Avatar from './avatar.svelte';
	import type { LookState } from './look.state.svelte';
	import PageHeader from './page-header.svelte';

	let { look }: { look: LookState } = $props();

	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	// Each kind's mark on the face, the way a dashboard row marks its state.
	const KINDS: Record<ActivityKindType, { icon: string; tone: string; label: string }> = {
		signIn: { icon: 'icon-[mdi--login-variant]', tone: 'bg-emerald-500', label: 'Signed in' },
		add: { icon: 'icon-[mdi--plus]', tone: 'bg-primary', label: 'Added' },
		change: { icon: 'icon-[mdi--pencil]', tone: 'bg-amber-500', label: 'Changed' },
		trash: {
			icon: 'icon-[mdi--trash-can-outline]',
			tone: 'bg-slate-500',
			label: 'Moved to the Trash'
		}
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

	// The events, a heading before the first of each day.
	function byDay(events: ActivityEventType[]) {
		const days: { label: string; events: ActivityEventType[] }[] = [];
		for (const event of events) {
			const label = toDayLabel(event.at);
			if (days.at(-1)?.label === label) days.at(-1)?.events.push(event);
			else days.push({ label, events: [event] });
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

	function openPerson(who: string) {
		if (look.has('team', who)) look.openRecord('team', who);
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

<!-- What happened, in words: who first, then what they did, the names they did it to in bold. -->
{#snippet sentence(event: ActivityEventType)}
	<b class="font-semibold text-slate-900">{event.who}</b>
	{#if event.kind === 'signIn'}
		signed in
	{:else if event.kind === 'add'}
		added {event.name ? `the ${event.thing}` : `${toIndefiniteArticle(event.thing)} ${event.thing}`}
		{#if event.name}<b class="font-semibold text-slate-900">{event.name}</b>{/if}
		{#if event.project !== undefined}to <b class="font-semibold text-slate-900">{event.project}</b
			>{/if}
	{:else}
		{event.kind === 'trash' ? 'moved' : 'changed'} the {event.thing}
		{#if event.name}<b class="font-semibold text-slate-900">{event.name}</b>{/if}
		{#if event.project !== undefined}in <b class="font-semibold text-slate-900">{event.project}</b
			>{/if}
		{#if event.kind === 'trash'}to the Trash{/if}
	{/if}
{/snippet}

{#snippet person(each: LastSignInType)}
	<li>
		<button
			type="button"
			class="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-900/[0.03]"
			title="{each.isFirst ? 'First signed in' : 'Last signed in'} {toWhen(each.at)}"
			onclick={() => openPerson(each.who)}
		>
			<Avatar
				name={each.who}
				size={36}
				ring="ring-slate-200"
			/>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-medium text-slate-900">{each.who}</span>
				<span class="block truncate text-xs text-slate-500"
					>{each.isFirst ? 'First signed in' : 'Signed in'}
					{toDuration(now - Date.parse(each.at))} ago</span
				>
			</span>
			{#if each.device}{@render device(each.deviceKind, each.device)}{/if}
		</button>
	</li>
{/snippet}

{#snippet line(event: ActivityEventType)}
	{@const kind = KINDS[event.kind]}
	<li class="flex min-w-0 items-start gap-3 px-4 py-3">
		<span
			class="relative mt-0.5 shrink-0"
			role="img"
			aria-label="{event.who}, {kind.label}"
		>
			<Avatar
				name={event.who}
				size={36}
				ring="ring-slate-200"
				hasPresence={false}
			/>
			<span
				class="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-slate-50 {kind.tone}"
				><span class="{kind.icon} size-3"></span></span
			>
		</span>
		<span class="min-w-0 flex-1">
			<span class="block text-sm leading-snug break-words text-slate-600"
				>{@render sentence(event)}</span
			>
			{#if event.kind === 'signIn'}
				{#if event.device}
					<span class="mt-0.5 flex">{@render device(event.deviceKind, event.device)}</span>
				{/if}
			{:else if event.parts?.length}
				<span class="mt-0.5 block text-xs text-slate-500">With {toList(event.parts)}</span>
			{:else if event.columns.length}
				<span class="mt-0.5 block text-xs text-slate-500">{event.columns.join(', ')}</span>
			{/if}
		</span>
		<time
			class="shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums"
			datetime={event.at}
			title={toWhen(event.at)}>{toTime(event.at)}</time
		>
	</li>
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
				Sign-ins, projects added and every change in {look.organization.name}, newest first.
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
							<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">All Activity</h3>
							{#if found.events.length}
								<div class="space-y-4">
									{#each byDay([...found.events, ...older]) as day (day.label)}
										<div>
											<h4
												class="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
											>
												{day.label}
											</h4>
											<ul class="divide-y divide-slate-900/[0.05] overflow-hidden {CARD}">
												{#each day.events as event (event.id)}{@render line(event)}{/each}
											</ul>
										</div>
									{/each}
								</div>
								{#if olderBefore}
									<div class="mt-4 flex flex-col items-center gap-2">
										<button
											type="button"
											class="flex h-10 items-center gap-2 rounded-full bg-slate-900/[0.05] px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-900/[0.08] disabled:opacity-60"
											disabled={isLoadingOlder}
											onclick={showOlder}
										>
											{#if isLoadingOlder}<span
													class="icon-[svg-spinners--ring-resize] size-4 text-slate-400"
												></span>{/if}
											Show Older
										</button>
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
