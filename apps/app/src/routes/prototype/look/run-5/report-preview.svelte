<script lang="ts">
	// PROTOTYPE (#161): the live preview, built from the panels as they stand (cover, contents with page numbers,
	// the report pages in panel order), laid on a free canvas you can drag in any direction (viewport.svelte.ts).
	// The project report on one page (introduction, title, location, the facts, personnel, transport and cargo); the
	// sample reports' disclaimer with the owner's signature, always last; each photo's own description over it. Client and team come from the Project panel, the trip from the Transport panel: its stops print as a chain
	// and each stop gets its own page with the particulars a tracking service fills in later (the sample reports'
	// Ships Particulars). Run 8 (Justin's notes 15 to 23): the contents list every page, Cover first, unnumbered, with
	// only the Project Report's parts under it; no section numbers; Start, Stop and End each in their colour; the
	// header is Trident (logo, name, phone, email) and a QR code in camera corners; the footer is the client in
	// Trident's style; the signature follows the HTML email signatures. Not the real
	// renderer: page breaks are rough and Download is a stub. Run 9 (Justin's notes 1 to 9 and 20): black header icons;
	// the QR in thicker square corners with the Trident logo in its middle and no SCAN; the contents numbered like an
	// ordered list (the page titles stay unnumbered) with black numbers and wider dots; "Disclaimer"; the footer is the
	// client's logo at its own width, the client's name and the document ID under it; six and eight photos sit in two
	// columns; the spread layout opens at the top left.
	import { onMount, untrack } from 'svelte';
	import ClientLogo from './client-logo.svelte';
	import {
		clientOf,
		CLOSING,
		documentIdOf,
		MODE_ICONS,
		ORGANIZATION,
		PARTICULARS,
		personOf,
		POINTS,
		type PanelType,
		type StopType
	} from './look.data';
	import { labelsOf, TEAM } from './team.data';
	import type { LookState } from './look.state.svelte';
	import Qr from './qr.svelte';
	import { Viewport, type RectType } from './viewport.svelte';
	import ZoomBar from './zoom-bar.svelte';

	let {
		look,
		highlight = '',
		days = 'parens',
		start = 'column',
		surface = 'bg-slate-100',
		left = 0,
		top = 0
	}: {
		look: LookState;
		highlight?: string;
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
	type EntryType = { title: string; key: string; subs: string[] };

	const W = 595;
	const H = 842;
	const viewport = new Viewport();
	$effect.pre(() => {
		viewport.left = left;
		viewport.top = top;
	});
	// svelte-ignore state_referenced_locally
	let layout = $state<'column' | 'spread'>(start);

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
	const trip = $derived(look.panels.find((panel) => panel.kind === 'transport'));
	const stops = $derived(
		(trip?.stops ?? []).filter((stop) => stop.name || stop.mode || stop.facility)
	);
	const transport = $derived(listOf([...new Set(stops.map((stop) => stop.name).filter(Boolean))]));
	const facility = $derived(
		listOf([...new Set(stops.map((stop) => stop.facility).filter(Boolean))])
	);
	// The Items panel's filled rows, and the same as words: "2 power transformers and 27 accessory crates".
	const cargo = $derived(
		(look.panels.find((panel) => panel.kind === 'items')?.items ?? []).filter((item) =>
			item.description.trim()
		)
	);
	const cargoLine = $derived(
		listOf(
			cargo.map((item) => [item.quantity, item.description.toLowerCase()].filter(Boolean).join(' '))
		)
	);

	// "A", "A and B", "A, B and C".
	function listOf(names: string[]) {
		return names.length < 2
			? (names[0] ?? '')
			: `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
	}

	function iconOf(stop: StopType) {
		return (
			MODE_ICONS[stop.mode] ??
			(stop.point ? POINTS[stop.point].icon : 'icon-[mdi--help-circle-outline]')
		);
	}

	const client = $derived(clientOf(company));
	const documentNumber = $derived(documentIdOf(look.project, look.projects, company));

	const pages = $derived.by(() => {
		const list: PageType[] = [
			{ key: 'cover', title: 'Cover', kind: 'cover' },
			{ key: 'contents', title: 'Table of Contents', kind: 'contents' },
			{ key: 'report', title: 'Project Report', kind: 'report' }
		];
		for (const panel of look.panels) {
			if (!panel.isEnabled) continue;
			if (panel.kind === 'transport')
				panel.stops.forEach((_, stopIndex) =>
					list.push({
						key: 'transport',
						title: panel.name,
						kind: 'transport',
						panel,
						group: stopIndex
					})
				);
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
		list.push({ key: 'disclaimer', title: 'Disclaimer', kind: 'disclaimer' });
		return list;
	});

	// The table of contents: every section, Cover and Table of Contents included, each at the page it starts on and
	// numbered like an ordered list (1, 2, 3, 3.1); only the Project Report lists its parts (Justin's run 8 notes 16
	// and 17, run 9 note 4).
	const REPORT_PARTS = ['Personnel in Attendance', 'Transport', 'Cargo Description'];
	const contents = $derived(
		pages
			.filter((item, index) => pages.findIndex((other) => other.key === item.key) === index)
			.map((item): EntryType => ({
				title: item.title,
				key: item.key,
				subs: item.kind === 'report' ? REPORT_PARTS : []
			}))
	);
	function pageOf(key: string) {
		return pages.findIndex((other) => other.key === key) + 1;
	}

	// How tall each photo prints for each photos-per-page choice: one or two fill the width; four, six and eight sit in
	// two columns of two, three and four rows (run 9 note 13).
	const PHOTO_SIZES: Record<number, string> = {
		1: 'aspect-[4/3]',
		2: 'aspect-[16/9]',
		4: 'aspect-[4/3]',
		6: 'h-[172px]',
		8: 'h-[128px]'
	};

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

	const KEY_OF: Record<string, string> = {
		project: 'report',
		transport: 'transport',
		items: 'report',
		timelog: 'timelog'
	};
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
		{ icon: 'icon-[mdi--anchor]', label: 'Facility', value: facility },
		{
			icon: stops[0] ? iconOf(stops[0]) : 'icon-[mdi--ferry]',
			label: 'Transport',
			value: transport
		},
		{ icon: 'icon-[mdi--calendar-blank-outline]', label: 'Dates', value: look.project.dates },
		{ icon: 'icon-[mdi--domain]', label: 'Client', value: detail('Client') },
		{ icon: 'icon-[mdi--account-tie-outline]', label: 'Owner', value: team?.owner },
		{ icon: 'icon-[mdi--package-variant-closed]', label: 'Type', value: detail('Project type') }
	]);
</script>

<!-- Trident in the header and the client in the footer, the same way: logo, name, lines under it. -->
{#snippet trident()}
	<div class="flex items-center gap-2.5">
		<img
			src="/logo-color.svg"
			alt=""
			class="size-10 shrink-0"
		/>
		<div class="text-[7.5px] leading-[1.5] text-slate-500">
			<p class="text-[11px] font-bold tracking-wide text-slate-900">TRIDENT CUBED</p>
			<p class="flex items-center gap-1">
				<span class="icon-[mdi--phone] size-2.5 text-slate-950"></span>{ORGANIZATION.phone}
			</p>
			<p class="flex items-center gap-1">
				<span class="icon-[mdi--email] size-2.5 text-slate-950"></span>{ORGANIZATION.email}
			</p>
		</div>
	</div>
{/snippet}

<!-- The client's logo at its own width, no box around it (run 9 note 6), and the document ID under the name. -->
{#snippet customer()}
	<div class="flex min-w-0 items-center gap-2.5">
		{#if client.logo}
			<img
				src={client.logo}
				alt=""
				draggable="false"
				class="h-[30px] w-auto max-w-[96px] shrink-0 object-contain"
			/>
		{:else}
			<ClientLogo
				name={company}
				size={30}
				isBare
			/>
		{/if}
		<div class="min-w-0 text-[7.5px] leading-[1.5] text-slate-500">
			<p class="truncate text-[10px] font-bold text-slate-900">{company}</p>
			<p class="flex items-center gap-1 tabular-nums">
				<span class="icon-[mdi--card-account-details-outline] size-2.5 text-slate-950"
				></span>{documentNumber}
			</p>
		</div>
	</div>
{/snippet}

<!-- The QR code in a camera's focus corners, square and bold, with the Trident logo in a small circle at its middle
     (run 9 notes 2 and 3). A real code keeps scanning with a mark that small: QR codes carry spare data for it. -->
{#snippet code()}
	<div class="relative p-[6px]">
		{#each ['top-0 left-0 border-t-[3px] border-l-[3px]', 'top-0 right-0 border-t-[3px] border-r-[3px]', 'bottom-0 left-0 border-b-[3px] border-l-[3px]', 'right-0 bottom-0 border-r-[3px] border-b-[3px]'] as corner (corner)}
			<span class="absolute size-3 border-slate-950 {corner}"></span>
		{/each}
		<Qr
			value={documentNumber}
			size={38}
		/>
		<span
			class="absolute top-1/2 left-1/2 flex size-[11px] -translate-1/2 items-center justify-center rounded-full bg-white"
		>
			<img
				src="/logo-color.svg"
				alt=""
				class="size-[8px]"
			/>
		</span>
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
									class="mx-auto mt-12 grid w-fit max-w-[400px] grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-2 text-left text-[12px]"
								>
									{#each COVER as line (line.label)}
										<span class="{line.icon} mt-px size-4 text-primary"></span>
										<dt class="font-semibold text-slate-900">{line.label}</dt>
										<dd
											class="line-clamp-2 pl-2 leading-snug {line.value
												? 'text-slate-600'
												: 'text-slate-300 italic'}"
										>
											{line.value || 'Not filled in yet'}
										</dd>
									{/each}
								</dl>
							</div>
						</div>
					{:else}
						<header class="px-10 pt-6">
							<div class="flex items-center justify-between gap-4">
								{@render trident()}
								{@render code()}
							</div>
							<div class="mt-3 h-px bg-slate-950"></div>
						</header>
						<div class="px-10 pt-6">
							<h2 class="text-[24px] font-bold tracking-tight text-slate-950">{item.title}</h2>
							{#if item.kind === 'contents'}
								{#snippet line(number: string, title: string, page: number, isSub: boolean)}
									<li
										class="flex items-baseline gap-2 {isSub
											? 'py-[3px] pl-5 text-[11px] text-slate-600'
											: 'pt-2.5 pb-[3px] text-[12.5px] font-semibold text-slate-900'}"
									>
										<span
											class="shrink-0 font-semibold text-slate-950 tabular-nums {isSub
												? 'w-6'
												: 'w-5'}">{number}</span
										>
										<span>{title}</span>
										<span
											class="h-[3px] min-w-4 flex-1 bg-[radial-gradient(circle,var(--color-slate-400)_0.8px,transparent_1.1px)] bg-size-[7px_3px] bg-bottom bg-repeat-x"
										></span>
										<span class="w-5 text-right text-slate-950 tabular-nums">{page}</span>
									</li>
								{/snippet}
								<ol class="mt-4">
									{#each contents as entry, entryIndex (entry.key)}
										{@render line(`${entryIndex + 1}`, entry.title, pageOf(entry.key), false)}
										{#each entry.subs as sub, subIndex (sub)}
											{@render line(
												`${entryIndex + 1}.${subIndex + 1}`,
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
									was present at {facility || 'the facility'} – {location} on {look.project.dates} for
									the purpose of conducting a {(detail('Project type') || 'cargo').toLowerCase()} survey{cargoLine
										? ` of ${cargoLine}`
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
									{#each [['Client', detail('Client')], ['Type', detail('Project type')]] as [label, value] (label)}
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
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">Personnel in Attendance</h3>
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
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">Transport</h3>
								<div class="mt-2 flex flex-wrap items-center gap-1.5">
									{#each stops as stop, stopIndex (stop.id)}
										{#if stopIndex}<span class="icon-[mdi--arrow-right] size-3.5 text-slate-300"
											></span>{/if}
										<div class="flex items-center gap-2 rounded-xl bg-slate-50 py-1.5 pr-3 pl-2">
											<span
												class="flex size-7 items-center justify-center rounded-lg {stop.point
													? POINTS[stop.point].chip
													: 'bg-slate-100 text-slate-400'}"
												><span class="{iconOf(stop)} size-[18px]"></span></span
											>
											<div>
												<p
													class="text-[11px] font-semibold {stop.name
														? 'text-slate-900'
														: 'text-slate-300 italic'}"
												>
													{stop.name || 'Not filled in yet'}
												</p>
												<p
													class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
												>
													{#if stop.point}<span class={POINTS[stop.point].text}>{stop.point}</span
														>{#if stop.mode}
															·
														{/if}{/if}{stop.mode}
												</p>
												{#if stop.facility}
													<p class="text-[8px] text-slate-500">{stop.facility}</p>
												{/if}
											</div>
										</div>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No transport yet</p>
									{/each}
								</div>
								<h3 class="mt-5 text-[13px] font-bold text-slate-950">Cargo Description</h3>
								{#if cargo.length}
									<table class="mt-2 w-full text-left text-[11px]">
										<thead>
											<tr
												class="text-[7.5px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
											>
												<th class="w-14 pb-1 font-semibold">Qty</th>
												<th class="pb-1 font-semibold">Description</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-100">
											{#each cargo as item (item.id)}
												<tr>
													<td class="py-1.5 font-bold text-slate-900 tabular-nums"
														>{item.quantity || '–'}</td
													>
													<td class="py-1.5 text-slate-700">{item.description}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else}
									<p class="mt-1.5 text-[11px] text-slate-300 italic">Not filled in yet</p>
								{/if}
							{:else if item.kind === 'transport' && item.panel}
								{@const stopIndex = item.group ?? 0}
								{@const stop = item.panel.stops[stopIndex]}
								{@const place = look.facilities.find((other) => other.name === stop.facility)}
								<h3 class="mt-2 flex items-center gap-2 text-[13px] font-bold text-slate-950">
									{#if stop.point}
										<span
											class="rounded-full px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase {POINTS[
												stop.point
											].solid}">{stop.point}</span
										>
									{/if}
									{stop.facility || `Stop ${stopIndex + 1}`}
								</h3>
								<div class="mt-3 flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-4">
									<span
										class="flex size-14 shrink-0 items-center justify-center rounded-2xl {stop.point
											? POINTS[stop.point].chip
											: 'bg-slate-100 text-slate-400'}"
										><span class="{iconOf(stop)} size-8"></span></span
									>
									<div class="min-w-0 flex-1">
										<p
											class="text-[18px] leading-tight font-bold {stop.name
												? 'text-slate-950'
												: 'text-slate-300 italic'}"
										>
											{stop.name || 'Not filled in yet'}
										</p>
										<p
											class="mt-1 text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
										>
											{[stop.type, stop.mode].filter(Boolean).join(' · ') || 'Transport'}
										</p>
									</div>
								</div>
								<div class="mt-2 grid grid-cols-2 gap-2 text-[11px]">
									{#each [['Point', stop.point ? `${stop.point}, ${POINTS[stop.point].hint}` : ''], ['Facility', stop.facility], ['Facility kind', place?.kind ?? ''], ['City', place?.city ?? ''], ['Transport type', stop.type], ['Transport mode', stop.mode]] as [label, value] (label)}
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
									{stop.mode || 'Transport'} particulars
								</h3>
								{#if PARTICULARS[stop.mode]}
									<dl class="mt-2 divide-y divide-slate-100 text-[11px]">
										{#each PARTICULARS[stop.mode] as label (label)}
											<div class="flex justify-between gap-4 py-1.5">
												<dt class="font-medium text-slate-600">{label}</dt>
												<dd class="text-slate-300 italic">Not filled in yet</dd>
											</div>
										{/each}
									</dl>
									<p class="mt-2 text-[9px] text-slate-400">
										A tracking service fills these in later, from the {stop.mode.toLowerCase()}'s
										name.
									</p>
								{:else}
									<p class="mt-1.5 text-[11px] text-slate-300 italic">
										Pick the transport mode to list its particulars
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
								<div class="mt-4 grid gap-3 {group.layout <= 2 ? 'grid-cols-1' : 'grid-cols-2'}">
									{#each shown as photo (photo.id)}
										<figure class="relative overflow-hidden rounded">
											<img
												src={photo.src}
												alt=""
												draggable="false"
												class="w-full object-cover {PHOTO_SIZES[group.layout]}"
											/>
											{#if photo.description}
												<figcaption
													class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/40 to-transparent px-2 pt-5 pb-1.5 font-medium text-white {group.layout <=
													2
														? 'text-[10px]'
														: 'truncate text-[8px]'}"
												>
													{photo.description}
												</figcaption>
											{/if}
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
								<!-- Like the HTML email signatures (packages/ui email): Best Regards with room above and below,
								     a round photo, the name, the title in blue capitals, then phone, email and the group email. -->
								{#if closing}
									<p class="mt-6 text-[10.5px] text-slate-700 italic">{closing}</p>
								{/if}
								<p class="mt-6 text-[11px] text-slate-950">Best Regards,</p>
								{#if signer}
									<div class="mt-6 flex items-start gap-3">
										<img
											src={personOf(signer.name).photo}
											alt=""
											draggable="false"
											class="size-[76px] shrink-0 rounded-full object-cover"
										/>
										<div class="min-w-0 pt-1.5 text-[9px] leading-[1.5] text-slate-500">
											<p class="text-[17px] leading-tight font-semibold text-slate-950">
												{signer.name}
											</p>
											<p
												class="text-[7.5px] font-semibold tracking-[0.02em] text-primary-700 uppercase"
											>
												{labelsOf(signer).join(' · ')}
											</p>
											<div class="mt-1.5 space-y-0.5">
												{#each [['icon-[mdi--phone]', signer.phone], ['icon-[mdi--email]', signer.email], ['icon-[mdi--web]', 'ProjectGroup@TridentCubed.com']] as [icon, text] (icon)}
													<p class="flex items-center gap-1.5">
														<span class="{icon} size-3 text-slate-950"></span>{text}
													</p>
												{/each}
											</div>
										</div>
									</div>
								{/if}
							{/if}
						</div>
						<footer
							class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-white px-10 pt-3 pb-6 text-[9px] text-slate-400"
						>
							{@render customer()}
							<span class="shrink-0">Page {index + 1} of {pages.length}</span>
						</footer>
					{/if}
				</article>
			{/each}
		</div>
	</div>

	<div
		class="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
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
		class="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur transition-opacity duration-500 md:bottom-4 {isHintShown
			? 'opacity-100'
			: 'opacity-0 md:opacity-100'}"
	>
		<span class="icon-[mdi--cursor-move] size-4 text-primary"></span>
		{#if isHintShown}Drag anywhere · pinch or ⌘ + scroll to zoom{:else}{pages.length} pages · {documentNumber}{/if}
	</p>
</div>
