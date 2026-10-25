<script lang="ts">
	// PROTOTYPE (#161): the live preview, built from the panels as they stand (cover, contents with page numbers,
	// the report pages in panel order), laid on a free canvas you can drag in any direction (viewport.svelte.ts).
	// Run 5 (Justin's notes 27 to 33): the page centres fully; a solid black rule under the letterhead; a numbered
	// table of contents with subsections, built from the panels; the project report on one page (introduction, title,
	// location with its marker, the facts, personnel and cargo); the sample reports' Standard Disclaimer with the
	// owner's signature block, always last; photo captions over the photo. Client, team, transport and facility come
	// from the Project panel; the transports also print as a chain under the personnel (2026-10-25), ready for a
	// tracking service to fill in later. Not the real renderer: page breaks are rough and Download is a stub.
	import { onMount, untrack } from 'svelte';
	import ClientLogo from './client-logo.svelte';
	import {
		clientOf,
		CLOSING,
		MODE_ICONS,
		ORGANIZATION,
		personOf,
		type LegType,
		type PanelType
	} from './look.data';
	import { labelsOf, TEAM } from './team.data';
	import type { LookState } from './look.state.svelte';
	import Qr from './qr.svelte';
	import { Viewport, type RectType } from './viewport.svelte';
	import ZoomBar from './zoom-bar.svelte';

	let {
		look,
		highlight = '',
		letterhead = 'split',
		days = 'parens',
		start = 'column',
		surface = 'bg-slate-100',
		left = 0,
		top = 0
	}: {
		look: LookState;
		highlight?: string;
		letterhead?: 'split' | 'center' | 'footer';
		days?: 'parens' | 'newline' | 'timeline';
		start?: 'column' | 'spread';
		surface?: string;
		left?: number;
		top?: number;
	} = $props();

	type PageType = {
		key: string;
		title: string;
		kind: string;
		panel?: PanelType;
		group?: number;
		part?: number;
	};
	type EntryType = { number: string; title: string; key: string; subs: string[] };

	const W = 595;
	const H = 842;
	const viewport = new Viewport();
	$effect.pre(() => {
		viewport.left = left;
		viewport.top = top;
	});
	// svelte-ignore state_referenced_locally
	let layout = $state<'column' | 'spread'>(start);

	// The organization's details for the letterhead are fixed.
	const LETTERHEAD: Record<string, string> = {
		'Address line 1': '800 Town and Country',
		'Address line 2': 'Ste 500',
		City: 'Houston',
		State: 'TX',
		Zip: '77024',
		Phone: ORGANIZATION.phone,
		Email: ORGANIZATION.email
	};

	function valueOf(panelId: string, label: string) {
		return look.panels
			.find((panel) => panel.id === panelId)
			?.fields.find((field) => field.label === label)?.value;
	}

	// A value of the Project panel.
	function detail(label: string) {
		return valueOf('project', label);
	}

	const team = $derived(look.panels.find((panel) => panel.kind === 'project'));
	const timelog = $derived(look.panels.find((panel) => panel.id === 'timelog'));
	const company = $derived(detail('Client') || look.project.client);
	const location = $derived(detail('Location') || look.project.location);
	const people = $derived(
		[team?.owner, ...(team?.assigned ?? [])].filter((name): name is string => Boolean(name))
	);
	const signer = $derived(TEAM.find((member) => member.name === team?.owner));
	const closing = CLOSING;
	const legs = $derived((team?.legs ?? []).filter((leg) => leg.name || leg.mode));
	const transport = $derived(listOf(legs.map((leg) => leg.name).filter(Boolean)));

	// "A", "A and B", "A, B and C".
	function listOf(names: string[]) {
		return names.length < 2
			? (names[0] ?? '')
			: `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
	}

	function iconOf(leg: LegType) {
		return MODE_ICONS[leg.mode] ?? 'icon-[mdi--help-circle-outline]';
	}
	const client = $derived(clientOf(company));
	const documentNumber = $derived(`${look.project.number}-R01`);

	const pages = $derived.by(() => {
		const list: PageType[] = [
			{ key: 'cover', title: 'Cover', kind: 'cover' },
			{ key: 'contents', title: 'Table of Contents', kind: 'contents' },
			{ key: 'report', title: 'Project Report', kind: 'report' }
		];
		for (const panel of look.panels) {
			if (!panel.isEnabled) continue;
			if (panel.kind === 'timelog' && panel.days.length)
				list.push({ key: 'timelog', title: 'Time Log', kind: 'timelog', panel });
			if (panel.kind === 'photos')
				panel.groups.forEach((group, groupIndex) => {
					const parts = Math.max(1, Math.ceil(group.photos.length / group.layout));
					for (let part = 0; part < parts; part += 1)
						list.push({
							key: `photos-${panel.id}`,
							title: part ? `${panel.name} (continued)` : panel.name,
							kind: 'photos',
							panel,
							group: groupIndex,
							part
						});
				});
		}
		list.push({ key: 'disclaimer', title: 'Standard Disclaimer', kind: 'disclaimer' });
		return list;
	});

	// The table of contents, numbered like the sample reports, with each section's own subsections.
	const contents = $derived.by(() => {
		const sections = pages.filter(
			(item, index) =>
				item.kind !== 'cover' &&
				item.kind !== 'contents' &&
				pages.findIndex((other) => other.key === item.key) === index
		);
		return sections.map((item, at): EntryType => {
			let subs: string[] = [];
			if (item.kind === 'report')
				subs = ['Personnel in Attendance', 'Transport', 'Cargo Description'];
			if (item.kind === 'timelog')
				subs = (timelog?.days ?? []).map(
					(day, dayIndex) => `Day ${dayIndex + 1}, ${dateOf(day.date)}`
				);
			if (item.kind === 'photos' && item.panel)
				subs = item.panel.groups.map((group) => group.title || 'Untitled group');
			return { number: `${at + 1}`, title: item.title, key: item.key, subs };
		});
	});
	const numberOf = $derived(Object.fromEntries(contents.map((entry) => [entry.key, entry.number])));
	function pageOf(key: string) {
		return pages.findIndex((other) => other.key === key) + 1;
	}

	// Where each page sits on the canvas: one column, or spread out in rows like a design board.
	const COLUMNS = 4;
	const GAP = 48;
	const rects = $derived(
		pages.map((_, index): RectType =>
			layout === 'column'
				? { x: 0, y: index * (H + GAP), width: W, height: H }
				: {
						x: (index % COLUMNS) * (W + GAP),
						y: Math.floor(index / COLUMNS) * (H + GAP),
						width: W,
						height: H
					}
		)
	);
	$effect(() => {
		const columns = layout === 'column' ? 1 : Math.min(COLUMNS, pages.length);
		const rows = Math.ceil(pages.length / columns);
		viewport.content = { width: columns * (W + GAP) - GAP, height: rows * (H + GAP) - GAP };
	});

	const KEY_OF: Record<string, string> = { project: 'report', items: 'report', timelog: 'timelog' };
	const target = $derived(KEY_OF[highlight] ?? `photos-${highlight}`);
	const targetIndex = $derived(
		Math.max(
			0,
			pages.findIndex((item) => item.key === target)
		)
	);

	// Follow the open panel: glide to the page it feeds. The first move is instant and fits the page across.
	// When the header over the canvas changes height (it is measured after the first paint), place it again.
	let isPlaced = false;
	let placedTop = -1;
	const isReady = $derived(viewport.width > 0);
	$effect(() => {
		const rect = rects[targetIndex];
		const inset = top;
		if (!isReady || !rect) return;
		untrack(() => {
			if (isPlaced && inset === placedTop) return viewport.focus(rect);
			placedTop = inset;
			if (layout === 'column') viewport.fitWidth(rect, false);
			else viewport.fitAll(false);
			isPlaced = true;
		});
	});

	function refit() {
		if (layout === 'column') viewport.fitWidth(rects[targetIndex]);
		else viewport.fitAll();
	}

	function toggleLayout() {
		layout = layout === 'column' ? 'spread' : 'column';
		requestAnimationFrame(refit);
	}

	function dateOf(value: string) {
		if (!value) return 'No date';
		const date = new Date(`${value}T00:00`);
		const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const MONTHS = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
	}

	let isHintShown = $state(true);
	onMount(() => {
		const timer = setTimeout(() => (isHintShown = false), 4200);
		return () => clearTimeout(timer);
	});

	const DISCLAIMER = [
		[
			'Scope Limitation',
			'The survey was conducted without dismantling or intrusive testing unless explicitly stated otherwise. Our observations are limited to visible and accessible parts of the cargo.'
		],
		[
			'No Warranty',
			"This report does not constitute a warranty or guarantee of the cargo's condition, quality, or fitness for any particular purpose. It is not a guarantee against latent defects or conditions not apparent at the time of inspection."
		],
		[
			'Use Limitation',
			'This report is provided solely for the use of the party to whom it is addressed. No liability is assumed by the Company or the undersigned for any use or reliance by third parties.'
		],
		[
			'Liability Limitation',
			'The liability of the Company and the undersigned, if any, arising from this report shall be limited to the fee charged for this service. We shall not be liable for any indirect, consequential, or special damages, including but not limited to loss of profit or business interruption.'
		],
		[
			'Accuracy of Information',
			'The accuracy of this report depends on the information provided by the client and others involved. We do not guarantee the accuracy of such third-party information.'
		],
		[
			'Right to Amend',
			'We reserve the right to amend or supplement this report should additional pertinent information become available.'
		],
		[
			'Legal Context',
			'This report is not intended to be used for legal proceedings without the express written consent of the Company.'
		],
		[
			'No Endorsement',
			'This survey does not endorse or approve the cargo for any specific use or handling beyond what is stated in the report.'
		]
	];

	const COVER = $derived([
		{ icon: 'icon-[mdi--anchor]', label: 'Facility', value: detail('Facility') },
		{
			icon: legs[0] ? iconOf(legs[0]) : 'icon-[mdi--ferry]',
			label: 'Transport',
			value: transport
		},
		{ icon: 'icon-[mdi--calendar-blank-outline]', label: 'Dates', value: look.project.dates },
		{ icon: 'icon-[mdi--domain]', label: 'Client', value: detail('Client') },
		{ icon: 'icon-[mdi--account-tie-outline]', label: 'Owner', value: team?.owner },
		{ icon: 'icon-[mdi--shape-outline]', label: 'Project type', value: detail('Project type') }
	]);
</script>

{#snippet trident(isRight = false)}
	<div class="flex items-start gap-2.5 {isRight ? 'flex-row-reverse text-right' : ''}">
		<img
			src="/logo-color.svg"
			alt=""
			class="size-10 shrink-0"
		/>
		<div class="text-[7.5px] leading-[1.45] text-slate-500">
			<p class="text-[11px] font-bold tracking-wide text-slate-900">TRIDENT CUBED</p>
			<p>
				{LETTERHEAD['Address line 1']}, {LETTERHEAD['Address line 2']}
			</p>
			<p>
				{LETTERHEAD.City}, {LETTERHEAD.State}
				{LETTERHEAD.Zip}
			</p>
			<p>{LETTERHEAD.Phone} · {LETTERHEAD.Email}</p>
		</div>
	</div>
{/snippet}

{#snippet customer()}
	<div class="flex flex-row-reverse items-start gap-2.5 text-right">
		<ClientLogo
			name={company}
			size={38}
		/>
		<div class="text-[7.5px] leading-[1.45] text-slate-500">
			<p class="text-[11px] font-bold text-slate-900">{company}</p>
			{#each [client.kind, client.city].filter(Boolean) as line, at (at)}
				<p>{line}</p>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet code(size: number)}
	<div class="flex flex-col items-center gap-0.5">
		<Qr
			value={documentNumber}
			{size}
		/>
		<p class="text-[6.5px] font-semibold tracking-wider text-slate-500">{documentNumber}</p>
	</div>
{/snippet}

{#snippet entryRow(time: string, activity: string, isLast: boolean)}
	<li class="relative flex items-start gap-2.5 py-[5px] text-[11.5px] leading-snug">
		{#if days === 'timeline' && !isLast}
			<span class="absolute top-[19px] bottom-[-5px] left-[6.5px] w-px bg-primary/25"></span>
		{/if}
		<span
			class="relative mt-px icon-[mdi--clock-time-four-outline] size-[14px] shrink-0 text-primary"
		></span>
		<span class="w-11 shrink-0 font-bold text-slate-900 tabular-nums">{time || '--:--'}</span>
		<span class={activity ? 'text-slate-700' : 'text-slate-300 italic'}
			>{activity || 'No activity yet'}</span
		>
	</li>
{/snippet}

<div class="relative h-full overflow-hidden {surface}">
	<div
		class="absolute inset-0 cursor-grab touch-none select-none [-webkit-touch-callout:none] {viewport.isMoving
			? 'cursor-grabbing'
			: ''}"
		bind:clientWidth={viewport.width}
		bind:clientHeight={viewport.height}
		{@attach viewport.gestures}
	>
		<div
			class="absolute top-0 left-0 origin-top-left {viewport.isAnimating
				? 'transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
				: ''} {viewport.isLayered ? 'will-change-transform' : ''}"
			style="transform: {viewport.transform}; width: {viewport.content.width}px; height: {viewport
				.content.height}px"
		>
			{#each pages as item, index (index)}
				{@const rect = rects[index]}
				<article
					class="absolute overflow-hidden bg-white text-slate-800 shadow-[0_1px_3px_rgb(15_23_42/0.08),0_24px_48px_-24px_rgb(15_23_42/0.25)] ring-4 transition-[box-shadow,top,left] duration-300 {item.key ===
					target
						? 'ring-primary/70'
						: 'ring-transparent'}"
					style="left: {rect.x}px; top: {rect.y}px; width: {W}px; height: {H}px"
					data-page={item.key}
				>
					{#if item.kind === 'cover'}
						<div class="flex h-full flex-col items-center text-center">
							<div class="flex flex-1 flex-col items-center justify-center px-12 pb-36">
								<img
									src="/logo-color.svg"
									alt=""
									class="size-48"
								/>
								<p
									class="mt-10 text-[34px] leading-tight font-bold tracking-tight text-slate-950 uppercase"
								>
									{detail('Title') || 'Untitled project'}
								</p>
								<p class="mt-3 text-lg text-slate-500">{detail('Subtitle')}</p>
							</div>
							<div class="absolute inset-x-0 bottom-0 h-60 bg-slate-100">
								<svg
									class="absolute -top-[59px] h-[60px] w-full fill-slate-100"
									viewBox="0 0 1200 120"
									preserveAspectRatio="none"
									><path
										d="M0,92.7V120h1200V24.2c-67.8-23.1-144.3-15.5-214.3,3C906.7,48,823.8,89,743.8,105.8 c-82.3,17.3-168.1,16.3-250.5-0.4c-57.8-11.7-114-31.1-172-41.9C213.6,43.7,102.5,53.8,0,92.7z"
									/></svg
								>
								<dl
									class="mx-auto mt-12 grid w-fit grid-cols-[auto_auto_auto] items-center gap-x-2.5 gap-y-2 text-left text-[12px]"
								>
									{#each COVER as line (line.label)}
										<span class="{line.icon} size-4 text-primary"></span>
										<dt class="font-semibold text-slate-900">{line.label}</dt>
										<dd class={line.value ? 'pl-2 text-slate-600' : 'pl-2 text-slate-300 italic'}>
											{line.value || 'Not filled in yet'}
										</dd>
									{/each}
								</dl>
							</div>
						</div>
					{:else}
						<header class="px-10 pt-7">
							{#if letterhead === 'center'}
								<div class="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
									{@render trident()}
									{@render code(44)}
									{@render customer()}
								</div>
							{:else}
								<div class="flex items-start justify-between gap-4">
									{@render trident()}
									<div class="flex items-start gap-3">
										{@render customer()}
										{#if letterhead === 'split'}{@render code(44)}{/if}
									</div>
								</div>
							{/if}
							<div class="mt-4 h-px bg-slate-950"></div>
						</header>
						<div class="px-10 pt-6">
							<h2 class="text-[24px] font-bold tracking-tight text-slate-950">
								{#if numberOf[item.key]}{numberOf[item.key]}.{/if}
								{item.title}
							</h2>
							{#if item.kind === 'contents'}
								{#snippet line(number: string, title: string, page: number, isSub: boolean)}
									<li
										class="flex items-baseline gap-1.5 py-[3px] {isSub
											? 'pl-7 text-[11px] text-slate-600'
											: 'mt-1.5 text-[12.5px] font-semibold text-slate-900'}"
									>
										{#if number}<span class="w-7 shrink-0 tabular-nums {isSub ? '-ml-1' : ''}"
												>{number}.</span
											>{/if}
										<span>{title}</span>
										<span class="min-w-4 flex-1 border-b border-dotted border-slate-300"></span>
										<span class="text-slate-500 tabular-nums">{page}</span>
									</li>
								{/snippet}
								<ol class="mt-6">
									{@render line('', 'INTRODUCTION', pageOf('report'), false)}
									{#each contents as entry (entry.key)}
										{@render line(entry.number, entry.title, pageOf(entry.key), false)}
										{#each entry.subs as sub, subIndex (subIndex)}
											{@render line(
												`${entry.number}.${subIndex + 1}`,
												sub,
												pageOf(entry.key),
												true
											)}
										{/each}
									{/each}
								</ol>
							{:else if item.kind === 'report'}
								<p class="mt-3 text-[10.5px] leading-relaxed text-slate-600">
									<b class="text-slate-900">Introduction.</b> This is to report that Trident Cubed
									was present at {detail('Facility') || 'the facility'} – {location} on {look
										.project.dates} for the purpose of conducting a {(
										detail('Project type') || 'cargo'
									).toLowerCase()} survey{valueOf('items', 'Title')
										? ` of ${valueOf('items', 'Title')?.toLowerCase()}`
										: ''}{transport ? ` from the ${transport}` : ''}.
								</p>
								<div class="mt-4 rounded-xl bg-slate-50 px-4 py-3">
									<p class="text-[16px] leading-tight font-bold text-slate-950">
										{detail('Title') || 'Untitled project'}
									</p>
									{#if detail('Subtitle')}
										<p class="mt-0.5 text-[11px] text-slate-500">
											{detail('Subtitle')}
										</p>
									{/if}
									<p class="mt-2 flex items-center gap-3 text-[10.5px] text-slate-600">
										<span class="flex items-center gap-0.5"
											><span class="icon-[mdi--map-marker] size-3.5 text-slate-400"
											></span>{location}</span
										>
										<span class="flex items-center gap-1"
											><span class="icon-[mdi--calendar-blank-outline] size-3.5 text-slate-400"
											></span>{look.project.dates}</span
										>
									</p>
								</div>
								<div class="mt-2 grid grid-cols-2 gap-2 text-[11px]">
									{#each [['Client', detail('Client')], ['Facility', detail('Facility')], ['Transport', legs
												.map((leg) => leg.name)
												.filter(Boolean)
												.join(' → ')], ['Project type', detail('Project type')]] as [label, value] (label)}
										<div class="rounded-lg bg-slate-50 px-3 py-1.5">
											<p
												class="text-[7.5px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
											>
												{label}
											</p>
											<p class="mt-0.5 {value ? 'text-slate-900' : 'text-slate-300 italic'}">
												{value || 'Not filled in yet'}
											</p>
										</div>
									{/each}
								</div>
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">
									{numberOf.report}.1 Personnel in Attendance
								</h3>
								<div class="mt-2 grid grid-cols-2 gap-2">
									{#each people.slice(0, 6) as name, personIndex (name)}
										{@const person = personOf(name)}
										<div class="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2">
											<img
												src={person.photo}
												alt=""
												draggable="false"
												class="size-8 rounded-full object-cover {personIndex === 0
													? 'ring-2 ring-primary ring-offset-1'
													: ''}"
											/>
											<div class="min-w-0">
												<p class="truncate text-[11.5px] font-semibold text-slate-900">
													{person.name}
												</p>
												<p
													class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
												>
													{personIndex === 0 ? 'Project owner' : 'Assigned'}
												</p>
											</div>
										</div>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No one assigned yet</p>
									{/each}
								</div>
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">
									{numberOf.report}.2 Transport
								</h3>
								<div class="mt-2 flex flex-wrap items-center gap-1.5">
									{#each legs as leg, legIndex (leg.id)}
										{#if legIndex}<span class="icon-[mdi--arrow-right] size-3.5 text-slate-300"
											></span>{/if}
										<div class="flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pr-3 pl-2">
											<span
												class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
												><span class="{iconOf(leg)} size-[18px]"></span></span
											>
											<div>
												<p
													class="text-[11px] font-semibold {leg.name
														? 'text-slate-900'
														: 'text-slate-300 italic'}"
												>
													{leg.name || 'Not filled in yet'}
												</p>
												<p
													class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
												>
													{[leg.type, leg.mode].filter(Boolean).join(' · ')}
												</p>
											</div>
										</div>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No transport yet</p>
									{/each}
								</div>
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">
									{numberOf.report}.3 Cargo Description
								</h3>
								<p
									class="mt-1.5 text-[11px] {valueOf('items', 'Title')
										? 'font-semibold text-slate-900'
										: 'text-slate-300 italic'}"
								>
									{valueOf('items', 'Title') || 'Not filled in yet'}
								</p>
								{#if valueOf('items', 'Description')}
									<p class="mt-1 text-[11px] leading-relaxed text-slate-600">
										{valueOf('items', 'Description')}
									</p>
								{/if}
							{:else if item.kind === 'timelog'}
								{#each timelog?.days ?? [] as day, dayIndex (day.id)}
									{@const entries = [...day.entries].sort((a, b) =>
										(a.time || '99').localeCompare(b.time || '99')
									)}
									{#if days === 'newline'}
										<p class="mt-6 text-[13px] font-bold text-slate-900">Day {dayIndex + 1}</p>
										<p class="text-[11px] text-slate-500">{dateOf(day.date)}</p>
									{:else}
										<p class="mt-6 text-[13px] font-bold text-slate-900">
											Day {dayIndex + 1}
											<span class="font-normal text-slate-500">({dateOf(day.date)})</span>
										</p>
									{/if}
									<ul class="mt-2">
										{#each entries as entry, entryIndex (entry.id)}
											{@render entryRow(
												entry.time,
												entry.activity,
												entryIndex === entries.length - 1
											)}
										{/each}
									</ul>
								{/each}
							{:else if item.kind === 'photos' && item.panel}
								{@const group = item.panel.groups[item.group ?? 0]}
								{@const shown = group.photos.slice(
									(item.part ?? 0) * group.layout,
									((item.part ?? 0) + 1) * group.layout
								)}
								<p class="mt-2 text-[13px] font-semibold text-slate-700">
									{group.title || 'Untitled group'}
								</p>
								{#if group.description && !item.part}
									<p class="mt-1 text-[11px] text-slate-500">{group.description}</p>
								{/if}
								<div
									class="mt-4 grid gap-3 {group.layout === 2
										? 'grid-cols-1'
										: group.layout === 4
											? 'grid-cols-2'
											: 'grid-cols-3'}"
								>
									{#each shown as photo (photo.id)}
										<figure class="relative overflow-hidden rounded">
											<img
												src={photo.src}
												alt=""
												draggable="false"
												class="w-full object-cover {group.layout === 2
													? 'aspect-[16/9]'
													: 'aspect-[4/3]'}"
											/>
											<figcaption
												class="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/75 via-black/40 to-transparent px-2 pt-5 pb-1.5 text-[8px] font-medium text-white"
											>
												{photo.caption}
											</figcaption>
										</figure>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No photos yet</p>
									{/each}
								</div>
							{:else if item.kind === 'disclaimer'}
								<p class="mt-3 text-[9.5px] leading-[1.5] text-slate-700">
									This Cargo Survey Report is prepared based on the observations, conditions, and
									information available to the undersigned at the time of the inspection. The
									findings and conclusions herein are made to the best of our knowledge and belief,
									but are subject to the following limitations:
								</p>
								<ul
									class="mt-2 list-disc space-y-1 pl-4 text-[9.5px] leading-[1.45] text-slate-700"
								>
									{#each DISCLAIMER as [title, text] (title)}
										<li><b class="text-slate-900">{title}:</b> {text}</li>
									{/each}
								</ul>
								<p class="mt-2 text-[9.5px] leading-[1.5] text-slate-700">
									Please note that this report reflects the situation as observed on a date of
									Inspection and may not reflect subsequent changes or conditions.
								</p>
								<p class="mt-3 text-[10.5px] text-slate-900">Regards,</p>
								{#if signer}
									<div class="mt-3 flex items-center gap-4 border-t border-slate-200 pt-4">
										<img
											src={personOf(signer.name).photo}
											alt=""
											draggable="false"
											class="size-20 shrink-0 rounded-2xl object-cover"
										/>
										<div class="min-w-0 text-[9.5px] leading-[1.55] text-slate-600">
											<p class="text-[15px] leading-tight font-bold text-slate-950">
												{signer.name}
											</p>
											<p class="mb-1 text-slate-500">{labelsOf(signer).join(' · ')}</p>
											<p class="flex items-center gap-1.5">
												<span class="icon-[mdi--cellphone] size-3 text-primary"></span>Mobile
												{signer.phone}
											</p>
											<p class="flex items-center gap-1.5">
												<span class="icon-[mdi--email-outline] size-3 text-primary"></span>Email
												{signer.email}
											</p>
											<p class="flex items-center gap-1.5">
												<span class="icon-[mdi--email-outline] size-3 text-primary"></span>Email
												ProjectGroup@TridentCubed.com
											</p>
										</div>
										<img
											src="/logo-color.svg"
											alt=""
											draggable="false"
											class="ml-auto size-14 shrink-0 opacity-90"
										/>
									</div>
								{/if}
								{#if closing}
									<p class="mt-3 text-[10.5px] text-slate-700 italic">{closing}</p>
								{/if}
							{/if}
						</div>
						<footer
							class="absolute inset-x-10 bottom-6 flex items-end justify-between text-[9px] text-slate-400"
						>
							{#if letterhead === 'footer'}
								<span class="flex items-center gap-2">
									<Qr
										value={documentNumber}
										size={34}
									/>
									<span class="leading-tight"
										><b class="block text-slate-600">{documentNumber}</b>Scan to open this report</span
									>
								</span>
							{:else}
								<span>{detail('Title')}</span>
							{/if}
							<span>Page {index + 1} of {pages.length}</span>
						</footer>
					{/if}
				</article>
			{/each}
		</div>
	</div>

	<div
		class="absolute right-3 bottom-4 z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
	>
		<ZoomBar
			{viewport}
			{layout}
			onfit={refit}
			onlayout={toggleLayout}
			ondownload={() => look.say('Download makes the PDF in V1. Not wired up in this prototype.')}
		/>
	</div>

	<p
		style="left: {left + 16}px"
		class="pointer-events-none absolute bottom-4 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur transition-opacity duration-500 {isHintShown
			? 'opacity-100'
			: 'opacity-0 md:opacity-100'}"
	>
		<span class="icon-[mdi--cursor-move] size-4 text-primary"></span>
		{#if isHintShown}Drag anywhere · pinch or ⌘ + scroll to zoom{:else}{pages.length} pages · {documentNumber}{/if}
	</p>
</div>
