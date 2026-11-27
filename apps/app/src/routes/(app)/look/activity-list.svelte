<script
	lang="ts"
	module
>
	export type ActivityTabType = 'all' | 'projects' | 'users';
</script>

<script lang="ts">
	// The Activity Log's list (#403, Justin, 2026-11-27, picked on the prototype): one list, worn by the Activity Log
	// and by the bell. Every row is the face of who did it with the action as a badge on it (added, changed, deleted,
	// opened...), then two lines: who did what, and how long ago in the Online list's colours with where it happened,
	// under the headings Today, Yesterday, Last 7 days and Earlier. A tap on a row opens what it is about: the project,
	// at its panel when it is one, the record, or the person's Team page.
	//
	// The Log (`isFull`) sorts the rows three ways, All, Projects and Users, each grouped or not (Group), with filters
	// for the person, the project and the time. A group keeps its big picture (a face, a project); its lines hang under
	// it on a grey line, each one's small icon on the line, the action's icon on a light circle of its own colour, or
	// the face of who did it with the action as its badge. A group shows how many of each action it holds, like the
	// file counts (#350): on the right where the list is wide, after the time on a phone. Not grouped, Projects and
	// Users are rows like any other, with no arrow: one per project, with its newest action, and one per person, with
	// their online dot and how long they have been online or away, coloured like the Online list.
	import { Avatar, Button, ListRow, Menu, Tabs, type MenuOptionType } from '@layerd/ui';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActivityEventType, ChangeEventType } from '#lib/activity/activity.types.js';
	import {
		ACTIVITY_TIMES,
		byBucket,
		isInTime,
		projectOfEvent,
		toAgo,
		toPeopleGroups,
		toProjectGroups,
		toRunSummary,
		toRuns,
		toTally,
		type ActivityRunType,
		type ActivityTimeType,
		type AgoToneType
	} from '#lib/activity/activity.utils.js';
	import { toDeviceIcons } from '#lib/presence/presence.utils.js';
	import { PAGE_ICONS, STATUS, presenceOf, toPresenceText } from './look.data';
	import type { LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import type { PageType } from './records.data';

	let {
		look,
		events,
		isFull = false,
		tab = $bindable('all'),
		isGrouped = $bindable(true),
		unread = undefined,
		ontap = undefined
	}: {
		look: LookState;
		events: ActivityEventType[];
		// The Log's: the three sorts, Group and the filters. The bell has none.
		isFull?: boolean;
		tab?: ActivityTabType;
		isGrouped?: boolean;
		// The ids of the rows not seen yet: light blue, with a dot.
		unread?: ReadonlySet<string>;
		// Told of every tap on a row, before it opens what the row is about.
		ontap?: (event: ActivityEventType) => void;
	} = $props();

	type KindType = ActivityEventType['kind'];

	// Each action's mark: its icon, the colour of the badge on a face, of the icon on a group's line and of the light
	// circle under it, and what it is read out as.
	const MARKS: Record<
		KindType,
		{ icon: string; badge: string; ink: string; tint: string; label: string }
	> = {
		signIn: {
			icon: 'icon-[mdi--login-variant]',
			badge: 'bg-emerald-500 text-white',
			ink: 'text-emerald-500',
			tint: 'bg-emerald-500/15',
			label: 'Signed in'
		},
		signOut: {
			icon: 'icon-[mdi--logout-variant]',
			badge: 'bg-slate-400 text-white',
			ink: 'text-slate-400',
			tint: 'bg-slate-400/15',
			label: 'Signed out'
		},
		code: {
			icon: 'icon-[mdi--email-alert-outline]',
			badge: 'bg-rose-500 text-white',
			ink: 'text-rose-500',
			tint: 'bg-rose-500/15',
			label: 'Sign-in code never used'
		},
		open: {
			icon: 'icon-[mdi--eye-outline]',
			badge: 'bg-sky-500 text-white',
			ink: 'text-sky-500',
			tint: 'bg-sky-500/15',
			label: 'Opened'
		},
		download: {
			icon: 'icon-[mdi--download]',
			badge: 'bg-violet-500 text-white',
			ink: 'text-violet-500',
			tint: 'bg-violet-500/15',
			label: 'Downloaded'
		},
		add: {
			icon: 'icon-[mdi--plus]',
			badge: 'bg-emerald-500 text-white',
			ink: 'text-emerald-500',
			tint: 'bg-emerald-500/15',
			label: 'Added'
		},
		change: {
			icon: 'icon-[mdi--pencil]',
			badge: 'bg-amber-500 text-white',
			ink: 'text-amber-500',
			tint: 'bg-amber-500/15',
			label: 'Changed'
		},
		trash: {
			icon: 'icon-[mdi--trash-can-outline]',
			badge: 'bg-rose-500 text-white',
			ink: 'text-rose-500',
			tint: 'bg-rose-500/15',
			label: 'Deleted'
		}
	};

	// How long ago, in the Online list's colours: green within 5 minutes, orange within the hour, grey after.
	const AGO_TONES: Record<AgoToneType, string> = {
		fresh: 'text-emerald-700',
		recent: 'text-amber-700',
		old: 'text-slate-500'
	};
	const PRESENCE_TONES = {
		online: 'text-emerald-700',
		idle: 'text-amber-700',
		offline: 'text-slate-500'
	};

	const TABS: ActivityTabType[] = ['all', 'projects', 'users'];
	const TAB_LABELS: Record<ActivityTabType, string> = {
		all: 'All',
		projects: 'Projects',
		users: 'Users'
	};

	// The record page a row opens, by the row's table.
	const PAGE_OF_TABLE: Partial<Record<ChangeEventType['table'], PageType>> = {
		customer: 'customers',
		team: 'team',
		transport: 'transport',
		facility: 'facilities'
	};

	// The filters: a person, a project ('' for anyone, any project) and a time.
	let person = $state('');
	let project = $state('');
	let time = $state<ActivityTimeType>('any');
	// The groups shut by a tap on their heading; every group opens open.
	const shut = new SvelteSet<string>();

	// The time every "3 hours ago" is read at, kept to the minute while the list is open.
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(timer);
	});

	const me = $derived(look.me?.name ?? '');
	const shown = $derived(
		events.filter(
			(event) =>
				(!person || event.who === person) &&
				(!project || (projectOfEvent(event)?.id ?? '') === project) &&
				isInTime(event.at, time, now)
		)
	);
	const view = $derived(isFull ? tab : 'all');
	const runs = $derived(toRuns(shown));
	const projects = $derived(toProjectGroups(shown));
	const people = $derived(toPeopleGroups(shown));

	// The filters' choices, from every row, not only those shown.
	const personOptions = $derived<MenuOptionType[]>([
		{ id: '', label: 'Anyone' },
		...toPeopleGroups(events).map((group) => ({
			id: group.who,
			label: group.who === me ? `${group.who} (you)` : group.who
		}))
	]);
	const projectOptions = $derived<MenuOptionType[]>([
		{ id: '', label: 'Any project' },
		...toProjectGroups(events)
			.filter((group) => group.id)
			.map((group) => ({ id: group.id, label: group.title || 'A project no longer there' }))
	]);
	const timeOptions = ACTIVITY_TIMES.map((each) => ({ id: each.id, label: each.label }));

	function isUnread(event: ActivityEventType) {
		return Boolean(unread?.has(event.id));
	}

	function unreadIn(list: ActivityEventType[]) {
		return unread ? list.filter(isUnread).length : 0;
	}

	function toggle(id: string) {
		if (shut.has(id)) shut.delete(id);
		else shut.add(id);
	}

	// "a customer", "an attachment".
	function articleOf(thing: string) {
		return /^[aeiou]/i.test(thing) ? 'an' : 'a';
	}

	function whoOf(name: string) {
		return name === me ? 'You' : name;
	}

	function memberOf(name: string) {
		return look.members.find((member) => member.name === name);
	}

	// How long someone has been online or away, coloured like the Online list.
	function presenceWords(name: string) {
		const member = memberOf(name);
		return member
			? { words: toPresenceText(member, now), tone: PRESENCE_TONES[presenceOf(name, now)] }
			: undefined;
	}

	function agoOf(at: string) {
		const ago = toAgo(at, now);
		return { words: ago.words, tone: AGO_TONES[ago.tone] };
	}

	// A project's picture: its folder in the colours of its state, as the dashboard's lists show it.
	function projectTint(id: string) {
		const status = look.projects.find((each) => each.id === id)?.status;
		return status && STATUS[status] ? STATUS[status].pill : 'bg-slate-100 text-slate-500';
	}

	// "Marco and Priya", "Leo, Sofia and 1 more".
	function firstNames(names: string[]) {
		const short = names.map((name) => whoOf(name).split(' ')[0]);
		if (short.length > 2) return `${short.slice(0, 2).join(', ')} and ${short.length - 2} more`;
		return short.join(' and ');
	}

	function updates(count: number) {
		return `${count} ${count === 1 ? 'update' : 'updates'}`;
	}

	// "made 3 changes", "signed in and opened a project": a run's heading.
	function runWords(run: ActivityRunType) {
		const summary = toRunSummary(run);
		const changes = summary.added + summary.changed + summary.trashed;
		const said: string[] = [];
		const count = (value: number, word: string, one: string) =>
			value === 1 ? one : `${value} ${word}s`;
		if (summary.codes) said.push('asked for a sign-in code and never used it');
		if (summary.signIns)
			said.push(summary.signIns === 1 ? 'signed in' : `signed in ${summary.signIns} times`);
		if (summary.opened) said.push(`opened ${count(summary.opened, 'project', 'a project')}`);
		if (changes) said.push(`made ${count(changes, 'change', '1 change')}`);
		if (summary.downloads) said.push(`downloaded ${count(summary.downloads, 'PDF', 'a PDF')}`);
		if (summary.signOuts)
			said.push(summary.signOuts === 1 ? 'signed out' : `signed out ${summary.signOuts} times`);
		return said.length < 2 ? said.join('') : `${said.slice(0, -1).join(', ')} and ${said.at(-1)}`;
	}

	// A run's second line: the projects it touched.
	function runWhere(run: ActivityRunType) {
		const titles = toRunSummary(run).projects.map((each) => each.title);
		if (titles.length > 2) return `${titles.slice(0, 2).join(', ')} and ${titles.length - 2} more`;
		return titles.join(' and ');
	}

	// A row's second line after the time: where (the project), then what (the fields changed, what a new project
	// started with, the device, the address a code went to).
	function whereOf(event: ActivityEventType, hasProject = true) {
		const parts: string[] = [];
		const where = projectOfEvent(event);
		if (hasProject && where?.title && !(event.kind === 'open' || event.kind === 'download'))
			parts.push(where.title);
		if (event.kind === 'signIn' || event.kind === 'signOut') {
			if (event.isGuest) parts.push('Waiting for access');
			if (event.device) parts.push(event.device);
		} else if (event.kind === 'code') {
			if (event.email !== event.who) parts.push(`To ${event.email}`);
		} else if (event.kind === 'add' || event.kind === 'change' || event.kind === 'trash') {
			if (event.parts?.length) parts.push(`With ${event.parts.join(', ')}`);
			else if (event.columns.length) parts.push(event.columns.join(', '));
		}
		return parts.join(' · ');
	}

	// What a tap on a row opens: the project (at its panel for a panel), the record, the person's Team page; nothing
	// when it is gone (in the Trash) or has no page of its own.
	function openerOf(event: ActivityEventType) {
		const where = projectOfEvent(event);
		const toProject =
			where && look.projects.some((each) => each.id === where.id)
				? () => look.open(where.id)
				: undefined;
		if (event.kind === 'signIn' || event.kind === 'signOut' || event.kind === 'code')
			return look.has('team', event.who) ? () => look.openRecord('team', event.who) : undefined;
		if (event.kind === 'open' || event.kind === 'download') return toProject;
		if (event.table === 'panel' && event.kind !== 'trash' && toProject)
			return () => {
				look.open(where?.id ?? '', 'edit');
				look.panelId = event.rowId;
			};
		const page = PAGE_OF_TABLE[event.table];
		if (page && event.name && look.has(page, event.name)) {
			const name = event.name;
			return () => look.openRecord(page, name);
		}
		return toProject;
	}

	function tap(event: ActivityEventType) {
		ontap?.(event);
		openerOf(event)?.();
	}
