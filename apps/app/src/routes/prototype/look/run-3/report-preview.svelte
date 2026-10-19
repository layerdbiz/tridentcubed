<script lang="ts">
	// PROTOTYPE (#161): the live preview, built from the panels as they stand (cover, contents with page numbers,
	// the report pages in panel order), laid on a free canvas you can drag in any direction (viewport.svelte.ts).
	// Run 3: bigger centred cover, an icon on every cover line, a letterhead with both logos and a QR code, a time log
	// with clock bullets, and the vertical zoom bar. Not the real renderer: page breaks are rough and Download is a stub.
	import { onMount, untrack } from 'svelte';
	import ClientLogo from './client-logo.svelte';
	import { clientOf, personOf, type PanelType } from './look.data';
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
		tone = 'dark',
		surface = 'bg-slate-100',
		left = 0
	}: {
		look: LookState;
		highlight?: string;
		letterhead?: 'split' | 'center' | 'footer';
		days?: 'parens' | 'newline' | 'timeline';
		start?: 'column' | 'spread';
		tone?: 'dark' | 'light' | 'glass';
		surface?: string;
		left?: number;
	} = $props();

	type PageType = {
		key: string;
		title: string;
		kind: string;
		panel?: PanelType;
		group?: number;
		part?: number;
	};

	const W = 595;
	const H = 842;
	const viewport = new Viewport();
	$effect.pre(() => {
		viewport.left = left;
	});
	// svelte-ignore state_referenced_locally
	let layout = $state<'column' | 'spread'>(start);

	function fieldOf(panelId: string, label: string) {
		return look.panels
			.find((panel) => panel.id === panelId)
			?.fields.find((field) => field.label === label)?.value;
	}

	const team = $derived(look.panels.find((panel) => panel.id === 'team'));
	const timelog = $derived(look.panels.find((panel) => panel.id === 'timelog'));
	const company = $derived(fieldOf('client', 'Company') || look.project.client);
	const client = $derived(clientOf(company));
	const documentNumber = $derived(`${look.project.number}-R01`);

	const pages = $derived.by(() => {
		const list: PageType[] = [
			{ key: 'cover', title: 'Cover', kind: 'cover' },
			{ key: 'contents', title: 'Table of Contents', kind: 'contents' },
			{ key: 'report', title: 'Project Report', kind: 'report' },
			{ key: 'personnel', title: 'Personnel in Attendance', kind: 'personnel' }
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
		list.push({ key: 'disclaimer', title: 'Disclaimer', kind: 'disclaimer' });
		return list;
	});

	const contents = $derived(
		pages.filter((item, index) => pages.findIndex((other) => other.key === item.key) === index)
	);

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
		organization: 'report',
		client: 'report',
		project: 'cover',
		items: 'report',
		facility: 'report',
		carrier: 'report',
		team: 'personnel',
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
	let isPlaced = false;
	const isReady = $derived(viewport.width > 0);
	$effect(() => {
		const rect = rects[targetIndex];
		if (!isReady || !rect) return;
		untrack(() => {
			if (isPlaced) return viewport.focus(rect);
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

	const COVER = $derived([
		{ icon: 'icon-[mdi--anchor]', label: 'Facility', value: fieldOf('facility', 'Name') },
		{ icon: 'icon-[mdi--calendar-blank-outline]', label: 'Dates', value: look.project.dates },
		{ icon: 'icon-[mdi--domain]', label: 'Client', value: fieldOf('client', 'Company') },
		{ icon: 'icon-[mdi--account-tie-outline]', label: 'Owner', value: team?.owner },
		{ icon: 'icon-[mdi--shape-outline]', label: 'Project type', value: fieldOf('project', 'Type') }
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
				{fieldOf('organization', 'Address line 1')}, {fieldOf('organization', 'Address line 2')}
			</p>
			<p>
				{fieldOf('organization', 'City')}, {fieldOf('organization', 'State')}
				{fieldOf('organization', 'Zip')}
			</p>
			<p>{fieldOf('organization', 'Phone')} · {fieldOf('organization', 'Email')}</p>
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
			<p>{fieldOf('client', 'Contact') || client.contact}</p>
			<p>{fieldOf('client', 'Phone') || client.phone}</p>
			<p>{fieldOf('client', 'Email') || client.email}</p>
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
		class="absolute inset-0 cursor-grab touch-none select-none {viewport.isMoving
			? 'cursor-grabbing'
			: ''}"
		bind:clientWidth={viewport.width}
		bind:clientHeight={viewport.height}
		{@attach viewport.gestures}
	>
		<div
			class="absolute top-0 left-0 origin-top-left {viewport.isAnimating
				? 'transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
				: ''} {viewport.isMoving ? 'will-change-transform' : ''}"
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
									{fieldOf('project', 'Title') || 'Untitled project'}
								</p>
								<p class="mt-3 text-lg text-slate-500">{fieldOf('project', 'Subtitle')}</p>
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
							<div
								class="mt-4 h-px bg-linear-to-r from-primary/50 via-slate-200 to-transparent"
							></div>
						</header>
						<div class="px-10 pt-6">
							<h2 class="text-[24px] font-bold tracking-tight text-slate-950">{item.title}</h2>
							{#if item.kind === 'contents'}
								<ol class="mt-6 text-[12px]">
									{#each contents as entry (entry.key)}
										<li class="flex justify-between border-b border-dashed border-slate-200 py-2">
											<span>{entry.title}</span><span class="text-slate-400"
												>{pages.findIndex((other) => other.key === entry.key) + 1}</span
											>
										</li>
									{/each}
								</ol>
							{:else if item.kind === 'report'}
								<div class="mt-6 grid gap-2 text-[11px]">
									{#each [['Organization', 'Trident Cubed'], ['Project', fieldOf('project', 'Title')], ['Client', fieldOf('client', 'Company')], ['Facility', fieldOf('facility', 'Name')], ['Carrier', [fieldOf('carrier', 'Type'), fieldOf('carrier', 'Name')]
												.filter(Boolean)
												.join(' · ')], ['Items', fieldOf('items', 'Title')]] as [label, value] (label)}
										<div class="rounded-lg bg-slate-50 px-3 py-2">
											<p
												class="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
											>
												{label}
											</p>
											<p class="mt-0.5 {value ? 'text-slate-900' : 'text-slate-300 italic'}">
												{value || 'Not filled in yet'}
											</p>
										</div>
									{/each}
									{#if fieldOf('items', 'Description')}
										<p class="mt-2 leading-relaxed text-slate-600">
											{fieldOf('items', 'Description')}
										</p>
									{/if}
								</div>
							{:else if item.kind === 'personnel'}
								<div class="mt-6 grid grid-cols-2 gap-3">
									{#each [team?.owner, ...(team?.assigned ?? [])].filter(Boolean) as name, personIndex (name)}
										{@const person = personOf(name!)}
										<div class="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
											<img
												src={person.photo}
												alt=""
												class="size-10 rounded-full object-cover {personIndex === 0
													? 'ring-2 ring-primary ring-offset-2'
													: ''}"
											/>
											<div>
												<p
													class="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
												>
													{personIndex === 0 ? 'Project owner' : 'Assigned team member'}
												</p>
												<p class="text-[14px] font-semibold text-slate-900">{person.name}</p>
											</div>
										</div>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No one assigned yet</p>
									{/each}
								</div>
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
										<figure>
											<img
												src={photo.src}
												alt=""
												draggable="false"
												class="w-full rounded object-cover {group.layout === 2
													? 'aspect-[16/9]'
													: 'aspect-[4/3]'}"
											/>
											<figcaption class="mt-1 truncate text-[8px] text-slate-500">
												{photo.caption}
											</figcaption>
										</figure>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No photos yet</p>
									{/each}
								</div>
							{:else if item.kind === 'disclaimer'}
								<p class="mt-6 text-[11px] leading-relaxed text-slate-500">
									This report is issued without prejudice and reflects the conditions observed by
									the surveyor at the time and place of attendance. Sample text for the prototype.
								</p>
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
								<span>{fieldOf('project', 'Title')}</span>
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
			{tone}
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
