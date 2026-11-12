<script lang="ts">
	// PROTOTYPE (#161): the live preview, built from the panels as they stand (cover, contents with page numbers,
	// the report pages in panel order), laid on a free canvas you can drag in any direction (viewport.svelte.ts).
	// The project report on one page (introduction, title, location, the facts, personnel, transport and cargo); the
	// sample reports' disclaimer with the owner's signature, always last; each photo's own description over it.
	// Customer and team come from the Project panel, the trip from the Transport panel: its stops print as a chain
	// and each stop gets its own page with the particulars a tracking service fills in later (the sample reports'
	// Ships Particulars). Run 8 (Justin's notes 15 to 23): the contents list every page, Cover first, unnumbered, with
	// only the Project Report's parts under it; no section numbers; Start, Stop and End each in their colour; the
	// header is Trident (logo, name, phone, email) and a QR code in camera corners; the footer is the client in
	// Trident's style; the signature follows the HTML email signatures. Not the real
	// renderer: page breaks are rough and Download is a stub. Run 9 (Justin's notes 1 to 9 and 20): black header icons;
	// the QR in thicker square corners with the Trident logo in its middle and no SCAN; the contents numbered like an
	// ordered list (the page titles stay unnumbered) with black numbers and wider dots; "Disclaimer"; the footer is the
	// client's logo at its own width, the client's name and the document ID under it; six and eight photos sit in two
	// columns; the spread layout opens at the top left. Run 11 (2026-10-26 19:22): Customer for Client; a light grey
	// line under the header; the QR is the code alone; the footer's customer logo is the size of the header's Trident
	// logo, a customer with none gets its initial on a colour circle; a barcode marks the document ID; the contents
	// number 1. 2. 3. with parts 3.1 under the title's first letter; the spread layout opens at the top centre.
	// Run 15 (Justin, 2026-11-10: "no fake data anywhere"): nothing printed is written in this file any more. The
	// header, the introduction's first words, the disclaimer and the sign-off come from the organization (Settings);
	// the footer's logo and code and the contact under Customer from the customer's page; faces, titles and the
	// owner's sign-off from the team's pages; a stop's address and particulars from the facility's and transport's
	// pages; the dates from the Time Log's days.
	// Run 19 (Justin, 2026-11-10): the cover lists the project in the Project panel's own order, with real logos
	// and faces; the Project Report page is tighter, its personnel are cards like the Team page's (the lead is
	// first with a blue ring, and nobody is labelled owner), with anyone not on the team under them; and every stop
	// of the Transport Mode panel prints on one page.
	// Run 32 (Justin, 2026-11-12). A section that grows too long runs on over more pages, each added to the contents
	// (report-flow.ts): it is a list of blocks, drawn once out of sight to be measured, then dealt onto pages. The
	// Time Log always prints this way. Project Report B, Transport Mode B and Disclaimer B do too: the report with
	// no "Introduction", the organization's people in one row with its badge and their labels, and the trip as
	// facility, transport, facility; a transport's page with its photo, particulars and facilities; the signature
	// at the foot of the last page. Their A versions print as they did, on one page each.
	import { onMount, untrack } from 'svelte';
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import { legsOf, type LegType } from './legs';
	import {
		dayOf,
		documentIdOf,
		FACILITY_ICONS,
		MODE_ICONS,
		PAGE_ICONS,
		PARTICULARS,
		personOf,
		POINTS,
		type PanelType,
		type StopType
	} from './look.data';
	import { customerOf, photosOf, recordOf } from './records.data';
	import { heightOf, paginate } from './report-flow';
	import { labelsOf } from './team.data';
	import type { LookState } from './look.state.svelte';
	import Qr from './qr.svelte';
	import CoverA from './variants/cover-a.svelte';
	import CoverB from './variants/cover-b.svelte';
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
		// A page of a section that flows: the blocks that landed on it, and whether the signature sits at its foot.
		blocks?: BlockType[];
		hasSignature?: boolean;
	};
	// One piece of a flowing section, never cut in two.
	type BlockType =
		| { kind: 'intro' | 'strip' | 'team' | 'attachments' }
		| { kind: 'heading' | 'text' | 'closing' | 'empty'; text: string }
		| { kind: 'company' | 'point'; id: string }
		| { kind: 'leg'; id: string; isFull: boolean }
		| { kind: 'cargo'; from: number; to: number }
		| { kind: 'day'; id: string; index: number; isContinued?: boolean }
		| {
				kind: 'entry';
				id: string;
				day: string;
				dayIndex: number;
				time: string;
				activity: string;
				isLast: boolean;
		  };
	type FlowType = {
		key: string;
		title: string;
		kind: string;
		panel?: PanelType;
		blocks: BlockType[];
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
	const company = $derived(detail('Customer') || look.project.client);
	const location = $derived(look.project.location);
	// The other companies on the job, each with its people who have a name.
	const personnel = $derived(
		(team?.personnel ?? [])
			.map((company) => ({
				...company,
				people: company.people.filter((person) => person.name.trim())
			}))
			.filter((company) => company.people.length)
	);
	const attachments = $derived(
		look.panels.find((panel) => panel.kind === 'items' && panel.isEnabled)?.attachments ?? []
	);
	const people = $derived(
		[team?.owner, ...(team?.assigned ?? [])].filter((name): name is string => Boolean(name))
	);
	const signer = $derived(look.members.find((member) => member.name === team?.owner));
	const organization = $derived(look.organization);
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

	const client = $derived(customerOf(look, company));
	// Who the report is for: the contact picked in the Project panel, else the customer's first.
	const contact = $derived(
		(client.contacts ?? []).find((item) => item.id === team?.contact) ??
			(client.contacts ?? []).find((item) => item.name)
	);
	// The days the team was there: the Time Log's dated days, first to last; before any, the day the project began.
	const dates = $derived.by(() => {
		const days = (timelog?.days ?? [])
			.map((day) => day.date)
			.filter(Boolean)
			.toSorted();
		if (!days.length) return dayOf(look.project.created);
		return days.length > 1 && days[0] !== days.at(-1)
			? `${dateOf(days[0])} to ${dateOf(days.at(-1)!)}`
			: dateOf(days[0]);
	});

	function titleOf(name: string) {
		return look.members.find((member) => member.name === name)?.title ?? '';
	}
	const documentNumber = $derived(documentIdOf(look.project, look.projects, company));

	// The trip as legs (legs.ts): one transport and the facilities it calls at.
	const legs = $derived(
		legsOf(trip?.stops ?? []).filter((leg) =>
			leg.stops.some((stop) => stop.name || stop.mode || stop.facility)
		)
	);

	// What a page has under its title, between the header and the footer, and how many cargo rows make a block.
	const ROOM = 606;
	const ROWS = 12;
	const isReportB = $derived(look.variant('report') !== 'A');
	const isTransportB = $derived(look.variant('report-transport') !== 'A');
	const isDisclaimerB = $derived(look.variant('disclaimer') !== 'A');

	// The sections that flow, each as its blocks in order.
	const flows = $derived.by(() => {
		const list: FlowType[] = [];
		if (isReportB) {
			const blocks: BlockType[] = [
				{ kind: 'intro' },
				{ kind: 'strip' },
				{ kind: 'heading', text: 'Personnel in Attendance' },
				{ kind: 'team' },
				...personnel.map((item): BlockType => ({ kind: 'company', id: item.id })),
				{ kind: 'heading', text: 'Transport Mode' },
				...(legs.length
					? legs.map((leg): BlockType => ({ kind: 'leg', id: leg.id, isFull: false }))
					: [{ kind: 'empty', text: 'No transport mode yet' } as BlockType]),
				{ kind: 'heading', text: 'Cargo Description' }
			];
			for (let from = 0; from < cargo.length; from += ROWS)
				blocks.push({ kind: 'cargo', from, to: from + ROWS });
			if (attachments.length) blocks.push({ kind: 'attachments' });
			else if (!cargo.length) blocks.push({ kind: 'empty', text: 'Not filled in yet' });
			list.push({ key: 'report', title: 'Project Report', kind: 'report', blocks });
		}
		if (isTransportB && trip?.isEnabled && trip.stops.length)
			list.push({
				key: 'transport',
				title: trip.name,
				kind: 'transport',
				panel: trip,
				blocks: legs.length
					? legs.map((leg): BlockType => ({ kind: 'leg', id: leg.id, isFull: true }))
					: [{ kind: 'empty', text: 'No transport mode yet' }]
			});
		if (timelog?.isEnabled && timelog.days.length) {
			const blocks: BlockType[] = [];
			for (const [index, day] of timelog.days.entries()) {
				blocks.push({ kind: 'day', id: day.id, index });
				const entries = day.entries.toSorted((a, b) =>
					(a.time || '99').localeCompare(b.time || '99')
				);
				for (const [at, entry] of entries.entries())
					blocks.push({
						kind: 'entry',
						id: entry.id,
						day: day.id,
						dayIndex: index,
						time: entry.time,
						activity: entry.activity,
						isLast: at === entries.length - 1
					});
			}
			list.push({ key: 'timelog', title: 'Time Log', kind: 'timelog', panel: timelog, blocks });
		}
		if (isDisclaimerB)
			list.push({
				key: 'disclaimer',
				title: 'Disclaimer',
				kind: 'disclaimer',
				blocks: [
					{ kind: 'text', text: organization.disclaimer.opening },
					...organization.disclaimer.points.map((point): BlockType => ({
						kind: 'point',
						id: point.id
					})),
					...(organization.disclaimer.note
						? [{ kind: 'text', text: organization.disclaimer.note } as BlockType]
						: []),
					...(organization.closing
						? [{ kind: 'closing', text: organization.closing } as BlockType]
						: [])
				]
			});
		return list;
	});

	// Each flowing block's height as it prints, read from the copy drawn out of sight; the signature's too.
	let measurer: HTMLDivElement | undefined = $state();
	let heights = $state<Record<string, number[]>>({});
	let signatureHeight = $state(0);

	function measure() {
		if (!measurer) return;
		const next: Record<string, number[]> = {};
		for (const flow of measurer.querySelectorAll<HTMLElement>('[data-flow]'))
			next[flow.dataset.flow!] = [...flow.children].map(
				(block) => (block as HTMLElement).offsetHeight
			);
		if (JSON.stringify(next) !== JSON.stringify(heights)) heights = next;
		signatureHeight =
			measurer.querySelector<HTMLElement>('[data-signature]')?.offsetHeight ?? signatureHeight;
	}

	// Measured again when what is printed changes, and when a picture or a font arrives and changes a height.
	$effect(() => {
		void flows;
		void signer;
		measure();
	});
	onMount(() => {
		if (!measurer) return;
		const observer = new ResizeObserver(measure);
		observer.observe(measurer);
		return () => observer.disconnect();
	});

	// The blocks on one page. A Time Log page that opens part-way through a day says which day first, the way the
	// day's own heading does (Justin, 2026-11-12).
	function blocksOn(flow: FlowType, page: number[]) {
		const blocks = page.map((at) => flow.blocks[at]);
		const [first] = blocks;
		if (first?.kind === 'entry')
			blocks.unshift({ kind: 'day', id: first.day, index: first.dayIndex, isContinued: true });
		return blocks;
	}

	// A flowing section as pages: its blocks dealt out by height, a heading never left at a page's foot.
	function pagesOf(flow: FlowType) {
		const tall = heights[flow.key] ?? [];
		const dealt = paginate(
			flow.blocks.map((_, index) => tall[index] ?? 0),
			// A Time Log page may open with its day said again, so each keeps room for that line.
			flow.kind === 'timelog' ? ROOM - 52 : ROOM,
			flow.blocks.map((block) => block.kind === 'heading' || block.kind === 'day')
		);
		// The signature stands at the foot of the disclaimer's last page; with no room left there, on one more.
		if (flow.kind === 'disclaimer' && heightOf(tall, dealt.at(-1)!) + signatureHeight + 28 > ROOM)
			dealt.push([]);
		return dealt.map((page, index): PageType => ({
			key: flow.key,
			title: index ? `${flow.title} (continued)` : flow.title,
			kind: flow.kind,
			panel: flow.panel,
			blocks: blocksOn(flow, page),
			hasSignature: flow.kind === 'disclaimer' && index === dealt.length - 1
		}));
	}

	const pages = $derived.by(() => {
		const flowOf = (key: string) => flows.find((flow) => flow.key === key);
		const list: PageType[] = [
			{ key: 'cover', title: 'Cover', kind: 'cover' },
			{ key: 'contents', title: 'Table of Contents', kind: 'contents' }
		];
		const report = flowOf('report');
		if (report) list.push(...pagesOf(report));
		else list.push({ key: 'report', title: 'Project Report', kind: 'report' });
		for (const panel of look.panels) {
			if (!panel.isEnabled) continue;
			const flow =
				panel.kind === 'transport' || panel.kind === 'timelog' ? flowOf(panel.id) : undefined;
			if (flow) list.push(...pagesOf(flow));
			// Transport Mode A: every stop on one page (run 19), not a page each.
			else if (panel.kind === 'transport' && panel.stops.length)
				list.push({ key: 'transport', title: panel.name, kind: 'transport', panel });
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
		const disclaimer = flowOf('disclaimer');
		if (disclaimer) list.push(...pagesOf(disclaimer));
		else list.push({ key: 'disclaimer', title: 'Disclaimer', kind: 'disclaimer' });
		return list;
	});

	// The table of contents: every section, Cover and Table of Contents included, each at the page it starts on and
	// numbered like an ordered list (1. 2. 3. 3.1); only the Project Report lists its parts (Justin's run 8 notes 16
	// and 17, run 9 note 4).
	const REPORT_PARTS = ['Personnel in Attendance', 'Transport Mode', 'Cargo Description'];
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

	// The page a part of the Project Report is on: where its heading landed, once the report runs over a page.
	function partPage(part: string, key: string) {
		const at = pages.findIndex(
			(page) =>
				page.key === key &&
				page.blocks?.some((block) => block.kind === 'heading' && block.text === part)
		);
		return at < 0 ? pageOf(key) : at + 1;
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
		timelog: 'timelog',
		// Settings (run 15): the organization's details show in every header, its wording on the last page.
		organization: 'report',
		wording: 'disclaimer'
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

	// Download (run 33): the pages as they are drawn here, with this page's own styles, go to the server, which
	// prints them to a PDF with the app's export browser (pdf/+server.ts) and hands the file back.
	let canvas: HTMLDivElement | undefined = $state();
	let isDownloading = false;

	// A photo far bigger than it prints is sent at three times its printed size, as a JPEG, so the PDF stays small
	// enough to email. Logos and anything already small go as they are.
	function slimOf(image: HTMLImageElement) {
		const wide = image.offsetWidth * 3;
		if (!image.naturalWidth || image.naturalWidth <= wide * 1.3) return undefined;
		const board = document.createElement('canvas');
		board.width = wide;
		board.height = Math.round((image.naturalHeight * wide) / image.naturalWidth);
		board.getContext('2d')?.drawImage(image, 0, 0, board.width, board.height);
		try {
			// A logo with a see-through ground keeps it (PNG); a photo goes as a JPEG.
			const probe = document.createElement('canvas');
			probe.width = probe.height = 24;
			const pen = probe.getContext('2d');
			pen?.drawImage(image, 0, 0, 24, 24);
			const dots = pen?.getImageData(0, 0, 24, 24).data ?? [];
			let isClear = false;
			for (let at = 3; at < dots.length; at += 4) if (dots[at] < 250) isClear = true;
			return isClear ? board.toDataURL('image/png') : board.toDataURL('image/jpeg', 0.82);
		} catch {
			return undefined;
		}
	}

	async function download() {
		if (isDownloading || !canvas) return;
		isDownloading = true;
		look.say('Making the PDF');
		try {
			const sheets = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
				.map((node) => node.outerHTML)
				.join('\n');
			const sheetsOfPages = [...canvas.querySelectorAll('article[data-page]')]
				.map((node) => {
					const copy = node.cloneNode(true) as HTMLElement;
					const shown = node.querySelectorAll('img');
					for (const [index, image] of copy.querySelectorAll('img').entries()) {
						const slim = slimOf(shown[index]);
						if (slim) image.src = slim;
					}
					copy.style.cssText = `width: ${W}px; height: ${H}px`;
					copy.classList.remove('ring-4', 'ring-primary/70');
					return copy.outerHTML;
				})
				.join('\n');
			const filename = `${documentNumber}.pdf`;
			const response = await fetch('/prototype/look/pdf', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ pages: sheetsOfPages, styles: sheets, filename })
			});
			if (!response.ok) {
				const problem = await response.json().catch(() => undefined);
				throw new Error(problem?.message ?? 'The PDF could not be made');
			}
			const url = URL.createObjectURL(await response.blob());
			const link = Object.assign(document.createElement('a'), { href: url, download: filename });
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 60000);
			look.say('PDF downloaded');
		} catch (error) {
			look.say(error instanceof Error ? error.message : 'The PDF could not be made');
		} finally {
			isDownloading = false;
		}
	}

	let isHintShown = $state(true);
	onMount(() => {
		const timer = setTimeout(() => (isHintShown = false), 4200);
		return () => clearTimeout(timer);
	});

	// Cover A's lines (variants/cover-a.svelte): the six it had before run 19, now in the Project panel's order.
	const coverLines = $derived([
		{
			icon: 'icon-[mdi--package-variant-closed]',
			label: 'Project Type',
			value: detail('Project Type') ?? ''
		},
		{ icon: PAGE_ICONS.customers, label: 'Customer', value: company },
		{ icon: 'icon-[mdi--account-tie-outline]', label: 'Team Lead', value: team?.owner ?? '' },
		{
			icon: stops[0] ? iconOf(stops[0]) : PAGE_ICONS.transport,
			label: 'Transport Mode',
			value: transport
		},
		{ icon: PAGE_ICONS.facilities, label: 'Facility', value: facility },
		{ icon: 'icon-[mdi--calendar-blank-outline]', label: 'Dates', value: dates }
	]);

	// Cover B's lines (variants/cover-b.svelte), in the Project panel's own order, each with its real picture: a
	// logo, a face, or an icon.
	type CoverType = { label: string; value: string; images?: string[]; icon?: string };
	const cover = $derived<CoverType[]>([
		{
			label: 'Project Type',
			value: detail('Project Type') ?? '',
			icon: 'icon-[mdi--package-variant-closed]'
		},
		{
			label: 'Organization',
			value: organization.name,
			images: organization.logo ? [organization.logo] : [],
			icon: 'icon-[mdi--domain]'
		},
		{
			label: 'Customer',
			value: company,
			images: client.icon ? [client.icon] : [],
			icon: PAGE_ICONS.customers
		},
		{
			label: 'Contact',
			value: [contact?.name, contact?.title].filter(Boolean).join(', '),
			images: contact?.photo ? [contact.photo] : [],
			icon: 'icon-[mdi--account-outline]'
		},
		{
			label: 'Team Lead',
			value: team?.owner ?? '',
			images: team?.owner ? [personOf(team.owner).photo] : [],
			icon: 'icon-[mdi--account-tie-outline]'
		},
		{
			label: 'Team Assigned',
			value: listOf(team?.assigned ?? []),
			images: (team?.assigned ?? []).map((name) => personOf(name).photo),
			icon: PAGE_ICONS.team
		},
		{
			label: 'Transport Mode',
			value: transport,
			icon: stops[0] ? iconOf(stops[0]) : PAGE_ICONS.transport
		},
		{ label: 'Facility', value: facility, icon: PAGE_ICONS.facilities },
		{ label: 'Location', value: location, icon: 'icon-[mdi--map-marker]' },
		{ label: 'Dates', value: dates, icon: 'icon-[mdi--calendar-blank-outline]' }
	]);

	function memberOf(name: string) {
		return look.members.find((member) => member.name === name);
	}

	function legOf(id: string) {
		return legs.find((leg) => leg.id === id);
	}

	function carrierOf(leg: LegType) {
		return look.transports.find((item) => item.name === leg.stops[0]?.name);
	}

	// A transport's picture: its own, else its mode's stock picture.
	function pictureOf(leg: LegType) {
		const record = recordOf(look, 'transport', leg.stops[0]?.name ?? '');
		return record ? photosOf(record)[0] : undefined;
	}

	function placeOf(name: string) {
		return look.facilities.find((item) => item.name === name);
	}

	// The organization's people on one row: four across, more when there are more, six at most before a second row.
	const teamColumns = $derived(Math.min(6, Math.max(4, people.length)));