</script>

<!-- ---------- Words ---------- -->

{#snippet bold(text: string)}<b class="font-semibold text-slate-900">{text}</b>{/snippet}

<!-- Who did what: "Marco Ellison changed Cargo". Without `hasWho` (the face or a group's heading says who) it starts
     with the doing: "Changed Cargo"; without `hasProject` (a project's group says where) it leaves the project out. -->
{#snippet said(event: ActivityEventType, hasWho = true, hasProject = true)}
	{@const where = projectOfEvent(event)}
	<span class={hasWho ? '' : 'inline-block first-letter:uppercase'}
		>{#if hasWho}{@render bold(whoOf(event.who))}{' '}{/if}{#if event.kind === 'signIn'}signed in{#if event.isGuest},
				waiting for access{/if}{:else if event.kind === 'signOut'}signed out{:else if event.kind === 'code'}asked
			for a sign-in code and never used it{:else if event.kind === 'open'}opened {#if hasProject && where?.title}{@render bold(
					where.title
				)}{:else}the project{/if}{:else if event.kind === 'download'}downloaded the PDF{#if hasProject && where?.title}{' '}of
				{@render bold(
					where.title
				)}{/if}{:else if event.kind === 'add'}{#if event.table === 'project'}started a project{:else if event.name}added
				{event.thing}
				{@render bold(event.name)}{:else}added {articleOf(event.thing)}
				{event.thing}{/if}{:else if event.kind === 'trash'}deleted {#if event.name}{@render bold(
					event.name
				)}{:else}the {event.thing}{/if}{:else if event.table === 'project'}changed the project{:else if event.name}changed
			{@render bold(event.name)}{:else}changed the {event.thing}{/if}</span
	>
{/snippet}

<!-- A row's second line: how long ago (or how long online), coloured, then the counts on a phone, then where. -->
{#snippet second(
	when: { words: string; tone: string } | undefined,
	note: string,
	counts?: ActivityEventType[]
)}
	<span class="block truncate text-xs leading-5 text-slate-400"
		>{#if when}<span class="font-medium {when.tone}">{when.words}</span>{/if}{#if counts}<span
				class="@md:hidden"
				>{' · '}<span class="inline-flex align-top">{@render tally(counts)}</span></span
			>{/if}{#if when && note}{' · '}{/if}{note}</span
	>
{/snippet}

<!-- ---------- Pictures ---------- -->

<!-- A face with the action as its badge. -->
{#snippet face(event: ActivityEventType, size: number, hasPresence = false)}
	<Avatar
		{...faceOf(event.who, { hasPresence })}
		{size}
		badgeIcon={MARKS[event.kind].icon}
		badgeTint={MARKS[event.kind].badge}
		badgeLabel={MARKS[event.kind].label}
		badgeScale={0.45}
	/>
{/snippet}

<!-- A project: its folder in the colours of its state; the rest, outside every project, three dots. -->
{#snippet projectMark(id: string, title: string, kind: KindType | undefined = undefined)}
	<Avatar
		fallback={id ? PAGE_ICONS.projects : 'icon-[mdi--dots-horizontal]'}
		tint={id ? projectTint(id) : undefined}
		size={40}
		alt={title || 'Not in a project'}
		badgeIcon={kind ? MARKS[kind].icon : undefined}
		badgeTint={kind ? MARKS[kind].badge : undefined}
		badgeLabel={kind ? MARKS[kind].label : undefined}
		badgeScale={0.45}
	/>
{/snippet}

<!-- The device someone last used, by the Online list's icons, beside their name. -->
{#snippet devices(name: string)}
	{@const member = memberOf(name)}
	{#if member?.deviceName}
		{@const icons = toDeviceIcons(member.device, member.deviceName)}
		<span
			class="ml-1.5 inline-flex shrink-0 items-center gap-1 align-[-2px] text-slate-500"
			role="img"
			aria-label={member.deviceName}
		>
			{#if icons.kind}<span class="{icons.kind} size-3.5 text-slate-400"></span>{/if}
			{#if icons.system}<span class="{icons.system} size-3"></span>{/if}
			{#if icons.browser}<span class="{icons.browser} size-3"></span>{/if}
		</span>
	{/if}
{/snippet}

<!-- A group's counts: each action's icon in its colour and how many, like the file counts (#350). -->
{#snippet tally(list: ActivityEventType[])}
	<span class="flex shrink-0 items-center gap-2.5 text-xs font-medium text-slate-600 tabular-nums">
		{#each toTally(list) as each (each.kind)}
			<span
				class="flex items-center gap-1"
				title="{each.count} {MARKS[each.kind].label.toLowerCase()}"
				><span class="{MARKS[each.kind].icon} size-[15px] {MARKS[each.kind].ink}"
				></span>{each.count}</span
			>
		{/each}
	</span>
{/snippet}

<!-- ---------- Rows ---------- -->

<!-- The end of a row: a group's counts (where the list is wide), how many are new, its chevron, a new row's dot. -->
{#snippet rowEnd(
	counts: ActivityEventType[] | undefined,
	fresh: number,
	isOpen: boolean | undefined,
	isNew: boolean
)}
	{#if counts}<span class="hidden shrink-0 @md:flex">{@render tally(counts)}</span>{/if}
	{#if fresh}<span
			class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white tabular-nums"
			aria-label="{fresh} new">{fresh}</span
		>{/if}
	{#if isOpen !== undefined}<span
			class="icon-[mdi--chevron-down] size-5 shrink-0 text-slate-400 transition {isOpen
				? 'rotate-180'
				: ''}"
			aria-hidden="true"
		></span>{/if}
	{#if isNew}<span
			class="size-2 shrink-0 rounded-full bg-primary"
			aria-label="New"
		></span>{/if}
{/snippet}

<!-- One row: a picture, two lines, and its end. A button when a tap does something. -->
{#snippet row(
	picture: import('svelte').Snippet,
	first: import('svelte').Snippet,
	when: { words: string; tone: string } | undefined,
	note: string,
	{
		counts = undefined,
		fresh = 0,
		isOpen = undefined,
		isNew = false,
		onclick = undefined
	}: {
		counts?: ActivityEventType[];
		fresh?: number;
		isOpen?: boolean;
		isNew?: boolean;
		onclick?: () => void;
	} = {}
)}
	<ListRow
		tag={onclick ? 'button' : 'div'}
		type={onclick ? 'button' : undefined}
		{onclick}
		aria-expanded={isOpen}
		class="gap-3 rounded-2xl px-2 py-2 transition {isNew
			? 'bg-primary/[0.06]'
			: onclick
				? 'hover:bg-slate-900/[0.03]'
				: ''}"
		start={picture}
	>
		{#snippet label()}<span class="block truncate text-sm leading-5 text-slate-600"
				>{@render first()}</span
			>{@render second(when, note, counts)}{/snippet}
		{#snippet end()}{@render rowEnd(counts, fresh, isOpen, isNew)}{/snippet}
	</ListRow>
{/snippet}

<!-- One line: the doer's face with the action as its badge, who did what, how long ago and where. -->
{#snippet line(event: ActivityEventType)}
	{#snippet picture()}{@render face(event, 40)}{/snippet}
	{#snippet first()}{@render said(event)}{/snippet}
	<li class="py-[3px]">
		{@render row(picture, first, agoOf(event.at), whereOf(event), {
			isNew: isUnread(event),
			onclick: () => tap(event)
		})}
	</li>
{/snippet}

<!-- A group's lines, under its big picture: each one's small icon on the grey line that drops from it. With `hasFace`
     (a project's lines, by different people) each is the small face of who did it with the action as its badge;
     without (one person's lines) the action's icon on a light circle of its own colour. -->
{#snippet children(list: ActivityEventType[], hasFace: boolean, hasProject: boolean)}
	<div class="relative -mt-2 mb-1 pt-2">
		<span
			class="absolute top-0 bottom-6 left-[27px] w-0.5 rounded-full bg-slate-300"
			aria-hidden="true"
		></span>
		<ul>
			{#each list as event (event.id)}
				{@const mark = MARKS[event.kind]}
				{@const ago = agoOf(event.at)}
				{@const note = whereOf(event, hasProject)}
				<li class="py-[3px]">
					<button
						type="button"
						class="relative flex w-full min-w-0 items-center text-left"
						onclick={() => tap(event)}
					>
						<span class="relative ml-2 flex w-10 shrink-0 justify-center">
							{#if hasFace}
								<span class="relative rounded-full ring-[3px] ring-white"
									>{@render face(event, 26)}</span
								>
							{:else}
								<span
									class="flex size-7 items-center justify-center rounded-full bg-white ring-2 ring-white"
									role="img"
									aria-label={mark.label}
									><span class="flex size-7 items-center justify-center rounded-full {mark.tint}"
										><span class="{mark.icon} size-4 {mark.ink}"></span></span
									></span
								>
							{/if}
						</span>
						<span
							class="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 transition {isUnread(
								event
							)
								? 'bg-primary/[0.06]'
								: 'hover:bg-slate-900/[0.03]'}"
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[13px] leading-5 text-slate-600"
									>{@render said(event, hasFace, hasProject)}</span
								>
								<span class="block truncate text-xs leading-5 text-slate-400"
									><span class="font-medium {ago.tone}">{ago.words}</span
									>{#if note}{' · '}{note}{/if}</span
								>
							</span>
							{#if isUnread(event)}<span
									class="size-2 shrink-0 rounded-full bg-primary"
									aria-label="New"
								></span>{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

<!-- A soft heading: Today, Yesterday, Last 7 days, Earlier. -->
{#snippet heading(label: string)}
	<li
		class="sticky top-0 z-10 bg-white/95 px-2 pt-3 pb-1 text-xs font-semibold text-slate-400 backdrop-blur-sm"
	>
		{label}
	</li>
{/snippet}

<!-- A filter: the library Menu hanging from a small Button, blue while something is picked. -->
{#snippet filter(
	label: string,
	value: string,
	options: MenuOptionType[],
	onpick: (id: string) => void,
	isSet: boolean,
	align: 'left' | 'right' = 'left'
)}
	<Menu
		{label}
		{value}
		{options}
		{onpick}
		{align}
		isSearchable={options.length > 8}
		button={{
			...(isSet ? { primary: true, lite: true } : { neutral: true, lite: true }),
			xs: true,
			label: options.find((each) => each.id === value)?.label ?? label,
			iconEnd: 'icon-[mdi--chevron-down]',
			class: 'max-w-[11rem] truncate'
		}}
	/>
{/snippet}

<!-- ---------- The list ---------- -->

<div class="@container flex min-w-0 flex-col">
	{#if isFull}
		<div class="space-y-2.5 pb-2">
			<div class="flex items-center gap-2">
				<div class="min-w-0 flex-1">
					<Tabs
						class="flex w-full rounded-full bg-slate-900/[0.05] p-1"
						label="Sort by"
						options={TABS}
						bind:value={tab}
					>
						{#snippet option({ value: item, isOn, props })}
							<button
								{...props}
								type="button"
								class="flex h-8 flex-1 items-center justify-center rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition {isOn
									? 'bg-white text-slate-900 shadow-sm'
									: 'text-slate-500'}">{TAB_LABELS[item]}</button
							>
						{/snippet}
					</Tabs>
				</div>
				<Button
					{...isGrouped ? { primary: true, lite: true } : { secondary: true, ghost: true }}
					sm
					icon="icon-[mdi--format-list-group]"
					label="Group"
					aria-pressed={isGrouped}
					title={isGrouped ? 'Grouped: tap to list one by one' : 'One by one: tap to group'}
					onclick={() => (isGrouped = !isGrouped)}
				/>
			</div>
			<div class="flex flex-wrap items-center gap-1.5">
				{@render filter('Anyone', person, personOptions, (id) => (person = id), Boolean(person))}
				{@render filter(
					'Any project',
					project,
					projectOptions,
					(id) => (project = id),
					Boolean(project)
				)}
				{@render filter(
					'Any time',
					time,
					timeOptions,
					(id) => (time = id as ActivityTimeType),
					time !== 'any',
					'right'
				)}
			</div>
		</div>
	{/if}

	<div>
		{#if !shown.length}
			<p class="px-3 py-10 text-center text-sm text-slate-500">
				{events.length ? 'Nothing here matches. Try another filter.' : 'Nothing has happened yet.'}
			</p>
		{:else if view === 'all' && !(isFull && isGrouped)}
			<ul>
				{#each byBucket(shown, (event) => event.at, now) as bucket (bucket.label)}
					{@render heading(bucket.label)}
					{#each bucket.items as event (event.id)}{@render line(event)}{/each}
				{/each}
			</ul>
		{:else if view === 'all'}
			<!-- All, grouped: one person's back-to-back work as one group under their face. -->
			<ul>
				{#each byBucket(runs, (run) => run.to, now) as bucket (bucket.label)}
					{@render heading(bucket.label)}
					{#each bucket.items as run (run.id)}
						{#if run.events.length === 1}
							{@render line(run.events[0])}
						{:else}
							{@const isOpen = !shut.has(run.id)}
							{@const isSpread = toRunSummary(run).projects.length > 1}
							{#snippet picture()}<Avatar
									{...faceOf(run.who, { hasPresence: false })}
									size={40}
								/>{/snippet}
							{#snippet first()}{@render bold(whoOf(run.who))} {runWords(run)}{/snippet}
							<li class="py-[3px]">
								{@render row(picture, first, agoOf(run.to), runWhere(run), {
									counts: run.events,
									fresh: unreadIn(run.events),
									isOpen,
									onclick: () => toggle(run.id)
								})}
								{#if isOpen}{@render children(run.events, false, isSpread)}{/if}
							</li>
						{/if}
					{/each}
				{/each}
			</ul>
		{:else if view === 'projects'}
			<!-- Projects: each project's newest line; grouped, every line under the project's picture. -->
			<ul>
				{#each projects as group (group.id)}
					{@const isOpen = isGrouped && !shut.has(`project-${group.id}`)}
					{@const newest = group.events[0]}
					{@const by = group.people.length ? ` by ${firstNames(group.people)}` : ''}
					{#snippet picture()}{@render projectMark(
							group.id,
							group.title,
							isGrouped ? undefined : newest.kind
						)}{/snippet}
					{#snippet first()}{@render bold(
							group.id ? group.title || 'A project no longer there' : 'Not in a project'
						)}{/snippet}
					<li class="py-[3px]">
						{@render row(picture, first, agoOf(group.at), `${updates(group.events.length)}${by}`, {
							counts: isGrouped ? group.events : undefined,
							fresh: isGrouped ? unreadIn(group.events) : 0,
							isOpen: isGrouped ? isOpen : undefined,
							isNew: !isGrouped && isUnread(newest),
							onclick: () => (isGrouped ? toggle(`project-${group.id}`) : tap(newest))
						})}
						{#if isOpen}{@render children(group.events, true, false)}{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<!-- Users: one row each, their face with its online dot; grouped, their lines under it. -->
			<ul>
				{#each people as group (group.userId ?? group.who)}
					{@const key = `user-${group.userId ?? group.who}`}
					{@const isOpen = isGrouped && !shut.has(key)}
					{@const newest = group.events[0]}
					{@const when = presenceWords(group.who) ?? agoOf(group.at)}
					{#snippet picture()}{#if isGrouped}<Avatar
								{...faceOf(group.who)}
								size={40}
							/>{:else}{@render face(newest, 40, true)}{/if}{/snippet}
					{#snippet first()}{#if isGrouped}{@render bold(
								group.who === me ? `${group.who} (you)` : group.who
							)}{@render devices(group.who)}{:else}{@render said(newest)}{/if}{/snippet}
					<li class="py-[3px]">
						{@render row(
							picture,
							first,
							when,
							isGrouped ? updates(group.events.length) : whereOf(newest),
							{
								counts: isGrouped ? group.events : undefined,
								fresh: isGrouped ? unreadIn(group.events) : 0,
								isOpen: isGrouped ? isOpen : undefined,
								isNew: !isGrouped && isUnread(newest),
								onclick: () => (isGrouped ? toggle(key) : tap(newest))
							}
						)}
						{#if isOpen}{@render children(group.events, false, true)}{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
