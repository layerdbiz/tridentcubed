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
	import PdfPage from '#lib/components/attachment/pdf-page.svelte';
	import { bytesOf, drawPage, pdfOf } from '#lib/pdf/pdf.utils.js';
	import { pageCountOf } from '#lib/pdf/pdf.state.svelte.js';
	import Photo from '#lib/components/photo/photo.svelte';
	import Trip from '#lib/components/trip/trip.svelte';
	import type { TripLegType } from '#lib/components/trip/trip.types.js';
	import {
		ATTACHMENT_ICONS,
		ATTACHMENT_NAMES,
		toCrossOrigin,
		toTypeLabel
	} from '#lib/files/files.schema.js';
	import { fileDetailsOf } from '#lib/files/files.state.svelte.js';
	import { ICON_192 } from '#lib/install/install.constants.js';
	import { toReportLink } from '#lib/report/report.utils.js';
	import { toLengthLabel, toVideoLink } from '#lib/video/video.utils.js';
	import Avatar from './avatar.svelte';
	import ClientLogo from './client-logo.svelte';
	import { introductionOf, listOf } from './introduction';
	import ItemTable, { type FitType, type PartType } from './item-table.svelte';
	import { legsOf, type LegType } from './legs';
	import {
		createdDayOf,
		dayOf,
		documentIdOf,
		FACILITY_ICONS,
		groupWordOf,
		isPdfAttachment,
		MODE_ICONS,
		PAGE_ICONS,
		PARTICULARS,
		personOf,
		POINTS,
		toReference,
		type AttachmentType,
		type PanelType,
		type StopType
	} from './look.data';
	import { customerOf, locationOf } from './records.data';
	import { cityStateOf, partsOf } from './location';
	import {
		DownloadError,
		joinPdfs,
		PART_LIMIT,
		type PdfReaderType,
		placePdfPages,
		type PlacementType,
		printParts,
		sizeOf,
		toPageLink,
		toParts
	} from './download';
	import { downloadToast } from './toasts';
	import { LINK_TITLE, linkNameOf, toLink } from './link';
	import {
		createFollower,
		columnsFitOf,
		columnsOf,
		contentLinesOf,
		flowOf,
		heightOf,
		lineSizeOf,
		markOf,
		paginate,
		partSpansOf,
		photoPagesOf,
		rangeOf,
		sheetsOf,
		spanOf,
		spotsOf,
		stageNumbersOf,
		targetOf,
		type ContentLineType
	} from './report-flow';
	import { fromSaved, toSaved, toTable } from './spreadsheet';
	import { labelsOf } from './team.data';
	import type { LookState } from './look.state.svelte';
	import Qr from './qr.svelte';
	import CoverA from './variants/cover-a.svelte';
	import CoverB from './variants/cover-b.svelte';
	import CoverC, { type CoverLineType as CoverCLineType } from './variants/cover-c.svelte';
	import PageStrip from './page-strip.svelte';
	import PresentBar from './present-bar.svelte';
	import {
		Presentation,
		slideRoomOf,
		slideZoomOf,
		startOf,
		type LayoutType
	} from './presentation.svelte';
	import { Viewport, type RectType } from './viewport.svelte';
	import ZoomBar from './zoom-bar.svelte';

	let {
		look,
		highlight = '',
		days = 'parens',
		start = 'column',
		surface = 'bg-slate-100',
		left = 0,
		top = 0,
		isLeft = false
	}: {
		look: LookState;
		highlight?: string;
		days?: 'parens' | 'newline' | 'timeline';
		start?: 'column' | 'spread';
		surface?: string;
		left?: number;
		top?: number;
		// The pages start from the left, next to the panels, in place of centring.
		isLeft?: boolean;
	} = $props();

	type PageType = {
		key: string;
		title: string;
		kind: string;
		panel?: PanelType;
		group?: number;
		part?: number;
		parts?: number;
		// A page of a section that flows: the blocks that landed on it, and whether the signature sits at its foot.
		blocks?: BlockType[];
		hasSignature?: boolean;
		// The Disclaimer (#275): its points in two columns between the blocks above and under them, and how much
		// smaller the points are drawn so the page never runs over; none, or 1, for their own size.
		columns?: BlockType[][];
		after?: BlockType[];
		fit?: number;
		// A page of the Table of Contents (#277): which of its lines (`contentLines`) landed on it.
		lines?: number[];
	};
	// One piece of a flowing section, never cut in two.
	type BlockType =
		| { kind: 'intro' | 'strip' | 'team' | 'attachments' }
		| { kind: 'picture'; id: string }
		// #295: a PDF of the Items panel, one sheet of its pages to a block: which pages, and which of its sheets.
		| { kind: 'sheet'; id: string; pages: number[]; part: number; parts: number }
		| { kind: 'heading' | 'text' | 'note' | 'closing' | 'empty'; text: string }
		| { kind: 'company' | 'point'; id: string }
		| { kind: 'leg'; id: string; isFull: boolean }
		| { kind: 'cargo'; from: number; to: number }
		// The item list read from a spreadsheet (#242), a part to a block: the lines above its headings, its headings
		// (said again on each page it runs on to), one row, or its totals.
		| { kind: 'list'; part: 'notes' | PartType; isFirst?: boolean }
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
	type EntryType = {
		title: string;
		key: string;
		page: string;
		subs: { title: string; page: string }[];
	};

	const W = 595;
	const H = 842;
	const viewport = new Viewport();
	$effect.pre(() => {
		viewport.left = left;
		viewport.top = top;
		viewport.isLeft = isLeft;
	});
	// svelte-ignore state_referenced_locally
	let layout = $state<LayoutType>(start);
	// Presentation (#324): the pages one at a time, over the whole screen, and the layout Esc goes back to.
	const presentation = new Presentation();
	const isPresenting = $derived(layout === 'present');
	// svelte-ignore state_referenced_locally
	let back: 'column' | 'spread' = start;

	function valueOf(kind: string, label: string) {
		return look.panels
			.find((panel) => panel.kind === kind)
			?.fields.find((field) => field.label === label)?.value;
	}

	// A value of the Project panel.
	function detail(label: string) {
		return valueOf('project', label);
	}

	const team = $derived(look.panels.find((panel) => panel.kind === 'project'));
	const timelog = $derived(look.panels.find((panel) => panel.kind === 'timelog'));
	const company = $derived(detail('Customer') || look.project.client);
	// Where the project is, as every view shows it: its city and state (#320).
	const location = $derived(cityStateOf(look.project.location));
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
	// What is attached to the Items panel, by how it prints (#233): a photo of the list whole, one to a block so a
	// tall one moves to the next page instead of being cut; a file as its name.
	const pictures = $derived(attachments.filter((file) => file.kind === 'photo'));
	// The item list read from a spreadsheet (#242), as the table it prints as. It is followed by what it holds, not
	// by which object holds it, so fresh rows from the server that say the same thing change nothing here.
	const listKey = $derived(
		toSaved(look.panels.find((panel) => panel.kind === 'items' && panel.isEnabled)?.grid)
	);
	const itemList = $derived.by(() => {
		const grid = fromSaved(listKey);
		return grid && toTable(grid);
	});
	// How that table fits the page's width, read from a copy laid out at its natural size (item-table.svelte). It
	// belongs to the list it was read from; a new list prints once it has been read too.
	let fitted = $state<{ key: string; fit: FitType }>();
	const listFit = $derived(fitted?.key === listKey ? fitted.fit : undefined);
	function fitList(key: string, fit: FitType) {
		if (fitted?.key !== key || JSON.stringify(fitted.fit) !== JSON.stringify(fit))
			fitted = { key, fit };
	}
	// #295: a PDF attached to the Items panel prints its pages, `layout` of them to a report page, as a photo group's
	// photos do (glossary "Item List"). Its pages are counted on the device: until they are, it takes one page, and
	// one that cannot be read prints its name like any other file.
	function sheetsOfFile(file: AttachmentType) {
		const count = pageCountOf(file.src);
		return count === 0 ? [] : sheetsOf(count ?? 1, file.layout);
	}
	const documents = $derived(
		attachments.filter(
			(file) => file.kind !== 'photo' && !(isPdfAttachment(file) && pageCountOf(file.src) !== 0)
		)
	);
	// The Operations panel's link to the project's files (#233), as an address to open, and what to call where it
	// goes. None when the panel is switched off, as with everything a panel holds, or when nothing usable is typed.
	const filesLink = $derived(
		toLink(look.panels.find((panel) => panel.key === 'operations' && panel.isEnabled)?.link)
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
	// The Items panel's filled rows.
	const cargo = $derived(
		(look.panels.find((panel) => panel.kind === 'items')?.items ?? []).filter((item) =>
			item.description.trim()
		)
	);
	// The report's opening sentence (#244): the one typed in the Project panel, else the one worked out.
	const introduction = $derived(introductionOf(look));

	function iconOf(stop: StopType) {
		return (
			MODE_ICONS[stop.mode] ??
			(stop.point ? POINTS[stop.point].icon : 'icon-[mdi--help-circle-outline]')
		);
	}

	const client = $derived(customerOf(look, company));
	// The pin in the customer's row is the customer's own place, from its record (#238); the project's is in the
	// opening sentence and under Transport Mode.
	const customerLocation = $derived(locationOf(client));
	// Who the report is for: the contact picked in the Project panel, else the customer's first.
	const contact = $derived(
		(client.contacts ?? []).find((item) => item.id === team?.contact) ??
			(client.contacts ?? []).find((item) => item.name)
	);
	// The cover's two dates (#217). Created Date is the Project Creation Date saved with the project, the day its
	// number shows. Completed Date is when the work was done: the Time Log's dated day, or first to last for a job of
	// several days; nothing before any.
	const createdDate = $derived(dayOf(createdDayOf(look.project)));
	const completedDate = $derived.by(() => {
		const days = (timelog?.days ?? [])
			.map((day) => day.date)
			.filter(Boolean)
			.toSorted();
		if (!days.length) return '';
		return days.length > 1 && days[0] !== days.at(-1)
			? `${dateOf(days[0])} to ${dateOf(days.at(-1)!)}`
			: dateOf(days[0]);
	});
	// The days the team was there, as the report's sentences say it: before any, the day the project began.
	const dates = $derived(completedDate || createdDate);
	// The customer's own number for the job (#217): a row of its own on the cover (#273), under the document ID in the
	// footer.
	const reference = $derived(
		toReference(team?.customerReference ?? look.project.customerReference)
	);

	function titleOf(name: string) {
		return look.members.find((member) => member.name === name)?.title ?? '';
	}
	// What a page's QR code opens (#216): this project's Preview in the app, at that page, by the report's short
	// link (#lib/report). The app it names is the one the report was made in, where its data is. With no project
	// to link to, the organization's website, as a full link.
	const siteLink = $derived.by(() => {
		const site = organization.website.trim() || 'tridentcubed.com';
		return site.toLowerCase().startsWith('http') ? site : `https://${site}`;
	});
	function linkOf(page: number) {
		const id = look.project?.id;
		return id ? toReportLink(document.location.origin, id, page) : siteLink;
	}
	const documentNumber = $derived(documentIdOf(look.project, look.projects, company));
	// What a video's thumbnail opens (#327): the video played in the app this report was made in.
	function videoLinkOf(source: string | undefined) {
		return toVideoLink(document.location.origin, source ?? '') || undefined;
	}

	// The trip as legs (legs.ts): one transport and the facilities it calls at.
	const legs = $derived(
		legsOf(trip?.stops ?? []).filter((leg) =>
			leg.stops.some((stop) => stop.name || stop.mode || stop.facility)
		)
	);

	// Report Cover C (#247, #256; the Stops look is #273): the trip as the strip reads it (#lib/components/trip), each
	// leg's Transport Mode by name and icon and each facility by name, city and its kind's icon.
	const isCoverC = $derived(look.variant('cover') === 'C');
	const stripLegs = $derived(
		legs.map((leg): TripLegType => {
			const first = leg.stops[0];
			return {
				transport: {
					name: first?.name ?? '',
					icon: MODE_ICONS[first?.mode ?? ''] ?? PAGE_ICONS.transport
				},
				stops: leg.stops.map((stop) => {
					const place = placeOf(stop.facility);
					return {
						point: stop.point,
						facility: stop.facility,
						city: cityStateOf(place?.city ?? ''),
						icon: place ? FACILITY_ICONS[place.kind] : PAGE_ICONS.facilities
					};
				})
			};
		})
	);
	// Its list. The dates are written for the cover alone, 2026/10/27, and a job of several days with a dash; the
	// report's sentences keep their own (`dates`).
	function slashesOf(day: string) {
		return day.replaceAll('-', '/');
	}
	const coverListC = $derived.by((): CoverCLineType[] => {
		const days = (timelog?.days ?? [])
			.map((day) => day.date)
			.filter(Boolean)
			.toSorted();
		const last = days.at(-1) ?? '';
		// The people who were there but are not on the team, as a count after the team's faces.
		const others = personnel.reduce((count, item) => count + item.people.length, 0);
		return [
			{
				icon: PAGE_ICONS.customers,
				label: 'Customer',
				value: company,
				customer: company
			},
			// The company's logo is the dark mark the installed app wears.
			{ icon: 'icon-[mdi--domain]', label: 'Company', value: organization.name, logo: ICON_192 },
			{
				icon: PAGE_ICONS.team,
				label: 'Team',
				value: listOf(people),
				names: people,
				more: others ? `+${others} ${others === 1 ? 'other' : 'others'}` : ''
			},
			{
				icon: 'icon-[mdi--package-variant-closed]',
				label: 'Type',
				value: detail('Project Type') ?? ''
			},
			// The customer's own number for the job, with the icon it has in the page header. The row is left out
			// when the project has none (#273).
			...(reference
				? [
						{
							icon: 'icon-[mdi--card-account-details-outline]',
							label: 'Reference',
							value: reference
						}
					]
				: []),
			{
				icon: 'icon-[mdi--calendar-blank-outline]',
				label: 'Created',
				value: slashesOf(createdDayOf(look.project))
			},
			{
				icon: 'icon-[mdi--check-circle-outline]',
				label: 'Completed',
				value:
					days.length > 1 && days[0] !== last
						? `${slashesOf(days[0])} — ${slashesOf(last)}`
						: slashesOf(days[0] ?? '')
			}
		];
	});
	// Where its top part stands: the band's height, the wave over it and 28 of clear paper are kept under it. The
	// logo is as big as what is left allows, 168 at most.
	let coverBandHeight = $state(0);
	let coverTitleHeight = $state(0);
	let coverStripHeight = $state(0);
	const coverReserved = $derived(coverBandHeight + 59 + 28);
	const coverLogo = $derived(
		Math.max(
			80,
			Math.min(
				168,
				H - coverReserved - 44 - (32 + coverTitleHeight + 9 + 28 + 14 + coverStripHeight)
			)
		)
	);

	// What a page has under its title, between the header and the footer, and how many cargo rows make a block.
	const ROOM = 606;
	const ROWS = 12;
	// The tallest a photo of the item list prints (#233): a page's room, less the heading it must stay under.
	const PICTURE_ROOM = 540;
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
			if (itemList && listFit) {
				const parts: ('notes' | PartType)[] = [
					...(itemList.notes.length ? ['notes' as const] : []),
					...(itemList.hasHeads ? ['head' as const] : []),
					...itemList.rows.keys(),
					...(itemList.totals ? ['totals' as const] : [])
				];
				for (const [at, part] of parts.entries())
					blocks.push({ kind: 'list', part, isFirst: at === 0 });
			}
			for (const file of attachments) {
				if (file.kind === 'photo') blocks.push({ kind: 'picture', id: file.id });
				else if (isPdfAttachment(file)) {
					const sheets = sheetsOfFile(file);
					for (const [part, pages] of sheets.entries())
						blocks.push({ kind: 'sheet', id: file.id, pages, part, parts: sheets.length });
				}
			}
			if (documents.length) blocks.push({ kind: 'attachments' });
			if (!cargo.length && !attachments.length && !itemList)
				blocks.push({ kind: 'empty', text: 'Not filled in yet' });
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
						? [{ kind: 'note', text: organization.disclaimer.note } as BlockType]
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
	// The thank-you's font, set so its one line fills the text's width (#275); none when it wraps instead.
	let closingSize = $state<number | undefined>();
	// The Disclaimer's points (#275): how much smaller they are drawn, and each one's height at that size.
	let points = $state<{ fit: number; heights: number[] }>({ fit: 1, heights: [] });
	// Clear paper kept between the Disclaimer's last line and its signature.
	const SIGNATURE_GAP = 28;
	// The Disclaimer's two columns of points and the space between them (#275), and the space over them.
	const COLUMN_GAP = 28;
	const LIST_GAP = 12;

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
		const line = measurer.querySelector<HTMLElement>('[data-closing]')?.offsetWidth ?? 0;
		closingSize = lineSizeOf(line, W - 80);
		measurePoints(next.disclaimer ?? []);
	}

	// The Disclaimer's points read at each size tried: drawn smaller, a column is wider in the points' own measure,
	// so they rewrap shorter. The size kept leaves room for the rest of the page and a clear gap over the signature.
	function measurePoints(tall: number[]) {
		const flow = flows.find((each) => each.kind === 'disclaimer');
		const blocks = [...(measurer?.querySelectorAll<HTMLElement>('[data-points] > div') ?? [])];
		if (!flow || !blocks.length) return;
		const around =
			heightOf(
				tall,
				flow.blocks.flatMap((block, index) => (block.kind === 'point' ? [] : [index]))
			) +
			LIST_GAP +
			signatureHeight +
			SIGNATURE_GAP;
		function heightsAt(fit: number) {
			for (const block of blocks) block.style.width = `${((W - 80) / fit - COLUMN_GAP) / 2}px`;
			return blocks.map((block) => block.getBoundingClientRect().height);
		}
		const fit = columnsFitOf(heightsAt, ROOM - around);
		const next = { fit, heights: heightsAt(fit) };
		if (JSON.stringify(next) !== JSON.stringify(points)) points = next;
	}

	// Measured again when what is printed changes, and when a picture or a font arrives and changes a height.
	$effect(() => {
		void flows;
		void contentLines;
		void signer;
		void closingSize;
		measure();
	});
	onMount(() => {
		if (!measurer) return;
		const observer = new ResizeObserver(measure);
		observer.observe(measurer);
		// A font that arrives late changes a line's width without changing the measurer's size.
		void document.fonts?.ready.then(measure);
		return () => observer.disconnect();
	});

	// The blocks on one page. A Time Log page that opens part-way through a day says which day first, the way the
	// day's own heading does (Justin, 2026-11-12).
	function blocksOn(flow: FlowType, page: number[]) {
		const blocks = page.map((at) => flow.blocks[at]);
		const [first] = blocks;
		if (first?.kind === 'entry')
			blocks.unshift({ kind: 'day', id: first.day, index: first.dayIndex, isContinued: true });
		// A page that opens part-way through the item list says its headings again (#242).
		if (first?.kind === 'list' && isListRow(first) && itemList?.hasHeads)
			blocks.unshift({ kind: 'list', part: 'head' });
		return blocks;
	}

	// A row of the item list, or its totals: what its headings stand over.
	function isListRow(block: BlockType) {
		return block.kind === 'list' && (typeof block.part === 'number' || block.part === 'totals');
	}

	// A flowing section as pages: its blocks dealt out by height, a heading never left at a page's foot.
	function pagesOf(flow: FlowType) {
		const tall = heights[flow.key] ?? [];
		// The Disclaimer is always one page, its signature at its foot (Justin, 2026-11-19: "the only page that you
		// absolutely cannot by any means make into two pages"). Its points stand in two columns that end level, and
		// only they are drawn smaller when the page is too full (#275).
		if (flow.kind === 'disclaimer') {
			const indexes = flow.blocks.flatMap((block, index) =>
				block.kind === 'point' ? [index] : []
			);
			const first = indexes[0] ?? flow.blocks.length;
			const last = indexes.at(-1) ?? first - 1;
			const columns = columnsOf(indexes.map((_, at) => points.heights[at] ?? 0));
			return [
				{
					key: flow.key,
					title: flow.title,
					kind: flow.kind,
					panel: flow.panel,
					blocks: flow.blocks.slice(0, first),
					columns: columns.map((side) => side.map((at) => flow.blocks[indexes[at]])),
					after: flow.blocks.slice(last + 1),
					hasSignature: true,
					fit: points.fit
				} satisfies PageType
			];
		}
		// The item list's headings, said again over a row that opens a page, take their height there (#242).
		const again = itemList?.hasHeads && listFit ? Math.ceil(listFit.head * listFit.scale) : 0;
		const dealt = paginate(
			flow.blocks.map((_, index) => tall[index] ?? 0),
			// A Time Log page may open with its day said again, so each keeps room for that line.
			flow.kind === 'timelog' ? ROOM - 52 : ROOM,
			flow.blocks.map(
				(block) =>
					block.kind === 'heading' ||
					block.kind === 'day' ||
					(block.kind === 'list' && !isListRow(block))
			),
			flow.blocks.map((block) => (isListRow(block) ? again : 0)),
			// On the Project Report a part (Personnel in Attendance, Transport Mode, Cargo Description) that would run
			// over starts on a new page (Justin, 2026-11-19); the contents find each part by its heading's page.
			flow.kind === 'report' ? flow.blocks.map((block) => block.kind === 'heading') : [],
			// An Items PDF's sheet after its first opens a page, so no page holds more of its pages than its layout.
			flow.blocks.map((block) => block.kind === 'sheet' && block.part > 0)
		);
		return dealt.map((page, index): PageType => ({
			key: flow.key,
			title: index ? `${flow.title} (continued)` : flow.title,
			kind: flow.kind,
			panel: flow.panel,
			blocks: blocksOn(flow, page)
		}));
	}

	// The cover, and the Table of Contents' title (#277).
	const COVER: PageType = { key: 'cover', title: 'Cover', kind: 'cover' };
	const CONTENTS_TITLE = 'Table of Contents';
	// The space over the first line (the list's top margin), and each line's height before it has been read.
	const CONTENTS_GAP = 16;
	const LINE_HEIGHTS = { section: 32, part: 23 };

	const pages = $derived.by(() => {
		const list: PageType[] = [];
		const report = flows.find((flow) => flow.key === 'report');
		if (report) list.push(...pagesOf(report));
		else list.push({ key: 'report', title: 'Project Report', kind: 'report' });
		for (const panel of look.panels) {
			if (!panel.isEnabled) continue;
			const flow = flowOf(panel, flows);
			if (flow) list.push(...pagesOf(flow));
			// Transport Mode A: every stop on one page (run 19), not a page each.
			else if (panel.kind === 'transport' && panel.stops.length)
				list.push({ key: 'transport', title: panel.name, kind: 'transport', panel });
			// A photo panel's title stands on every one of its pages: alone on the first, "(continued)" on each after
			// it, with the group's own name under it (#215). A group switched off prints nothing.
			if (panel.kind === 'photos')
				for (const { group, part, parts, isContinued } of photoPagesOf(panel.groups))
					list.push({
						key: `photos-${panel.id}`,
						title: isContinued ? `${panel.name} (continued)` : panel.name,
						kind: 'photos',
						panel,
						group,
						part,
						parts
					});
		}
		const disclaimer = flows.find((flow) => flow.key === 'disclaimer');
		if (disclaimer) list.push(...pagesOf(disclaimer));
		else list.push({ key: 'disclaimer', title: 'Disclaimer', kind: 'disclaimer' });
		return [COVER, ...contentsPagesOf(list), ...list];
	});

	// The Table of Contents as pages (#277; Justin, 2026-11-24): it runs on to "(continued)" pages like any section
	// that flows, and a section moves on whole with its parts when they would not all fit. Its lines are the same
	// however many pages it takes (only their page numbers change), so they are dealt out from a draft with one
	// contents page, at the heights read from the copy drawn out of sight.
	function contentsPagesOf(body: PageType[]): PageType[] {
		const lines = contentLinesOf(
			contentsOf([COVER, { key: 'contents', title: CONTENTS_TITLE, kind: 'contents' }, ...body])
		);
		const read = heights.contents ?? [];
		const tall = lines.map(
			(line, at) =>
				(read.length === lines.length ? read[at] : undefined) ??
				(line.isSub ? LINE_HEIGHTS.part : LINE_HEIGHTS.section)
		);
		return paginate(
			tall,
			ROOM - CONTENTS_GAP,
			[],
			[],
			lines.map((line) => !line.isSub)
		).map((page, index) => ({
			key: 'contents',
			title: index ? `${CONTENTS_TITLE} (continued)` : CONTENTS_TITLE,
			kind: 'contents',
			lines: page
		}));
	}

	// Whether a page shows the link to the project's files (#233): the first page of the Project Report, and the
	// first of the Operations panel.
	function hasFilesLine(item: PageType, index: number) {
		if (item.key !== 'report' && item.panel?.key !== 'operations') return false;
		return pages.findIndex((page) => page.key === item.key) === index;
	}

	// The table of contents: every section, Cover and Table of Contents included, each at the pages it covers and
	// numbered like an ordered list (1. 2. 3. 3.1). The Project Report lists its parts (Justin's run 8 notes 16 and
	// 17, run 9 note 4), and a photo panel the groups that are switched on, in report order: the Operations panel's
	// stages (#215). A section, a part or a group that runs over pages shows where it starts and ends, 7-12 (#259;
	// Justin, 2026-11-21); on one page, that page.
	const REPORT_PARTS = ['Personnel in Attendance', 'Transport Mode', 'Cargo Description'];
	const contents = $derived(contentsOf(pages));
	const contentLines = $derived(contentLinesOf(contents));
	function contentsOf(list: PageType[]) {
		return list
			.filter((item, index) => list.findIndex((other) => other.key === item.key) === index)
			.map((item): EntryType => ({
				title: item.title,
				key: item.key,
				page: pagesOfKey(list, item.key),
				subs:
					item.kind === 'report'
						? partSubs(list, item.key)
						: item.kind === 'photos'
							? groupSubs(list, item.key)
							: []
			}));
	}
	function pageOf(list: PageType[], key: string) {
		return list.findIndex((other) => other.key === key) + 1;
	}
	// The pages a section covers, as the contents print them.
	function pagesOfKey(list: PageType[], key: string) {
		const span = spanOf(list, (page) => page.key === key);
		return span ? rangeOf(span) : '';
	}

	// A photo panel's groups as the contents list them: each at the pages its photos take.
	function groupSubs(list: PageType[], key: string) {
		return list.flatMap((page) => {
			if (page.key !== key || !page.panel || page.part) return [];
			const span = spanOf(list, (other) => other.key === key && other.group === page.group);
			return span ? [{ title: groupTitle(page.panel, page.group ?? 0), page: rangeOf(span) }] : [];
		});
	}

	function groupTitle(panel: PanelType, index: number) {
		return panel.groups[index]?.title.trim() || `Untitled ${groupWordOf(panel)}`;
	}

	// The parts of the Project Report as the contents list them: each from the page its heading landed on to the
	// last page it has anything on, once the report runs over a page. Before it is measured, the report's own page.
	function partSubs(list: PageType[], key: string) {
		const own = list.filter((page) => page.key === key);
		const first = pageOf(list, key);
		const spans = partSpansOf(
			own.map((page) =>
				(page.blocks ?? []).map((block) => (block.kind === 'heading' ? block.text : undefined))
			),
			first
		);
		return REPORT_PARTS.map((part) => ({
			title: part,
			page: rangeOf(spans[part] ?? { first, last: first })
		}));
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
	// #295: an Items PDF's pages in their spots: a photo group's sizes, held down where a full sheet would not fit a
	// page under the Cargo Description heading and the PDF's name (two to a page, and eight), so a sheet never leaves
	// its heading alone at the foot of a page or runs into the footer.
	const SHEET_SIZES: Record<number, string> = {
		1: 'aspect-[4/3]',
		2: 'h-[256px]',
		4: 'aspect-[4/3]',
		6: 'h-[166px]',
		8: 'h-[122px]'
	};

	// Where each page sits on the canvas: one column, or spread out in rows like a design board. Spread out on a
	// desktop, as many to a row as show every page on the screen at its biggest; on a phone four, across the width
	// (#322).
	const COLUMNS = 4;
	const GAP = 48;
	const columns = $derived(
		layout !== 'spread'
			? 1
			: viewport.isWide
				? viewport.columnsFor(pages.length, { width: W, height: H }, GAP)
				: Math.max(1, Math.min(COLUMNS, pages.length))
	);
	// Presented, the page shown fills the room left by the screen's edges and the strip, and the pages lie in one row
	// a screen apart, so the next one waits just past the edge and slides in with a swipe.
	let stripHeight = $state(0);
	let safe = $state({ top: 0, bottom: 0 });
	const slideRoom = $derived(
		slideRoomOf(viewport, viewport.isWide, safe.top, stripHeight || safe.bottom)
	);
	const slideZoom = $derived(slideZoomOf(slideRoom, { width: W, height: H }));
	const slideStep = $derived(viewport.width / slideZoom);
	const rects = $derived(
		pages.map((_, index): RectType =>
			isPresenting
				? { x: index * slideStep, y: 0, width: W, height: H }
				: {
						x: (index % columns) * (W + GAP),
						y: Math.floor(index / columns) * (H + GAP),
						width: W,
						height: H
					}
		)
	);
	// When the rows change shape on a desktop (the window is resized, a panel adds or takes pages), the pages are
	// laid out to fill the screen again. A change of layout is left to its own eased refit.
	let shape = '';
	$effect(() => {
		const rows = Math.ceil(pages.length / columns);
		viewport.content = isPresenting
			? { width: Math.max(0, pages.length - 1) * slideStep + W, height: H }
			: { width: columns * (W + GAP) - GAP, height: rows * (H + GAP) - GAP };
		const next = `${layout}:${columns}x${rows}`;
		untrack(() => {
			const isRefit =
				shape.startsWith(`${layout}:`) && next !== shape && layout === 'spread' && viewport.isWide;
			shape = next;
			if (isRefit) viewport.fitAll(false);
		});
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
	// The page to open at: the open panel's; with none open, the one a report link asked for (#216), which only
	// a project's own Preview follows (Settings shows a report too).
	const panelIndex = $derived(pages.findIndex((item) => item.key === target));
	const pageAsked = $derived(panelIndex < 0 && look.screen === 'workspace' ? look.pageAsked : 0);
	const targetIndex = $derived(targetOf(panelIndex, pageAsked, pages.length));
	// Opening a panel follows the panel from then on: the page a link asked for is forgotten.
	$effect(() => {
		if (panelIndex >= 0 && look.screen === 'workspace') look.pageAsked = 0;
	});

	// Follow the open panel: glide to the page it feeds. The first move is instant and fits the page across.
	// When the header over the canvas changes height (it is measured after the first paint), place it again, and
	// once more when the project's own pages have arrived, so the fit is of the whole report.
	// The page list is rebuilt whenever anything it prints changes, fresh rows from the server included, so
	// `follow` says when the target really moved: otherwise the pages stay where the User put them (#234).
	const follow = createFollower();
	const isReady = $derived(viewport.width > 0);
	const isLoaded = $derived(look.isLoaded(look.projectId));
	$effect(() => {
		const rect = rects[targetIndex];
		const index = targetIndex;
		const inset = top;
		const isWhole = isLoaded;
		if (!isReady || !rect || isPresenting) return;
		untrack(() => {
			const move = follow(index, rect, inset, isWhole);
			// Back from a presentation the pages land on the page that was shown, not the panel's.
			if (move === 'stay' || landing !== undefined) return;
			if (move === 'glide') return viewport.focus(rect);
			// The header's height as it is now: this can run before the line above that hands it to the canvas.
			viewport.top = inset;
			// A page a report link asked for opens across the view, whichever way the pages are laid out.
			if (layout === 'column' || pageAsked) viewport.fitWidth(rect, false);
			else viewport.fitAll(false);
		});
	});

	// A line of the Table of Contents opens its page (#301): presenting, that page is shown; otherwise it comes to the
	// top of the view, across it, as Stack shows a page.
	function goTo(index: number) {
		const rect = rects[index];
		if (!rect) return;
		if (isPresenting) return presentation.go(index);
		viewport.fitWidth(rect);
	}

	function refit() {
		if (layout === 'column') viewport.fitWidth(rects[targetIndex]);
		else viewport.fitAll();
	}

	function choose(mode: LayoutType) {
		if (mode === layout) return;
		if (mode === 'present') return present();
		layout = mode;
		requestAnimationFrame(refit);
	}

	// Presenting: the page shown where it belongs, moved by however far a finger has taken it; a swipe let go slides.
	$effect(() => {
		if (!isPresenting || !isReady) return;
		const zoom = slideZoom;
		const x =
			slideRoom.x +
			(slideRoom.width - W * zoom) / 2 -
			presentation.at * viewport.width +
			presentation.offset;
		const y = slideRoom.y + (slideRoom.height - H * zoom) / 2;
		const isEased = presentation.isEased;
		untrack(() => viewport.moveTo(x, y, zoom, isEased));
	});
	$effect.pre(() => {
		presentation.count = pages.length;
	});

	// Over everything: full screen where the browser allows it (Present asks for it, so it needs the click), and
	// otherwise, or once full screen is left with the bar's button, in the page's top layer, over the header, the panels
	// and the phone's bar. iPhone Safari has no full screen for a page: there it fills the window.
	let root: HTMLDivElement | undefined = $state();
	let isFull = $state(false);
	let isFullAsked = $state(false);
	let isFullKept = false;
	const canFull = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
	const canLift = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
	const isLifted = $derived(isPresenting && !isFull && !isFullAsked && canLift);
	$effect(() => {
		const element = root;
		if (!element || !isLifted) return;
		if (!element.matches(':popover-open')) element.showPopover();
		return () => {
			if (element.matches(':popover-open')) element.hidePopover();
		};
	});

	function askFull() {
		if (!root || !canFull) return;
		if (root.matches(':popover-open')) root.hidePopover();
		isFullAsked = true;
		root.requestFullscreen().catch(() => (isFullAsked = false));
	}

	function toggleFull() {
		if (!isFull) return askFull();
		isFullKept = true;
		document.exitFullscreen().catch(() => {});
	}

	// Esc in full screen leaves full screen, and the presentation with it; the bar's button leaves only full screen.
	function onfullscreenchange() {
		const wasFull = isFull;
		isFull = Boolean(root) && document.fullscreenElement === root;
		isFullAsked = false;
		if (wasFull && !isFull && isPresenting && !isFullKept) leave();
		isFullKept = false;
	}

	// What a phone keeps at the top and the bottom (the clock, the home bar), which the page stays clear of.
	function safeAreaOf() {
		const probe = document.createElement('div');
		probe.style.cssText =
			'position: fixed; visibility: hidden; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)';
		document.body.append(probe);
		const style = getComputedStyle(probe);
		const area = {
			top: parseFloat(style.paddingTop) || 0,
			bottom: parseFloat(style.paddingBottom) || 0
		};
		probe.remove();
		return area;
	}
	$effect(() => {
		if (!isPresenting || !viewport.width || !viewport.height) return;
		safe = safeAreaOf();
	});

	// From the page being read, or the first when every page is on the screen.
	function present() {
		back = layout === 'column' ? 'column' : 'spread';
		const screen = {
			x: viewport.left,
			y: viewport.top,
			width: viewport.width - viewport.left,
			height: viewport.height - viewport.top
		};
		presentation.start(startOf(rects, viewport, screen));
		layout = 'present';
		askFull();
	}

	// Back to Stack or Spread, on the page that was shown, once the preview has its own size again.
	let landing = $state<number>();
	let landTimer: ReturnType<typeof setTimeout> | undefined;
	function leave() {
		if (!isPresenting) return;
		landing = presentation.at;
		presentation.stop();
		layout = back;
		if (isFull) {
			isFullKept = true;
			document.exitFullscreen().catch(() => {});
		}
		clearTimeout(landTimer);
		landTimer = setTimeout(() => (landing = undefined), 600);
	}
	$effect(() => {
		const index = landing;
		const rect = index === undefined ? undefined : rects[index];
		if (!rect || isPresenting || !viewport.width || !viewport.height) return;
		untrack(() => {
			if (layout === 'column') viewport.fitWidth(rect, false);
			else viewport.fitAll(false);
		});
	});

	// Keys while presenting: the arrows and the rest turn the page (presentation.svelte.ts), Esc leaves. They are
	// taken before anything else on the page sees them.
	function onkeydown(event: KeyboardEvent) {
		if (!isPresenting) return;
		if (
			(event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')
		)
			return;
		presentation.wake();
		if (event.key === 'Escape') {
			if (!document.fullscreenElement) leave();
		} else if (event.metaKey || event.ctrlKey || event.altKey || !presentation.key(event.key))
			return;
		event.preventDefault();
		event.stopPropagation();
	}
	onMount(() => () => {
		clearTimeout(landTimer);
		presentation.stop();
	});

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
	// prints them to a PDF with the app's export browser (pdf/+server.ts) and hands the file back. #240: they go in
	// parts that each fit under the host's cap on one request, and the PDFs that come back are joined into one
	// (download.ts); a toast shows how far it is from the click until the file is saved (the library's Toast, #293).
	let canvas: HTMLDivElement | undefined = $state();

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

	// One page as it is sent: its markup as drawn, at the page's own size, its big photos slimmed. #327: an attached
	// PDF's page goes as its empty spot; its own page is put there once the report is printed (`placementsOf`). The
	// marks that say what kind each attachment is stay on the Preview.
	function sheetOf(node: HTMLElement) {
		const copy = node.cloneNode(true) as HTMLElement;
		for (const mark of copy.querySelectorAll('[data-screen-only]')) mark.remove();
		const shown = node.querySelectorAll('img');
		for (const [index, image] of copy.querySelectorAll('img').entries()) {
			if (image.hasAttribute('data-pdf-picture')) {
				image.remove();
				continue;
			}
			const slim = slimOf(shown[index]);
			if (slim) image.src = slim;
		}
		copy.style.cssText = `width: ${W}px; height: ${H}px`;
		copy.classList.remove('ring-4', 'ring-primary/70');
		return copy.outerHTML;
	}

	// Where each attached PDF's page sits on a report page (#327), in the page's own pixels, however far the canvas
	// is zoomed: what the download puts the PDF's own pages in.
	function placementsOf(node: HTMLElement, page: number): PlacementType[] {
		const sheet = node.getBoundingClientRect();
		const scale = sheet.width / W || 1;
		return [...node.querySelectorAll<HTMLElement>('[data-pdf][data-pdf-page]')].map((spot) => {
			const rect = spot.getBoundingClientRect();
			return {
				page,
				box: {
					x: (rect.left - sheet.left) / scale,
					y: (rect.top - sheet.top) / scale,
					width: rect.width / scale,
					height: rect.height / scale
				},
				source: spot.dataset.pdf ?? '',
				at: Number(spot.dataset.pdfPage) - 1
			};
		});
	}

	// How the download reads an attached PDF: its bytes, fetched once, and a page drawn as a JPEG for one whose pages
	// cannot be copied.
	const PDF_READER: PdfReaderType = {
		bytes: bytesOf,
		picture: async (source, page, width) => {
			const blob = await drawPage(await pdfOf(source), page, width);
			return new Uint8Array(await blob.arrayBuffer());
		}
	};

	// Lets the screen draw before the next piece of work: slimming a page's photos holds it still, and a toast that
	// is never drawn says nothing (the "Making the PDF" note that never showed, #240). A hidden tab draws nothing,
	// so the wait there is a short timer.
	function pause() {
		return new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, 50);
			requestAnimationFrame(() => {
				clearTimeout(timer);
				setTimeout(resolve);
			});
		});
	}

	// How far along the bar each stage ends: the pages prepared, the parts printed, the parts joined. The file
	// saved is 100.
	const PREPARED = 25;
	const PRINTED = 88;
	const JOINED = 97;

	async function download() {
		const progress = downloadToast();
		if (progress.isBusy || !canvas) return;
		const nodes = [...canvas.querySelectorAll<HTMLElement>('article[data-page]')];
		const count = nodes.length;
		const filename = `${documentNumber}.pdf`;
		const pagesWord = count === 1 ? '1 page' : `${count} pages`;
		progress.start('Getting the pages ready', PREPARED / Math.max(count, 1));
		try {
			const sheets = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
				.map((node) => node.outerHTML)
				.join('\n');
			const pages: string[] = [];
			const placements: PlacementType[] = [];
			for (const [at, node] of nodes.entries()) {
				progress.reach(
					(PREPARED * at) / count,
					(PREPARED * (at + 1)) / count,
					`Preparing page ${at + 1} of ${count}`
				);
				await pause();
				if (!node.isConnected) {
					throw new DownloadError(
						'The Preview was closed before the PDF was ready. Open it and try again.'
					);
				}
				pages.push(sheetOf(node));
				placements.push(...placementsOf(node, at));
			}
			if (!count) throw new DownloadError('There are no pages to print yet.');

			// Printing: the bar is at the pages whose PDFs are back, and creeps toward those now with the printer.
			const parts = toParts(pages, PART_LIMIT - sizeOf(sheets));
			let sent = 0;
			let back = 0;
			function markOf(done: number) {
				return PREPARED + ((PRINTED - PREPARED) * done) / count;
			}
			const pdfs = await printParts(parts, {
				styles: sheets,
				filename,
				onstart(at) {
					sent += parts[at].length;
					progress.reach(markOf(back), markOf(sent), `Printing ${pagesWord}`);
				},
				ondone(at) {
					back += parts[at].length;
					const label = back < count ? `Printed ${back} of ${pagesWord}` : `Printed ${pagesWord}`;
					progress.reach(markOf(back), markOf(sent), label);
				}
			});

			progress.reach(PRINTED, JOINED, 'Putting the pages together');
			await pause();
			const joined = await joinPdfs(pdfs, filename);
			if (placements.length) progress.reach(PRINTED, JOINED, 'Putting in the attached PDFs');
			const pdf = await placePdfPages(joined, placements, PDF_READER, W);

			progress.reach(JOINED, 100, 'Saving the PDF');
			const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: 'application/pdf' }));
			const link = Object.assign(document.createElement('a'), { href: url, download: filename });
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 60000);
			progress.finish('PDF downloaded');
		} catch (error) {
			if (!(error instanceof DownloadError)) console.error('The PDF download failed.', error);
			progress.fail(
				error instanceof DownloadError ? error.message : 'The PDF could not be made. Try again.',
				download
			);
		}
	}

	let isHintShown = $state(true);
	onMount(() => {
		const timer = setTimeout(() => (isHintShown = false), 4200);
		return () => clearTimeout(timer);
	});

	// Cover A's lines (variants/cover-a.svelte). #217: the customer's own number after its name, the whole team's
	// faces where the Lead's name was, and the project's two dates where Dates was. #225 (Justin, 2026-11-18): the
	// customer leads, then the Project Type and the two dates, then the rest as before; the team is its faces alone.
	const coverLines = $derived([
		{
			icon: PAGE_ICONS.customers,
			label: 'Customer',
			value: company && reference ? `${company} (${reference})` : company
		},
		{
			icon: 'icon-[mdi--package-variant-closed]',
			label: 'Project Type',
			value: detail('Project Type') ?? ''
		},
		{ icon: 'icon-[mdi--calendar-blank-outline]', label: 'Created Date', value: createdDate },
		{ icon: 'icon-[mdi--calendar-check-outline]', label: 'Completed Date', value: completedDate },
		{ icon: PAGE_ICONS.team, label: 'Team Members', value: listOf(people), names: people },
		{
			icon: stops[0] ? iconOf(stops[0]) : PAGE_ICONS.transport,
			label: 'Transport Mode',
			value: transport
		},
		{ icon: PAGE_ICONS.facilities, label: 'Facility', value: facility }
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
			value: company && reference ? `${company} (${reference})` : company,
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
		{ label: 'Created Date', value: createdDate, icon: 'icon-[mdi--calendar-blank-outline]' },
		{ label: 'Completed Date', value: completedDate, icon: 'icon-[mdi--calendar-check-outline]' }
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
				crossorigin={toCrossOrigin(organization.logo)}
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
     no logo gets its initial on a colour circle. The document ID under the name, by a barcode, and under that the
     customer's own number for the job, by an ID card, when it has one (#217, #225). -->
{#snippet customer()}
	<div class="flex min-w-0 items-center gap-2.5">
		{#if client.logo}
			<img
				src={client.logo}
				crossorigin={toCrossOrigin(client.logo)}
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
			{#if reference}
				<p class="flex items-center gap-1 tabular-nums">
					<span class="icon-[mdi--card-account-details-outline] size-2.5 text-slate-950"
					></span><span class="truncate">{reference}</span>
				</p>
			{/if}
		</div>
	</div>
{/snippet}

<!-- The QR code alone: no corners, no logo (run 11). It scans (run 35) and, in the PDF, is a link to click: both
     open this project's Preview at the page the code is on (#216). In the app it is not a link to follow or to
     tab to: the Preview is already on screen. -->
{#snippet code(page: number)}
	{@const link = linkOf(page)}
	<a
		href={link}
		class="block shrink-0"
		draggable="false"
		tabindex="-1"
		onclick={(event) => event.preventDefault()}
	>
		<Qr
			value={link}
			size={44}
		/>
	</a>
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

<!-- Like the HTML email signatures (packages/ui email): the sign-off, a round photo wearing the organization's mark
     as it does on the team cards, the name, the labels as the same blue chips (Justin, 2026-11-19; before that
     blue capitals), then phone, email and the group email. -->
{#snippet signature()}
	<p class="text-[11px] text-slate-950">{organization.signoff}</p>
	{#if signer}
		<div class="mt-6 flex items-start gap-3">
			<Avatar
				name={signer.name}
				size={76}
				ring="ring-transparent"
				hasPresence={false}
				badge={ICON_192}
				badgeScale={0.37}
			/>
			<div class="min-w-0 pt-1.5 text-[9px] leading-[1.5] text-slate-500">
				<p class="text-[17px] leading-tight font-semibold text-slate-950">{signer.name}</p>
				{@render labelChips(labelsOf(signer), true, 'mt-1')}
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

<!-- One way to reach someone (#246): a link to tap in the PDF. In the app it is not followed, like the files line:
     a finger moving the page would start a call by accident. A long address breaks where it must, never cut. -->
{#snippet contactLine(href: string, icon: string, text: string, tone: string)}
	<a
		{href}
		class="flex items-start gap-0.5 text-left {tone}"
		draggable="false"
		tabindex="-1"
		onclick={(event) => event.preventDefault()}
	>
		<span class="{icon} mt-px size-[4.9px] shrink-0 text-slate-950"></span>
		<span class="min-w-0 [overflow-wrap:anywhere]">{text}</span>
	</a>
{/snippet}

<!-- Someone's labels as chips. The organization's own people wear them in blue, light behind dark, so they stand
     out on the card and beside the signature (Justin, 2026-11-19); anyone else's stay white. -->
{#snippet labelChips(labels: string[], isOwn: boolean, layout: string)}
	{#if labels.length}
		<p class="flex flex-wrap gap-0.5 {layout}">
			{#each labels as label (label)}
				<span
					class="rounded-full px-1.5 py-px text-[7px] font-medium {isOwn
						? 'bg-primary/15 text-primary-700'
						: 'bg-white text-slate-600'}">{label}</span
				>
			{/each}
		</p>
	{/if}
{/snippet}

<!-- Someone in attendance: the app's own Avatar, the name, and labels. The organization's people wear its badge
     and show how to reach them (#246; Michael, 2026-11-19: "Full contact details"), from their Team record: the
     phone over the email, as the dashboard's Team list has them. Another company's people show theirs as typed on
     the project (#326). One that is empty is left out. -->
{#snippet personCard(
	name: string,
	labels: string[],
	isLead: boolean,
	badge: string | undefined,
	contact?: { phone: string; email: string }
)}
	{@const phone = contact?.phone.trim()}
	{@const email = contact?.email.trim()}
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
		{@render labelChips(labels, Boolean(badge), 'mt-1 justify-center')}
		{#if phone || email}
			<!-- The two lines start at the same place, in a block that sits in the middle of the card. -->
			<div
				class="mt-1.5 inline-flex max-w-full flex-col items-start gap-px text-[4.9px] leading-tight"
			>
				{#if phone}
					{@render contactLine(
						`tel:${phone.replace(/[^+\d]/g, '')}`,
						'icon-[mdi--phone]',
						phone,
						'text-slate-600'
					)}
				{/if}
				{#if email}
					{@render contactLine(`mailto:${email}`, 'icon-[mdi--email]', email, 'text-slate-500')}
				{/if}
			</div>
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
			crossorigin={toCrossOrigin(photo)}
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

<!-- A photo of the item list (#233; Michael's packing list printed with its sides cut off): the whole picture at its
     own shape, as wide as the page's text at most and never taller than a page has room for under a heading, with
     square corners so nothing at its edges is hidden. One smaller than that prints at its own size. -->
{#snippet picture(file: AttachmentType)}
	<img
		src={file.src}
		crossorigin={toCrossOrigin(file.src)}
		alt={file.name}
		draggable="false"
		class="block max-w-full"
		style="max-height: {PICTURE_ROOM}px"
		onload={measure}
	/>
{/snippet}

<!-- The link to the project's files (#233), beside a page's title: one short line, a link to click in the PDF. In
     the app it is not followed, like the QR code: a finger moving the page would open it by accident, and the
     Operations panel's own arrow opens it. -->
{#snippet filesLine()}
	<a
		href={filesLink}
		target="_blank"
		rel="noopener"
		class="flex shrink-0 items-center gap-1 text-[9.5px] font-semibold text-primary"
		draggable="false"
		tabindex="-1"
		onclick={(event) => event.preventDefault()}
	>
		<span class="icon-[mdi--folder-open-outline] size-3.5"></span>
		<span>{LINK_TITLE}</span>
		<span class="font-medium text-slate-400">· {linkNameOf(filesLink)}</span>
		<span class="icon-[mdi--open-in-new] size-3"></span>
	</a>
{/snippet}

<!-- One block of a flowing section. Room above a block is its own padding, so the heights add up. -->
<!-- One line of the Table of Contents: a section, or one of its parts set in under it. -->
{#snippet contentsLine(line: ContentLineType | undefined)}
	{#if line}
		<!-- A link to the page it names (#301). Here a tap opens that page (`data-tap`: the pages still move from a drag
		     that starts on it). Printed, it is a link to the report link of that page, which the PDF's join turns into
		     a link to the page itself (download.ts). -->
		<li>
			<a
				href={line.to ? toPageLink(linkOf(line.to), line.to) : undefined}
				data-tap
				draggable="false"
				tabindex="-1"
				onclick={(event) => {
					event.preventDefault();
					goTo(line.to - 1);
				}}
				class="group flex items-baseline gap-2 {line.isSub
					? 'py-[3px] pl-8 text-[11px] text-slate-600'
					: 'pt-2.5 pb-[3px] text-[12.5px] font-semibold text-slate-900'}"
			>
				<span class="w-6 shrink-0 font-semibold text-slate-950 tabular-nums">{line.number}</span>
				<span class="group-hover:underline">{line.title}</span>
				<span
					class="h-[3px] min-w-4 flex-1 bg-[radial-gradient(circle,var(--color-slate-400)_0.8px,transparent_1.1px)] bg-size-[7px_3px] bg-bottom bg-repeat-x"
				></span>
				<span class="min-w-5 shrink-0 text-right text-slate-950 tabular-nums">{line.page}</span>
			</a>
		</li>
	{/if}
{/snippet}

{#snippet flowBlock(block: BlockType)}
	{#if block.kind === 'intro'}
		<p class="pt-2 text-[10.5px] leading-relaxed whitespace-pre-line text-slate-600">
			{introduction}
		</p>
	{:else if block.kind === 'strip'}
		<!-- The project in one strip: what it is, who it is for, where they are and when. -->
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
							class="truncate">{customerLocation || 'No location yet'}</span
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
						ICON_192,
						member
					)}
				{:else}
					<p class="col-span-full text-[11px] text-slate-300 italic">No one assigned yet</p>
				{/each}
			</div>
		</div>
	{:else if block.kind === 'company'}
		{@const other = personnel.find((item) => item.id === block.id)}
		{#if other}
			<!-- Anyone else on the job, by company, in the same cards with no badge, and the phone and email typed for
			     them on the project (#326), as a team member's card shows theirs. -->
			<div class="pt-2">
				{@render caption(other.company || 'Other personnel')}
				<div
					class="grid gap-1.5"
					style="grid-template-columns: repeat({teamColumns}, minmax(0, 1fr))"
				>
					{#each other.people as person (person.id)}
						{@render personCard(
							person.name,
							person.title ? [person.title] : [],
							false,
							undefined,
							person
						)}
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
				{@const carrier = carrierOf(leg)}
				{@const photo = carrier?.photo}
				<!-- The Transport Mode page: the transport once, with its own photo across the card when it has one
				     (Justin, 2026-11-18, #225: big enough to see the ship), its particulars, then its facilities. The
				     photo's shape is fixed, so the card measures the same before the picture has loaded. A transport
				     with no photo of its own shows its mode's icon, never a stock picture of some other ship. -->
				<div class="pt-3">
					<section class="overflow-hidden rounded-xl bg-slate-50">
						{#if photo}
							<img
								src={photo}
								crossorigin={toCrossOrigin(photo)}
								alt=""
								draggable="false"
								class="aspect-[2/1] w-full object-cover"
							/>
						{/if}
						<div class="flex items-center gap-3 p-3">
							{#if !photo}
								<span
									class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400"
									><span class="{MODE_ICONS[lead.mode] ?? PAGE_ICONS.transport} size-6"
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
									<dl class="mt-2 grid grid-cols-5 gap-x-3 gap-y-1">
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
											<p>
												{[place?.kind, cityStateOf(place?.city ?? '')].filter(Boolean).join(' · ')}
											</p>
											<!-- A facility's whole address prints on its stop page only (#320). -->
											{#if place && partsOf(place.city).street}<p>{place.city}</p>{/if}
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
										{#if cityStateOf(placeOf(stop.facility)?.city ?? '')}
											<span class="text-slate-500"
												>{cityStateOf(placeOf(stop.facility)?.city ?? '')}</span
											>
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
	{:else if block.kind === 'list'}
		<!-- The item list read from a spreadsheet (#242): always the page's full width, scaled as one block. -->
		{#if itemList && listFit}
			<div class={[block.isFirst && (cargo.length ? 'pt-4' : 'pt-0.5')]}>
				{#if block.part === 'notes'}
					<div class="pb-1 text-[9.5px] leading-snug text-slate-500">
						{#each itemList.notes as note, at (at)}<p>{note}</p>{/each}
					</div>
				{:else}
					<div class="text-[10.5px]">
						<ItemTable
							table={itemList}
							part={block.part}
							fit={listFit}
						/>
					</div>
				{/if}
			</div>
		{/if}
	{:else if block.kind === 'picture'}
		{@const file = pictures.find((item) => item.id === block.id)}
		{#if file}
			<div class="pt-2">{@render picture(file)}</div>
		{/if}
	{:else if block.kind === 'sheet'}
		<!-- #295: a sheet of an Items PDF's pages, laid out like a photo group's photos: one or two across the page, or
		     four, six or eight in two columns, each page whole. Its name stands over it, with which of its sheets this is
		     when it runs on over pages; the download puts the PDF's own pages in the spots. -->
		{@const file = attachments.find((item) => item.id === block.id)}
		{#if file}
			<div class="pt-3">
				<p class="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-700">
					<span class="truncate">{file.name}</span>
					{#if markOf(block.part, block.parts)}<span class="shrink-0"
							>{markOf(block.part, block.parts)}</span
						>{/if}
				</p>
				<div class="mt-2 grid gap-3 {file.layout <= 2 ? 'grid-cols-1' : 'grid-cols-2'}">
					{#each block.pages as page (page)}
						{@const count = pageCountOf(file.src) ?? 1}
						<figure class="relative overflow-hidden rounded">
							<PdfPage
								source={file.src}
								{page}
								class="w-full {SHEET_SIZES[file.layout]}"
							/>
							<!-- What kind of attachment it is, as on a photo group's spots: the Preview's, left out of the download. -->
							<span
								class="pointer-events-none absolute top-1 left-1 z-[1] flex items-center gap-0.5 rounded bg-black/65 p-0.5 pr-1 text-[8px] leading-none font-semibold text-white tabular-nums"
								title={ATTACHMENT_NAMES.pdf}
								data-screen-only
								><span class="{ATTACHMENT_ICONS.pdf} size-3 text-red-400"></span>{count > 1
									? `PDF · ${page} of ${count}`
									: 'PDF'}</span
							>
						</figure>
					{/each}
				</div>
			</div>
		{/if}
	{:else if block.kind === 'attachments'}
		<!-- The item list as it was handed over, when it came as a file: its name. -->
		<div class="flex flex-wrap items-start gap-1.5 pt-2">
			{#each documents as file (file.id)}
				<span
					class="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[9px] text-slate-600"
					><span class="icon-[mdi--file-table-outline] size-3.5 text-primary"
					></span>{file.name}</span
				>
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
	{:else if block.kind === 'note'}
		<!-- The Disclaimer's closing note, as far under the points as they stand under the opening (#275). -->
		<p class="pt-[18px] text-[9.5px] leading-[1.5] text-slate-700">{block.text}</p>
	{:else if block.kind === 'point'}
		<!-- One bullet each: the title on its own line, no colon, its words under it, no lone last word (#275). -->
		{@const point = organization.disclaimer.points.find((item) => item.id === block.id)}
		{#if point}
			<ul class="list-disc pt-1.5 pl-4 text-[9.5px] leading-[1.45] text-pretty text-slate-700">
				<li><b class="block text-slate-900">{point.title}</b>{point.text}</li>
			</ul>
		{/if}
	{:else if block.kind === 'closing'}
		<!-- The line before the sign-off (#275; Justin, 2026-11-22): semibold navy on light blue, on one line that fills
		     the text's width, the blue reaching past the text on each side. Too long for one line, it wraps. -->
		<div class="pt-4">
			<p
				class="-mx-2.5 rounded-lg bg-[#f1f6ff] px-2.5 py-2 leading-[1.5] font-semibold text-[#1f2f5e] {closingSize
					? 'whitespace-nowrap'
					: 'text-[9.5px] text-balance'}"
				style={closingSize ? `font-size: ${closingSize}px` : undefined}
			>
				{block.text}
			</p>
		</div>
	{:else if block.kind === 'empty'}
		<p class="text-[11px] text-slate-300 italic">{block.text}</p>
	{/if}
{/snippet}

<svelte:window onkeydowncapture={onkeydown} />
<svelte:document {onfullscreenchange} />

<!-- Presenting (#324), the preview covers the whole screen: full screen, or the page's top layer. -->
<div
	bind:this={root}
	popover={isLifted ? 'manual' : undefined}
	class="{isPresenting
		? 'fixed inset-0 z-[100] m-0 size-full max-h-none max-w-none border-0 p-0 text-inherit'
		: 'relative h-full'} overflow-hidden {surface} {isPresenting && presentation.isIdle
		? 'cursor-none'
		: ''}"
	{@attach isPresenting && presentation.controls}
>
	<div
		class="absolute inset-0 touch-none select-none [-webkit-touch-callout:none] {isPresenting
			? ''
			: viewport.isMoving
				? 'cursor-grabbing'
				: 'cursor-grab'}"
		bind:clientWidth={viewport.width}
		bind:clientHeight={viewport.height}
		{@attach isPresenting ? presentation.swipe : viewport.gestures}
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
				<!-- Presenting, only the page shown and the two beside it are drawn, and a page moves with no easing. -->
				<article
					class="absolute overflow-hidden bg-white text-slate-800 shadow-[0_1px_3px_rgb(15_23_42/0.08),0_24px_48px_-24px_rgb(15_23_42/0.25)] ring-4 {isPresenting ||
					landing !== undefined
						? ''
						: 'transition-[box-shadow,top,left] duration-300'} {item.key === target && !isPresenting
						? 'ring-primary/70'
						: 'ring-transparent'}"
					style="left: {rect.x}px; top: {rect.y}px; width: {W}px; height: {H}px{isPresenting &&
					Math.abs(index - presentation.at) > 1
						? '; visibility: hidden'
						: ''}"
					data-page={item.key}
				>
					{#if item.kind === 'cover' && isCoverC}
						<!-- Report Cover C (#247; final design #256, Justin, 2026-11-21): the trip drawn as a strip under the subtitle, the login
						     page's wave, and a list without Transport Mode and Facility. The top part stands on a fixed line
						     above the wave and the strip has the same room whatever the trip, so the logo, title and subtitle
						     are in the same place for every trip. -->
						<div
							class="absolute inset-0 flex flex-col items-center justify-end px-3.5 text-center"
							style="padding-bottom: {coverReserved}px"
						>
							{#if organization.logo}
								<img
									src={organization.logo}
									crossorigin={toCrossOrigin(organization.logo)}
									alt=""
									class="flex-none object-contain"
									style="width: {coverLogo}px; height: {coverLogo}px"
								/>
							{/if}
							<p
								class="mt-8 max-w-[499px] text-[34px] leading-tight font-bold tracking-tight text-balance text-slate-950 uppercase"
								bind:offsetHeight={coverTitleHeight}
							>
								{detail('Title') || 'Untitled project'}
							</p>
							<p class="mt-[9px] min-h-7 text-lg leading-7 text-slate-500">{detail('Subtitle')}</p>
							<div
								class="mt-3.5 flex-none self-stretch"
								bind:offsetHeight={coverStripHeight}
							>
								<Trip legs={stripLegs} />
							</div>
						</div>
						<div
							class="absolute inset-x-0 bottom-0 flex min-h-[200px] flex-col justify-end bg-slate-100 pt-6 pb-12"
							bind:offsetHeight={coverBandHeight}
						>
							<svg
								class="absolute -top-[59px] left-0 h-[60px] w-full fill-slate-100"
								viewBox="0 0 1200 120"
								preserveAspectRatio="none"
								aria-hidden="true"
								><path
									d="M1200,0v120H0C41,68.89,288.87-55.15,578.87,30.29c178.24,53.05,440.37,74.74,621.13-30.29Z"
								/></svg
							>
							<CoverC lines={coverListC} />
						</div>
					{:else if item.kind === 'cover'}
						<div class="flex h-full flex-col items-center text-center">
							<div class="flex flex-1 flex-col items-center justify-center px-12 pb-36">
								{#if organization.logo}
									<img
										src={organization.logo}
										crossorigin={toCrossOrigin(organization.logo)}
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
							<!-- The list stands on the band's floor, a fixed gap above the page's edge, and grows upward: a longer
							     list pushes the band's top (and its wave) up, never its own foot off the page (#225). -->
							<div
								class="absolute inset-x-0 bottom-0 flex min-h-60 flex-col justify-end bg-slate-100 pt-6 pb-12"
							>
								<svg
									class="absolute -top-[59px] h-[60px] w-full fill-slate-100"
									viewBox="0 0 1200 120"
									preserveAspectRatio="none"
									><path
										d="M0,92.7V120h1200V24.2c-67.8-23.1-144.3-15.5-214.3,3C906.7,48,823.8,89,743.8,105.8 c-82.3,17.3-168.1,16.3-250.5-0.4c-57.8-11.7-114-31.1-172-41.9C213.6,43.7,102.5,53.8,0,92.7z"
									/></svg
								>
								<!-- The cover's list (look.constants.ts): A is the one column, B the two with pictures. -->
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
								{@render code(index + 1)}
							</div>
							<div class="mt-3 h-px bg-slate-900/15"></div>
						</header>
						<div class="px-10 pt-6">
							<!-- The link to the project's files stands beside the title of the Project Report's first page and of
							     the Operations panel's first (#233), where it takes no room from what is under it. -->
							<div class="flex items-baseline justify-between gap-4">
								<h2 class="min-w-0 text-[24px] font-bold tracking-tight text-slate-950">
									{item.title}
								</h2>
								{#if filesLink && hasFilesLine(item, index)}{@render filesLine()}{/if}
							</div>
							{#if item.columns}
								<!-- The Disclaimer (#275): the opening, its points in two columns that end level (what is left
								     over spread between the shorter side's points), drawn smaller when the page is too full,
								     then the note and the thank-you at their own size. -->
								{#each item.blocks ?? [] as block, at (at)}{@render flowBlock(block)}{/each}
								<div style="padding-top: {LIST_GAP}px">
									<div
										class="flex"
										style="gap: {COLUMN_GAP}px{item.fit && item.fit < 1
											? `; zoom: ${item.fit}`
											: ''}"
									>
										{#each item.columns as side, at (at)}
											<div class="flex min-w-0 flex-1 flex-col justify-between">
												{#each side as block, blockAt (blockAt)}{@render flowBlock(block)}{/each}
											</div>
										{/each}
									</div>
								</div>
								{#each item.after ?? [] as block, at (at)}{@render flowBlock(block)}{/each}
							{:else if item.blocks}
								{#each item.blocks as block, at (at)}{@render flowBlock(block)}{/each}
							{:else if item.kind === 'contents'}
								<ol class="mt-4">
									{#each item.lines ?? [] as at (at)}{@render contentsLine(contentLines[at])}{/each}
								</ol>
							{:else if item.kind === 'report'}
								<p class="mt-2 text-[10.5px] leading-relaxed text-slate-600">
									<b class="text-slate-900">Introduction.</b>
									{introduction}
								</p>
								<!-- The project in one strip: what it is, who it is for, where they are and when. -->
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
													crossorigin={toCrossOrigin(client.icon)}
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
											></span><span class="truncate">{customerLocation || 'No location yet'}</span>
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
												crossorigin={toCrossOrigin(personOf(name).photo)}
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
												{@render picture(file)}
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
														{[place?.kind, cityStateOf(place?.city ?? '')]
															.filter(Boolean)
															.join(' · ')}
													</p>
													{#if place && partsOf(place.city).street}<p
															class="truncate text-slate-500"
														>
															{place.city}
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
								<!-- #327: a PDF's pages each take a spot, so they fill the layout as photos do. -->
								{@const shown = spotsOf(group.photos).slice(
									(item.part ?? 0) * group.layout,
									((item.part ?? 0) + 1) * group.layout
								)}
								<!-- A stage of the Operations panel wears its number before its title, white in a black circle
								     (Justin, 2026-11-19): the number it has in the panel, by the stages' order. -->
								{@const stageNumber =
									item.panel.key === 'operations'
										? stageNumbersOf(item.panel.groups)[item.group ?? 0]
										: undefined}
								<p class="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
									{#if stageNumber}
										<span
											class="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] leading-none font-bold text-white tabular-nums"
											>{stageNumber}</span
										>
									{/if}
									{groupTitle(item.panel, item.group ?? 0)}
									<!-- A group whose photos run over pages says which of its own pages this is (#259). -->
									{markOf(item.part ?? 0, item.parts ?? 1)}
								</p>
								{#if group.description && !item.part}
									<p class="mt-1 text-[11px] text-slate-500">{group.description}</p>
								{/if}
								<div class="mt-4 grid gap-3 {group.layout <= 2 ? 'grid-cols-1' : 'grid-cols-2'}">
									{#each shown as { key, photo, page } (key)}
										<!-- #312: the photo as it is cropped for this spot, placed in percentages so the PDF prints it the same. -->
										<!-- #327: a PDF's page shown whole; a video as its thumbnail with a play button and its length, a
										     link that opens the video in the app (the PDF cannot play it). -->
										{@const hasDescription = Boolean(photo.description) && page === 1}
										{@const kind = photo.kind ?? 'photo'}
										{@const arrived =
											kind === 'photo'
												? toTypeLabel(fileDetailsOf(photo.src)?.original.type ?? '')
												: ''}
										<figure class="relative overflow-hidden rounded">
											<!-- A PDF still on its way has no stored file yet: its first page shows its picture, whole, and
											     its other pages wait as quiet placeholders. -->
											{#if photo.kind === 'pdf'}
												<PdfPage
													source={photo.source ?? ''}
													{page}
													picture={photo.src}
													class="w-full {PHOTO_SIZES[group.layout]}"
												/>
											{:else if photo.kind === 'video'}
												<a
													href={videoLinkOf(photo.source)}
													target="_blank"
													rel="noopener"
													class="relative block"
													aria-label="Play the video{photo.description
														? `: ${photo.description}`
														: ''}"
												>
													<Photo
														src={photo.src}
														crossorigin={toCrossOrigin(photo.src)}
														crop={photo.crop}
														class="w-full {PHOTO_SIZES[group.layout]}"
													/>
													<span class="absolute inset-0 flex items-center justify-center">
														<span
															class="flex items-center justify-center rounded-full bg-black/55 text-white {group.layout <=
															2
																? 'size-14'
																: 'size-9'}"
															><span
																class="icon-[mdi--play] {group.layout <= 2 ? 'size-9' : 'size-6'}"
															></span></span
														>
													</span>
													{#if toLengthLabel(photo.duration)}
														<span
															class="absolute right-1.5 bottom-1.5 z-[1] rounded bg-black/70 px-1 py-px text-[8px] leading-tight font-semibold text-white tabular-nums"
															>{toLengthLabel(photo.duration)}</span
														>
													{/if}
												</a>
											{:else}
												<Photo
													src={photo.src}
													crossorigin={toCrossOrigin(photo.src)}
													crop={photo.crop}
													class="w-full {PHOTO_SIZES[group.layout]}"
												/>
											{/if}
											<!-- #327: what kind of attachment each spot holds, at a glance (Justin, 2026-11-25): a mark on
											     the Preview only, left out of the download (sheetOf), so the report the client reads stays clean.
											     #349: a photo by the type it arrived as. -->
											<span
												class="pointer-events-none absolute top-1 left-1 z-[1] flex items-center gap-0.5 rounded bg-black/65 p-0.5 text-[8px] leading-none font-semibold text-white tabular-nums {kind ===
													'photo' && !arrived
													? ''
													: 'pr-1'}"
												title={arrived ? `${arrived} photo` : ATTACHMENT_NAMES[kind]}
												data-screen-only
												><span
													class="{ATTACHMENT_ICONS[kind]} size-3 {kind === 'pdf'
														? 'text-red-400'
														: ''}"
												></span>{kind === 'pdf'
													? (photo.pageCount ?? 1) > 1
														? `PDF · ${page} of ${photo.pageCount}`
														: 'PDF'
													: kind === 'video'
														? 'Video'
														: arrived}</span
											>
											{#if hasDescription}
												<figcaption
													class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/40 to-transparent px-2 pt-5 pb-1.5 font-medium text-white {group.layout <=
													2
														? 'text-[10px]'
														: 'truncate text-[8px]'} {photo.kind === 'video' ? 'pr-10' : ''}"
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
							<!-- It is never drawn smaller (Justin, 2026-11-22). -->
							<div class="absolute inset-x-10 bottom-[96px]">{@render signature()}</div>
						{/if}
						<footer
							class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-white px-10 pt-3 pb-6 text-[9px] text-slate-400"
						>
							{@render customer()}
							<!-- At the footer's bottom right (Justin, 2026-11-22). -->
							<span class="shrink-0 self-end">Page {index + 1} of {pages.length}</span>
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
		<!-- The Table of Contents' lines, each read to deal them out over its pages (#277). -->
		<ol data-flow="contents">
			{#each contentLines as line, at (at)}{@render contentsLine(line)}{/each}
		</ol>
		<div data-signature>{@render signature()}</div>
		<!-- The Disclaimer's points, each read at the width of its column for each size tried (#275); set apart so
		     trying sizes never resizes the measurer. -->
		{#if isDisclaimerB}
			<div
				data-points
				class="absolute top-0 left-0"
			>
				{#each organization.disclaimer.points as point (point.id)}
					<div>{@render flowBlock({ kind: 'point', id: point.id })}</div>
				{/each}
			</div>
		{/if}
		<!-- The thank-you on one line at 100 px, to read the size that sets it across the text's width (#275). -->
		{#if organization.closing}
			<span
				data-closing
				class="block w-max text-[100px] font-semibold whitespace-nowrap"
				>{organization.closing}</span
			>
		{/if}
		<!-- The item list whole, at its natural width, to read how it fits the page (#242). -->
		{#if itemList}
			<div class="text-[10.5px]">
				{#key listKey}
					<ItemTable
						table={itemList}
						room={W - 80}
						onfit={(fit) => fitList(listKey, fit)}
					/>
				{/key}
			</div>
		{/if}
	</div>

	{#if isPresenting}
		<PageStrip
			{canvas}
			{pages}
			at={presentation.at}
			isWide={viewport.isWide}
			ongo={(index) => presentation.go(index)}
			bind:height={stripHeight}
		/>
		<!-- The page number, in the bottom right corner (Justin, 2026-11-25), over the strip and clear of the bar. -->
		<p
			class="pointer-events-none absolute z-[2] rounded-full bg-black/80 px-[11px] py-[5px] text-xs font-semibold text-white tabular-nums transition-opacity duration-500 {presentation.isIdle
				? 'opacity-35'
				: ''}"
			style="right: {viewport.isWide ? 20 : 76}px; bottom: {stripHeight +
				(viewport.isWide ? 24 : 12)}px"
			aria-live="polite"
			aria-label="Page {presentation.at + 1} of {pages.length}"
		>
			{presentation.at + 1}<span class="text-white/60">{` / ${pages.length}`}</span>
		</p>
		<div
			class="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
		>
			<PresentBar
				{presentation}
				{isFull}
				{canFull}
				onexit={leave}
				onfull={toggleFull}
			/>
		</div>
	{:else}
		<div
			class="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
		>
			<ZoomBar
				{viewport}
				{layout}
				onfit={refit}
				onmode={choose}
				ondownload={download}
			/>
		</div>
	{/if}

	<p
		hidden={isPresenting}
		style="left: {left + 16}px"
		class="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+76px)] flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur transition-opacity duration-500 md:bottom-4 {isHintShown
			? 'opacity-100'
			: 'opacity-0 md:opacity-100'}"
	>
		<span class="icon-[mdi--cursor-move] size-4 text-primary"></span>
		{#if isHintShown}Drag anywhere · pinch or ⌘ + scroll to zoom{:else}{pages.length} pages · {documentNumber}{/if}
	</p>
</div>