</script>

<!-- Trident in the header and the customer in the footer, the same way: logo, name, lines under it. -->
{#snippet trident()}
	<div class="flex items-center gap-2.5">
		{#if organization.logo}
			<img
				src={organization.logo}
				alt=""
				class="size-10 shrink-0 object-contain"
			/>
		{/if}
		<div class="text-[7.5px] leading-[1.5] text-slate-500">
			<p class="text-[11px] font-bold tracking-wide text-slate-900 uppercase">
				{organization.name}
			</p>
			{#if organization.phone}
				<p class="flex items-center gap-1">
					<span class="icon-[mdi--phone] size-2.5 text-slate-950"></span>{organization.phone}
				</p>
			{/if}
			{#if organization.email}
				<p class="flex items-center gap-1">
					<span class="icon-[mdi--email] size-2.5 text-slate-950"></span>{organization.email}
				</p>
			{/if}
		</div>
	</div>
{/snippet}

<!-- The customer's logo, no box around it (run 9 note 6), as big as Trident's in the header (run 11); a customer with
     no logo gets its initial on a colour circle. The document ID under the name, by a barcode. -->
{#snippet customer()}
	<div class="flex min-w-0 items-center gap-2.5">
		{#if client.logo}
			<img
				src={client.logo}
				alt=""
				draggable="false"
				class="size-10 shrink-0 object-contain"
			/>
		{:else}
			<ClientLogo
				name={company}
				size={40}
				shape={client.icon ? 'rounded' : 'circle'}
				isBare
			/>
		{/if}
		<div class="min-w-0 text-[7.5px] leading-[1.5] text-slate-500">
			<p class="truncate text-[10px] font-bold text-slate-900">{company}</p>
			<p class="flex items-center gap-1 tabular-nums">
				<span class="icon-[mdi--barcode] size-2.5 text-slate-950"></span>{documentNumber}
			</p>
		</div>
	</div>
{/snippet}

<!-- The QR code alone: no corners, no logo (run 11). -->
{#snippet code()}
	<Qr
		value={documentNumber}
		size={44}
	/>
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

<!-- Like the HTML email signatures (packages/ui email): the sign-off, a round photo, the name, the labels in blue
     capitals, then phone, email and the group email. -->
{#snippet signature()}
	<p class="text-[11px] text-slate-950">{organization.signoff}</p>
	{#if signer}
		<div class="mt-6 flex items-start gap-3">
			<img
				src={personOf(signer.name).photo}
				alt=""
				draggable="false"
				class="size-[76px] shrink-0 rounded-full object-cover"
			/>
			<div class="min-w-0 pt-1.5 text-[9px] leading-[1.5] text-slate-500">
				<p class="text-[17px] leading-tight font-semibold text-slate-950">{signer.name}</p>
				<p class="text-[7.5px] font-semibold tracking-[0.02em] text-primary-700 uppercase">
					{labelsOf(signer).join(' · ')}
				</p>
				<div class="mt-1.5 space-y-0.5">
					{#each [['icon-[mdi--phone]', signer.phone], ['icon-[mdi--email]', signer.email], ['icon-[mdi--web]', organization.groupEmail]] as [icon, text] (icon)}
						{#if text}
							<p class="flex items-center gap-1.5">
								<span class="{icon} size-3 text-slate-950"></span>{text}
							</p>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/if}
{/snippet}

<!-- Someone in attendance: the app's own Avatar, the name, and labels. The organization's people wear its badge. -->
{#snippet personCard(name: string, labels: string[], isLead: boolean, badge: string | undefined)}
	<div class="flex min-w-0 flex-col items-center rounded-xl bg-slate-50 px-1.5 py-2 text-center">
		<Avatar
			{name}
			size={36}
			ring={isLead ? 'ring-primary' : 'ring-white'}
			hasPresence={false}
			{badge}
		/>
		<p class="mt-1.5 w-full text-[10px] leading-tight font-semibold text-balance text-slate-900">
			{name}
		</p>
		{#if labels.length}
			<p class="mt-1 flex flex-wrap justify-center gap-0.5">
				{#each labels as label (label)}
					<span class="rounded-full bg-white px-1.5 py-px text-[7px] font-medium text-slate-600"
						>{label}</span
					>
				{/each}
			</p>
		{/if}
	</div>
{/snippet}

{#snippet caption(text: string)}
	<p class="pb-1 text-[7.5px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{text}</p>
{/snippet}

<!-- A transport's mark: its own photo when it has one, else its mode's icon. -->
{#snippet carrierMark(leg: LegType, size: string)}
	{@const photo = carrierOf(leg)?.photo}
	{#if photo}
		<img
			src={photo}
			alt=""
			draggable="false"
			class="{size} shrink-0 rounded-full object-cover"
		/>
	{:else}
		<span
			class="{size} flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
			><span class="{MODE_ICONS[leg.stops[0]?.mode] ?? PAGE_ICONS.transport} size-[60%]"
			></span></span
		>
	{/if}
{/snippet}

<!-- One block of a flowing section. Room above a block is its own padding, so the heights add up. -->
{#snippet flowBlock(block: BlockType)}
	{#if block.kind === 'intro'}
		<p class="pt-2 text-[10.5px] leading-relaxed text-slate-600">
			This is to report that {organization.name} was present at {facility ||
				'the facility'}{location ? ` – ${location}` : ''} on {dates} for the purpose of conducting a {(
				detail('Project Type') || 'cargo'
			).toLowerCase()} survey{cargoLine ? ` of ${cargoLine}` : ''}{transport
				? ` from the ${transport}`
				: ''}.
		</p>
	{:else if block.kind === 'strip'}
		<!-- The project in one strip: what it is, who it is for, where and when. -->
		<div class="pt-3">
			<div class="rounded-xl bg-slate-50 px-3.5 py-2.5">
				<div class="flex items-baseline justify-between gap-3">
					<p class="min-w-0 text-[15px] leading-tight font-bold text-slate-950">
						{detail('Title') || 'Untitled project'}
					</p>
					{#if detail('Project Type')}
						<span
							class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-slate-600"
							>{detail('Project Type')}</span
						>
					{/if}
				</div>
				{#if detail('Subtitle')}
					<p class="text-[10.5px] text-slate-500">{detail('Subtitle')}</p>
				{/if}
				<div
					class="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-t border-slate-200 pt-2 text-[10px]"
				>
					<div class="flex min-w-0 items-center gap-2">
						<ClientLogo
							name={company}
							size={24}
							shape="circle"
							isBare
						/>
						<div class="min-w-0">
							<p class="truncate font-semibold text-slate-900">{company || 'No customer yet'}</p>
							{#if contact?.name}
								<p class="truncate text-[8.5px] text-slate-500">
									Attn. {[contact.name, contact.title].filter(Boolean).join(' · ')}
								</p>
							{/if}
						</div>
					</div>
					<p class="flex min-w-0 items-center gap-1 text-slate-600">
						<span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-slate-400"></span><span
							class="truncate">{location || 'No location yet'}</span
						>
					</p>
					<p class="flex min-w-0 items-center gap-1 text-slate-600">
						<span class="icon-[mdi--calendar-blank-outline] size-3.5 shrink-0 text-slate-400"
						></span><span class="truncate">{dates}</span>
					</p>
				</div>
			</div>
		</div>
	{:else if block.kind === 'heading'}
		<h3 class="pt-4 pb-1.5 text-[12.5px] font-bold text-slate-950">{block.text}</h3>
	{:else if block.kind === 'team'}
		<!-- The organization's own people on one row, the lead first in a blue ring, each wearing its badge. -->
		<div>
			{@render caption(organization.name)}
			<div
				class="grid gap-1.5"
				style="grid-template-columns: repeat({teamColumns}, minmax(0, 1fr))"
			>
				{#each people as name, personIndex (name)}
					{@const member = memberOf(name)}
					{@render personCard(
						name,
						member ? labelsOf(member) : [],
						personIndex === 0,
						organization.logo || undefined
					)}
				{:else}
					<p class="col-span-full text-[11px] text-slate-300 italic">No one assigned yet</p>
				{/each}
			</div>
		</div>
	{:else if block.kind === 'company'}
		{@const other = personnel.find((item) => item.id === block.id)}
		{#if other}
			<!-- Anyone else on the job, by company, in the same cards with no badge. -->
			<div class="pt-2">
				{@render caption(other.company || 'Other personnel')}
				<div
					class="grid gap-1.5"
					style="grid-template-columns: repeat({teamColumns}, minmax(0, 1fr))"
				>
					{#each other.people as person (person.id)}
						{@render personCard(person.name, person.title ? [person.title] : [], false, undefined)}
					{/each}
				</div>
			</div>
		{/if}
	{:else if block.kind === 'leg'}
		{@const leg = legOf(block.id)}
		{#if leg}
			{@const lead = leg.stops[0]}
			{@const calls = leg.stops.filter((stop) => stop.facility)}
			{#if block.isFull}
				{@const picture = pictureOf(leg)}
				{@const carrier = carrierOf(leg)}
				<!-- The Transport Mode page: the transport once, with its picture and particulars, then its facilities. -->
				<div class="pt-3">
					<section class="overflow-hidden rounded-xl bg-slate-50">
						<div class="flex gap-3 p-3">
							{#if picture}
								<img
									src={picture}
									alt=""
									draggable="false"
									class="h-[104px] w-[156px] shrink-0 rounded-lg object-cover"
								/>
							{:else}
								<span
									class="flex h-[104px] w-[156px] shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400"
									><span class="{MODE_ICONS[lead.mode] ?? PAGE_ICONS.transport} size-10"
									></span></span
								>
							{/if}
							<div class="min-w-0 flex-1">
								<p
									class="text-[14px] leading-tight font-bold {lead.name
										? 'text-slate-950'
										: 'text-slate-300 italic'}"
								>
									{lead.name || 'Not filled in yet'}
								</p>
								<p class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
									{lead.mode}
								</p>
								{#if PARTICULARS[lead.mode]}
									<dl class="mt-2 grid grid-cols-3 gap-x-3 gap-y-1">
										{#each PARTICULARS[lead.mode] as label (label)}
											<div class="min-w-0">
												<dt
													class="truncate text-[6.5px] font-semibold tracking-[0.1em] text-slate-400 uppercase"
												>
													{label}
												</dt>
												<dd
													class="truncate text-[9.5px] {carrier?.details?.[label]
														? 'text-slate-900'
														: 'text-slate-300'}"
												>
													{carrier?.details?.[label] || '–'}
												</dd>
											</div>
										{/each}
									</dl>
								{/if}
							</div>
						</div>
						{#if calls.length}
							<div class="grid grid-cols-2 gap-1.5 border-t border-slate-200 p-3">
								{#each calls as stop (stop.id)}
									{@const place = placeOf(stop.facility)}
									<div class="flex min-w-0 gap-2 rounded-lg bg-white p-2">
										<span
											class="flex size-7 shrink-0 items-center justify-center rounded-full {stop.point
												? POINTS[stop.point].chip
												: 'bg-slate-100 text-slate-400'}"
											><span
												class="{place ? FACILITY_ICONS[place.kind] : PAGE_ICONS.facilities} size-4"
											></span></span
										>
										<div class="min-w-0 text-[8.5px] leading-snug text-slate-500">
											<p
												class="text-[7px] font-semibold tracking-[0.12em] uppercase {stop.point
													? POINTS[stop.point].text
													: 'text-slate-400'}"
											>
												{stop.point || 'Point'}
											</p>
											<p class="text-[10.5px] font-semibold text-slate-900">{stop.facility}</p>
											<p>{[place?.kind, place?.city].filter(Boolean).join(' · ')}</p>
											{#if place?.address}<p>{place.address}</p>{/if}
											{#if place?.contact || place?.phone}
												<p>{[place?.contact, place?.phone].filter(Boolean).join(' · ')}</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				</div>
			{:else}
				<!-- On the Project Report: the transport once, then where it goes, facility to facility. -->
				<div class="pb-1.5">
					<div class="rounded-xl bg-slate-50 px-3 py-2">
						<div class="flex items-center gap-2">
							{@render carrierMark(leg, 'size-7')}
							<p
								class="text-[11px] font-semibold {lead.name
									? 'text-slate-900'
									: 'text-slate-300 italic'}"
							>
								{lead.name || 'Not filled in yet'}
							</p>
							<span class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
								>{lead.mode}</span
							>
						</div>
						{#if calls.length}
							<div class="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9.5px]">
								{#each calls as stop, at (stop.id)}
									{#if at}<span class="icon-[mdi--arrow-right] size-3 text-slate-300"></span>{/if}
									<span class="flex items-center gap-1">
										{#if stop.point}
											<span
												class="rounded-full px-1.5 py-px text-[7px] font-semibold {POINTS[
													stop.point
												].chip}">{stop.point}</span
											>
										{/if}
										<span class="font-medium text-slate-800">{stop.facility}</span>
										{#if placeOf(stop.facility)?.city}
											<span class="text-slate-500">{placeOf(stop.facility)?.city}</span>
										{/if}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	{:else if block.kind === 'cargo'}
		<table class="w-full text-left text-[10.5px]">
			{#if !block.from}
				<thead>
					<tr class="text-[7.5px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
						<th class="w-14 pb-1 font-semibold">Qty</th>
						<th class="pb-1 font-semibold">Description</th>
					</tr>
				</thead>
			{/if}
			<tbody class="divide-y divide-slate-100">
				{#each cargo.slice(block.from, block.to) as item (item.id)}
					<tr>
						<td class="w-14 py-1 font-bold text-slate-900 tabular-nums">{item.quantity || '–'}</td>
						<td class="py-1 text-slate-700">{item.description}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if block.kind === 'attachments'}
		<!-- The item list as it was handed over: photos of it, and the names of any files. -->
		<div class="flex flex-wrap items-start gap-1.5 pt-2">
			{#each attachments as file (file.id)}
				{#if file.kind === 'photo'}
					<img
						src={file.src}
						alt={file.name}
						draggable="false"
						class="h-20 rounded-lg object-cover"
					/>
				{:else}
					<span
						class="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[9px] text-slate-600"
						><span class="icon-[mdi--file-table-outline] size-3.5 text-primary"
						></span>{file.name}</span
					>
				{/if}
			{/each}
		</div>
	{:else if block.kind === 'day'}
		{@const day = timelog?.days.find((item) => item.id === block.id)}
		{#if days === 'newline'}
			<div class="pt-6 pb-2">
				<p class="text-[13px] font-bold text-slate-900">Day {block.index + 1}</p>
				<p class="text-[11px] text-slate-500">
					{dateOf(day?.date ?? '')}{block.isContinued ? ', continued' : ''}
				</p>
			</div>
		{:else}
			<p class="pt-6 pb-2 text-[13px] font-bold text-slate-900">
				Day {block.index + 1}
				<span class="font-normal text-slate-500"
					>({dateOf(day?.date ?? '')}){block.isContinued ? ' continued' : ''}</span
				>
			</p>
		{/if}
	{:else if block.kind === 'entry'}
		<ul>
			{@render entryRow(block.time, block.activity, block.isLast)}
		</ul>
	{:else if block.kind === 'text'}
		<p class="pt-3 text-[9.5px] leading-[1.5] text-slate-700">{block.text}</p>
	{:else if block.kind === 'point'}
		{@const point = organization.disclaimer.points.find((item) => item.id === block.id)}
		{#if point}
			<ul class="list-disc pt-1.5 pl-4 text-[9.5px] leading-[1.45] text-slate-700">
				<li><b class="text-slate-900">{point.title}:</b> {point.text}</li>
			</ul>
		{/if}
	{:else if block.kind === 'closing'}
		<p class="pt-6 text-[10.5px] text-slate-700 italic">{block.text}</p>
	{:else if block.kind === 'empty'}
		<p class="text-[11px] text-slate-300 italic">{block.text}</p>
	{/if}
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
			bind:this={canvas}
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
								{#if organization.logo}
									<img
										src={organization.logo}
										alt=""
										class="size-48 object-contain"
									/>
								{/if}
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
								<!-- The prototype selector picks the cover's list: A is the one column, B the two with pictures. -->
								{#if look.variant('cover') === 'B'}
									<CoverB lines={cover} />
								{:else}
									<CoverA lines={coverLines} />
								{/if}
							</div>
						</div>
					{:else}
						<header class="px-10 pt-6">
							<div class="flex items-center justify-between gap-4">
								{@render trident()}
								{@render code()}
							</div>
							<div class="mt-3 h-px bg-slate-900/15"></div>
						</header>
						<div class="px-10 pt-6">
							<h2 class="text-[24px] font-bold tracking-tight text-slate-950">{item.title}</h2>
							{#if item.blocks}
								{#each item.blocks as block, at (at)}{@render flowBlock(block)}{/each}
							{:else if item.kind === 'contents'}
								{#snippet line(number: string, title: string, page: number, isSub: boolean)}
									<li
										class="flex items-baseline gap-2 {isSub
											? 'py-[3px] pl-8 text-[11px] text-slate-600'
											: 'pt-2.5 pb-[3px] text-[12.5px] font-semibold text-slate-900'}"
									>
										<span class="w-6 shrink-0 font-semibold text-slate-950 tabular-nums"
											>{number}</span
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
										{@render line(`${entryIndex + 1}.`, entry.title, pageOf(entry.key), false)}
										{#each entry.subs as sub, subIndex (sub)}
											{@render line(
												`${entryIndex + 1}.${subIndex + 1}`,
												sub,
												partPage(sub, entry.key),
												true
											)}
										{/each}
									{/each}
								</ol>
							{:else if item.kind === 'report'}
								<p class="mt-2 text-[10.5px] leading-relaxed text-slate-600">
									<b class="text-slate-900">Introduction.</b> This is to report that {organization.name}
									was present at {facility || 'the facility'}{location ? ` – ${location}` : ''} on {dates}
									for the purpose of conducting a {(
										detail('Project Type') || 'cargo'
									).toLowerCase()} survey{cargoLine ? ` of ${cargoLine}` : ''}{transport
										? ` from the ${transport}`
										: ''}.
								</p>
								<!-- The project in one strip: what it is, who it is for, where and when. -->
								<div class="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
									<div class="flex items-baseline justify-between gap-3">
										<p class="min-w-0 truncate text-[15px] leading-tight font-bold text-slate-950">
											{detail('Title') || 'Untitled project'}
										</p>
										{#if detail('Project Type')}
											<span
												class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[8px] font-semibold text-slate-600"
												>{detail('Project Type')}</span
											>
										{/if}
									</div>
									{#if detail('Subtitle')}
										<p class="text-[10.5px] text-slate-500">{detail('Subtitle')}</p>
									{/if}
									<div
										class="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-t border-slate-200 pt-2 text-[10px]"
									>
										<div class="flex min-w-0 items-center gap-2">
											{#if client.icon}
												<img
													src={client.icon}
													alt=""
													draggable="false"
													class="size-6 shrink-0 rounded-full bg-white object-contain"
												/>
											{/if}
											<div class="min-w-0">
												<p class="truncate font-semibold text-slate-900">
													{company || 'No customer yet'}
												</p>
												{#if contact?.name}
													<p class="truncate text-[8.5px] text-slate-500">
														Attn. {[contact.name, contact.title, contact.email]
															.filter(Boolean)
															.join(' · ')}
													</p>
												{/if}
											</div>
										</div>
										<p class="flex min-w-0 items-center gap-1 text-slate-600">
											<span class="icon-[mdi--map-marker] size-3.5 shrink-0 text-slate-400"
											></span><span class="truncate">{location || 'No location yet'}</span>
										</p>
										<p class="flex min-w-0 items-center gap-1 text-slate-600">
											<span
												class="icon-[mdi--calendar-blank-outline] size-3.5 shrink-0 text-slate-400"
											></span><span class="truncate">{dates}</span>
										</p>
									</div>
								</div>
								<h3 class="mt-4 text-[12.5px] font-bold text-slate-950">Personnel in Attendance</h3>
								<!-- The team as cards, like the Team page's: the lead first, in a blue ring, and nobody labelled. -->
								<div class="mt-1.5 grid grid-cols-3 gap-1.5">
									{#each people.slice(0, 9) as name, personIndex (name)}
										{@const member = memberOf(name)}
										<div
											class="flex flex-col items-center rounded-xl bg-slate-50 px-2 py-2 text-center"
										>
											<img
												src={personOf(name).photo}
												alt=""
												draggable="false"
												class="size-9 rounded-full object-cover ring-2 {personIndex === 0
													? 'ring-primary'
													: 'ring-white'}"
											/>
											<p class="mt-1 w-full truncate text-[10.5px] font-semibold text-slate-900">
												{name}
											</p>
											{#if member?.title}
												<p class="w-full truncate text-[8px] text-slate-500">{member.title}</p>
											{/if}
											{#if member}
												<p class="mt-1 flex flex-wrap justify-center gap-0.5">
													{#each labelsOf(member).slice(0, 2) as label (label)}
														<span
															class="rounded-full bg-white px-1.5 py-px text-[7px] font-medium text-slate-600"
															>{label}</span
														>
													{/each}
												</p>
											{/if}
										</div>
									{:else}
										<p class="col-span-3 text-[11px] text-slate-300 italic">No one assigned yet</p>
									{/each}
								</div>
								<!-- Anyone else on the job, kept apart from the team: each company, then its people. -->
								{#each personnel as company (company.id)}
									<p
										class="mt-2 border-t border-slate-100 pt-1.5 text-[7.5px] font-semibold tracking-[0.14em] text-slate-400 uppercase"
									>
										{company.company || 'Other personnel'}
									</p>
									<div class="mt-1 grid grid-cols-3 gap-1.5">
										{#each company.people as person (person.id)}
											<div class="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
												<span
													class="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600"
													>{person.name.trim().slice(0, 1).toUpperCase()}</span
												>
												<div class="min-w-0">
													<p class="truncate text-[10px] font-semibold text-slate-900">
														{person.name}
													</p>
													{#if person.title}
														<p class="truncate text-[8px] text-slate-500">{person.title}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/each}
								<h3 class="mt-4 text-[12.5px] font-bold text-slate-950">Transport Mode</h3>
								<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
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
										<p class="text-[11px] text-slate-300 italic">No transport mode yet</p>
									{/each}
								</div>
								<h3 class="mt-4 text-[12.5px] font-bold text-slate-950">Cargo Description</h3>
								{#if cargo.length}
									<table class="mt-1 w-full text-left text-[10.5px]">
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
													<td class="py-1 font-bold text-slate-900 tabular-nums"
														>{item.quantity || '–'}</td
													>
													<td class="py-1 text-slate-700">{item.description}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else if !attachments.length}
									<p class="mt-1.5 text-[11px] text-slate-300 italic">Not filled in yet</p>
								{/if}
								{#if attachments.length}
									<!-- The item list as it was handed over: photos of it, and the names of any files. -->
									<div class="mt-2 flex flex-wrap items-start gap-1.5">
										{#each attachments as file (file.id)}
											{#if file.kind === 'photo'}
												<img
													src={file.src}
													alt={file.name}
													draggable="false"
													class="h-20 rounded-lg object-cover"
												/>
											{:else}
												<span
													class="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[9px] text-slate-600"
													><span class="icon-[mdi--file-table-outline] size-3.5 text-primary"
													></span>{file.name}</span
												>
											{/if}
										{/each}
									</div>
								{/if}
							{:else if item.kind === 'transport' && item.panel}
								<!-- Every stop on this one page: what moved the items, where, and its particulars. -->
								<div class="mt-3 space-y-2">
									{#each item.panel.stops.filter((stop) => stop.name || stop.facility || stop.mode) as stop (stop.id)}
										{@const place = look.facilities.find((other) => other.name === stop.facility)}
										{@const carrier = look.transports.find((other) => other.name === stop.name)}
										<section class="rounded-xl bg-slate-50 px-3.5 py-2.5">
											<div class="flex items-center gap-3">
												<span
													class="flex size-9 shrink-0 items-center justify-center rounded-xl {stop.point
														? POINTS[stop.point].chip
														: 'bg-slate-100 text-slate-400'}"
													><span class="{iconOf(stop)} size-5"></span></span
												>
												<div class="min-w-0 flex-1">
													<p
														class="truncate text-[13px] leading-tight font-bold {stop.name
															? 'text-slate-950'
															: 'text-slate-300 italic'}"
													>
														{stop.name || 'Not filled in yet'}
													</p>
													<p
														class="text-[7.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase"
													>
														{#if stop.point}<span class={POINTS[stop.point].text}>{stop.point}</span
															>{/if}
														{[stop.type, stop.mode].filter(Boolean).join(' · ')}
													</p>
												</div>
												<div class="max-w-[46%] min-w-0 text-right text-[9px] leading-snug">
													<p
														class="truncate text-[10.5px] font-semibold {stop.facility
															? 'text-slate-900'
															: 'text-slate-300 italic'}"
													>
														{stop.facility || 'No facility yet'}
													</p>
													<p class="truncate text-slate-500">
														{[place?.kind, place?.city].filter(Boolean).join(' · ')}
													</p>
													{#if place?.address}<p class="truncate text-slate-500">
															{place.address}
														</p>{/if}
													{#if place?.contact || place?.phone}
														<p class="truncate text-slate-500">
															{[place?.contact, place?.phone].filter(Boolean).join(' · ')}
														</p>
													{/if}
												</div>
											</div>
											{#if PARTICULARS[stop.mode]}
												<dl
													class="mt-2 grid grid-cols-5 gap-x-3 gap-y-1 border-t border-slate-200 pt-1.5"
												>
													{#each PARTICULARS[stop.mode] as label (label)}
														<div class="min-w-0">
															<dt
																class="truncate text-[6.5px] font-semibold tracking-[0.1em] text-slate-400 uppercase"
															>
																{label}
															</dt>
															<dd
																class="truncate text-[9.5px] {carrier?.details?.[label]
																	? 'text-slate-900'
																	: 'text-slate-300'}"
															>
																{carrier?.details?.[label] || '–'}
															</dd>
														</div>
													{/each}
												</dl>
											{/if}
										</section>
									{:else}
										<p class="text-[11px] text-slate-300 italic">No stops yet</p>
									{/each}
								</div>
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
									{organization.disclaimer.opening}
								</p>
								<ul
									class="mt-2 list-disc space-y-1 pl-4 text-[9.5px] leading-[1.45] text-slate-700"
								>
									{#each organization.disclaimer.points as point (point.id)}
										<li><b class="text-slate-900">{point.title}:</b> {point.text}</li>
									{/each}
								</ul>
								{#if organization.disclaimer.note}
									<p class="mt-2 text-[9.5px] leading-[1.5] text-slate-700">
										{organization.disclaimer.note}
									</p>
								{/if}
								<!-- Like the HTML email signatures (packages/ui email): Best Regards with room above and below,
								     a round photo, the name, the title in blue capitals, then phone, email and the group email. -->
								{#if organization.closing}
									<p class="mt-6 text-[10.5px] text-slate-700 italic">{organization.closing}</p>
								{/if}
								<div class="mt-6">{@render signature()}</div>
							{/if}
						</div>
						{#if item.hasSignature}
							<!-- Disclaimer B: the signature at the foot of the page, clear of the text above and the footer. -->
							<div class="absolute inset-x-10 bottom-[96px]">{@render signature()}</div>
						{/if}
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

	<!-- Every flowing block once more, out of sight, at the width it prints, so its height can be read. -->
	<div
		bind:this={measurer}
		class="pointer-events-none invisible absolute top-0 -left-[9999px] text-slate-800"
		style="width: {W - 80}px"
		aria-hidden="true"
		inert
	>
		{#each flows as flow (flow.key)}
			<div data-flow={flow.key}>
				{#each flow.blocks as block, at (at)}
					<div>{@render flowBlock(block)}</div>
				{/each}
			</div>
		{/each}
		<div data-signature>{@render signature()}</div>
	</div>

	<div
		class="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
	>
		<ZoomBar
			{viewport}
			{layout}
			onfit={refit}
			onlayout={toggleLayout}
			ondownload={download}
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
