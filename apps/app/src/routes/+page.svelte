<script lang="ts">
	import { Grid, Logo, Button, Input, Link, Content, Text, Divider, mq } from '@layerd/ui';
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';

	type Tab = 'create' | 'preview';
	type SectionType = 'cover' | 'time-log' | 'photos';
	type SectionPlacement = 'start' | 'middle' | 'end';
	type ExportFormat = (typeof exportFormats)[number];

	interface SectionBase {
		id: string;
		title: string;
		icon: string;
		open: boolean;
		locked: boolean;
		placement: SectionPlacement;
		photos: PhotoItem[];
	}

	interface PhotoItem {
		id: string;
		name: string;
		caption: string;
		src: string;
		width: number;
		height: number;
	}

	interface DetailsFields {
		reportTitle: string;
		facilityName: string;
		startDate: string;
		endDate: string;
		clientName: string;
		preparedBy: string;
		documentId: string;
	}

	interface CoverSection extends SectionBase {
		type: 'cover';
		fields: DetailsFields;
	}

	interface TimeEntry {
		id: string;
		time: string;
		text: string;
	}

	interface TimeDay {
		id: string;
		dateISO: string;
		entries: TimeEntry[];
	}

	interface TimeLogSection extends SectionBase {
		type: 'time-log';
		days: TimeDay[];
	}

	interface PhotosSection extends SectionBase {
		type: 'photos';
		description: string;
	}

	type Section = CoverSection | TimeLogSection | PhotosSection;

	interface PersistedState {
		activeTab: Tab;
		previewZoom: number;
		hasUserZoomed: boolean;
		sections: Section[];
	}

	interface SectionMetrics {
		done: number;
		total: number;
		percent: number;
	}

	interface TouchReorderOptions {
		itemId: string;
		scopeId?: string;
		activate: () => void;
		hover: (targetId: string) => void;
		clearHover: () => void;
		commit: (targetId: string) => void;
		finish: () => void;
		resolveTarget: (clientX: number, clientY: number, scopeId?: string) => string | undefined;
	}

	interface ActiveTouchReorder {
		options: TouchReorderOptions;
		startX: number;
		startY: number;
		active: boolean;
		currentTargetId: string;
		timerId: ReturnType<typeof setTimeout> | null;
	}

	type SectionStatus = 'todo' | 'in-progress' | 'complete';
	type PhotoOrientation = 'portrait' | 'landscape' | 'square';

	interface SectionTemplate<T extends Section = Section> {
		id: string;
		type: T['type'];
		title: string;
		icon: string;
		placement: Exclude<SectionPlacement, 'middle'>;
		create: () => T;
	}

	const storageKey = 'survey-report-mvp-v3';
	const exportFormats = ['PDF', 'DOCX', 'HTML', 'MD'] as const;
	const metricStatusCaptionClass = 'text-[11px] uppercase tracking-[0.16em]';
	const progressFillClass = 'h-full rounded-full bg-green-500 transition-all duration-300';
	const overallProgressRingRadius = 38;
	const overallProgressRingCircumference = 2 * Math.PI * overallProgressRingRadius;
	const previewPageWidth = 8.5 * 96;
	const previewPageHeight = 11 * 96;
	const previewZoomMin = 0.1;
	const previewZoomMax = 1;
	const previewDesktopPadding = 28;
	const previewMobilePadding = 32;
	const previewMobileGap = 16;
	const previewMobileVisiblePages = 1.5;
	const touchReorderHoldDelay = 220;
	const touchReorderMoveTolerance = 10;
	const detailFields: Array<{
		key: keyof DetailsFields;
		label: string;
		type?: 'text' | 'date';
		placeholder?: string;
	}> = [
		{ key: 'reportTitle', label: 'Report Title' },
		{ key: 'facilityName', label: 'Facility Name' },
		{ key: 'startDate', label: 'Start Date', type: 'date' },
		{ key: 'endDate', label: 'End Date', type: 'date' },
		{ key: 'clientName', label: 'Client Name' },
		{ key: 'preparedBy', label: 'Prepared By' },
		{ key: 'documentId', label: 'Document ID' }
	];

	let idCounter = 0;

	const nextId = (prefix: string) => {
		idCounter += 1;
		return `${prefix}-${idCounter}`;
	};

	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
	const toPercent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'survey-report';
	const createTimeEntry = (): TimeEntry => ({ id: nextId('entry'), time: '', text: '' });
	const createTimeDay = (): TimeDay => ({ id: nextId('day'), dateISO: '', entries: [createTimeEntry()] });

	const createCoverSection = (): CoverSection => ({
		id: 'section-cover-page',
		type: 'cover',
		title: 'Cover Page',
		icon: '📄',
		open: false,
		locked: true,
		placement: 'start',
		fields: {
			reportTitle: 'Survey Report',
			facilityName: '',
			startDate: '',
			endDate: '',
			clientName: '',
			preparedBy: "Justin O'Neill",
			documentId: 'DOC-001'
		},
		photos: []
	});
	const createTimeLogSection = (): TimeLogSection => ({
		id: 'section-time-log',
		type: 'time-log',
		title: 'Time Log',
		icon: '⏱️',
		open: false,
		locked: true,
		placement: 'start',
		days: [createTimeDay()],
		photos: []
	});
	const createOutroSection = (): PhotosSection => ({
		id: 'section-outro',
		type: 'photos',
		title: 'Outro',
		icon: '🏁',
		open: false,
		locked: true,
		placement: 'end',
		description: '',
		photos: []
	});
	const createPhotoSection = (title: string, icon: string, open = false): PhotosSection => ({
		id: nextId('section'),
		type: 'photos',
		title,
		icon,
		open,
		locked: false,
		placement: 'middle',
		description: '',
		photos: []
	});
	const createInitialMiddleSections = () => [
		createPhotoSection('Section 1', '🧩'),
		createPhotoSection('Section 2', '🧩'),
		createPhotoSection('Section 3', '🧩')
	];
	const fixedSectionTemplates: SectionTemplate[] = [
		{
			id: 'section-cover-page',
			type: 'cover',
			title: 'Cover Page',
			icon: '📄',
			placement: 'start',
			create: createCoverSection
		},
		{
			id: 'section-time-log',
			type: 'time-log',
			title: 'Time Log',
			icon: '⏱️',
			placement: 'start',
			create: createTimeLogSection
		},
		{
			id: 'section-outro',
			type: 'photos',
			title: 'Outro',
			icon: '🏁',
			placement: 'end',
			create: createOutroSection
		}
	];
	const fixedSectionIds = new Set(fixedSectionTemplates.map((section) => section.id));
	const fixedSectionTemplateById = new Map(fixedSectionTemplates.map((section) => [section.id, section]));

	const createDefaultState = (): PersistedState => ({
		activeTab: 'create',
		previewZoom: 1,
		hasUserZoomed: false,
		sections: orderSections([
			fixedSectionTemplates[0].create(),
			fixedSectionTemplates[1].create(),
			...createInitialMiddleSections(),
			fixedSectionTemplates[2].create()
		])
	});

	const baseState = createDefaultState();

	let activeTab = $state<Tab>(baseState.activeTab);
	let previewZoom = $state(baseState.previewZoom);
	let hasUserZoomed = $state(baseState.hasUserZoomed);
	let sections = $state<Section[]>(baseState.sections);
	let dragId = $state('');
	let dropId = $state('');
	let photoDropId = $state('');
	let photoDragSectionId = $state('');
	let photoDragId = $state('');
	let photoReorderTargetId = $state('');
	let hydrated = $state(false);
	let previewViewport = $state<HTMLDivElement | null>(null);
	let previewPages = $state<HTMLDivElement | null>(null);
	let pinch = $state<{ startDist: number; startZoom: number; midY: number } | null>(null);
	let isExporting = $state(false);
	let activeTouchReorder: ActiveTouchReorder | null = null;
	let touchReorderListenersAttached = false;
	let suppressSectionToggleId = '';
	let suppressSectionToggleUntil = 0;

	const isDesktop = $derived(!mq.sm);
	const overallMetrics = $derived(getOverallMetrics(sections));
	const reportSection = $derived(sections.find((section) => section.type === 'cover') as CoverSection | undefined);
	const exportFileName = $derived(`${slugify(reportSection?.fields.reportTitle || 'survey-report')}.pdf`);
	const previewContentSections = $derived(sections.filter((section) => section.type !== 'cover'));
	const tableOfContentsEntries = $derived([
		{ id: 'toc-cover', title: reportSection?.title || 'Cover Page', page: 1 },
		{ id: 'toc-index', title: 'Table of Contents', page: 2 },
		...previewContentSections.map((section, index) => ({
			id: `toc-${section.id}`,
			title: section.title,
			page: index + 3
		}))
	]);
	const coverMeta = $derived([
		{ label: 'Facility', value: reportSection?.fields.facilityName || '—' },
		{
			label: 'Dates',
			value:
				reportSection?.fields.startDate && reportSection?.fields.endDate
					? `${reportSection.fields.startDate} to ${reportSection.fields.endDate}`
					: '—'
		},
		{ label: 'Client', value: reportSection?.fields.clientName || '—' },
		{ label: 'Prepared By', value: reportSection?.fields.preparedBy || '—' },
		{ label: 'Document ID', value: reportSection?.fields.documentId || '—' }
	]);
	const customSectionCount = $derived(sections.filter((section) => section.placement === 'middle').length);

	function isSectionMovable(section: Section) {
		return !section.locked && section.placement === 'middle';
	}

	function orderSections(items: Section[]) {
		const middleSections = items.filter((section) => !fixedSectionIds.has(section.id));

		return fixedSectionTemplates
			.filter((section) => section.placement === 'start')
			.map((section) => items.find((item) => item.id === section.id) ?? section.create())
			.concat(middleSections)
			.concat(
				fixedSectionTemplates
					.filter((section) => section.placement === 'end')
					.map((section) => items.find((item) => item.id === section.id) ?? section.create())
			);
	}

	function applyState(next: PersistedState) {
		activeTab = next.activeTab;
		previewZoom = next.previewZoom;
		hasUserZoomed = next.hasUserZoomed;
		sections = next.sections;
	}

	function syncIdCounterFromSections(items: Section[]) {
		let maxId = idCounter;

		for (const section of items) {
			for (const value of [section.id, ...section.photos.map((photo) => photo.id)]) {
				const match = value.match(/(\d+)$/);
				if (match) maxId = Math.max(maxId, Number(match[1]));
			}

			if (section.type === 'time-log') {
				for (const day of section.days) {
					const dayMatch = day.id.match(/(\d+)$/);
					if (dayMatch) maxId = Math.max(maxId, Number(dayMatch[1]));

					for (const entry of day.entries) {
						const entryMatch = entry.id.match(/(\d+)$/);
						if (entryMatch) maxId = Math.max(maxId, Number(entryMatch[1]));
					}
				}
			}
		}

		idCounter = maxId;
	}

	function normalizeTimeEntry(value: unknown): TimeEntry {
		return {
			id: typeof (value as TimeEntry)?.id === 'string' ? (value as TimeEntry).id : nextId('entry'),
			time: String((value as TimeEntry)?.time || ''),
			text: String((value as TimeEntry)?.text || '')
		};
	}

	function normalizeTimeDay(value: unknown): TimeDay {
		const entries = Array.isArray((value as TimeDay)?.entries)
			? (value as TimeDay).entries.map(normalizeTimeEntry)
			: [createTimeEntry()];

		return {
			id: typeof (value as TimeDay)?.id === 'string' ? (value as TimeDay).id : nextId('day'),
			dateISO: String((value as TimeDay)?.dateISO || ''),
			entries: entries.length ? entries : [createTimeEntry()]
		};
	}

	function normalizePhotoItem(value: unknown): PhotoItem {
		return {
			id: typeof (value as PhotoItem)?.id === 'string' ? (value as PhotoItem).id : nextId('photo'),
			name: String((value as PhotoItem)?.name || 'Photo'),
			caption: String((value as PhotoItem)?.caption || (value as PhotoItem)?.name || 'Photo'),
			src: String((value as PhotoItem)?.src || ''),
			width: Math.max(0, Number((value as PhotoItem)?.width || 0)),
			height: Math.max(0, Number((value as PhotoItem)?.height || 0))
		};
	}

	function normalizeSection(value: unknown, index: number): Section {
		const section = value as Partial<Section> & {
			fields?: Partial<DetailsFields>;
			days?: TimeDay[];
			photos?: PhotoItem[];
			locked?: boolean;
			placement?: SectionPlacement;
		};
		const template = typeof section.id === 'string' ? fixedSectionTemplateById.get(section.id) : undefined;
		const photos = Array.isArray(section.photos) ? section.photos.map(normalizePhotoItem).filter((photo) => photo.src) : [];

		if (section.type === 'cover') {
			return {
				id: typeof section.id === 'string' ? section.id : 'section-cover-page',
				type: 'cover',
				title: typeof section.title === 'string' ? section.title : template?.title || 'Cover Page',
				icon: typeof section.icon === 'string' ? section.icon : template?.icon || '📄',
				open: Boolean(section.open),
				locked: template ? true : Boolean(section.locked),
				placement: template?.placement || section.placement || 'middle',
				fields: {
					reportTitle: String(section.fields?.reportTitle || 'Survey Report'),
					facilityName: String(section.fields?.facilityName || ''),
					startDate: String(section.fields?.startDate || ''),
					endDate: String(section.fields?.endDate || ''),
					clientName: String(section.fields?.clientName || ''),
					preparedBy: String(section.fields?.preparedBy || "Justin O'Neill"),
					documentId: String(section.fields?.documentId || 'DOC-001')
				},
				photos
			};
		}

		if (section.type === 'time-log') {
			const days = Array.isArray(section.days) ? section.days.map(normalizeTimeDay) : [createTimeDay()];

			return {
				id: typeof section.id === 'string' ? section.id : 'section-time-log',
				type: 'time-log',
				title: typeof section.title === 'string' ? section.title : template?.title || 'Time Log',
				icon: typeof section.icon === 'string' ? section.icon : template?.icon || '⏱️',
				open: Boolean(section.open),
				locked: template ? true : Boolean(section.locked),
				placement: template?.placement || section.placement || 'middle',
				days: days.length ? days : [createTimeDay()],
				photos
			};
		}

		return {
			id: typeof section.id === 'string' ? section.id : nextId('section'),
			type: 'photos',
			title: typeof section.title === 'string' ? section.title : template?.title || `New Section ${index + 1}`,
			icon: typeof section.icon === 'string' ? section.icon : template?.icon || '🧩',
			open: Boolean(section.open),
			locked: template ? true : Boolean(section.locked),
			placement: template?.placement || section.placement || 'middle',
			description: String((section as PhotosSection)?.description || ''),
			photos
		};
	}

	function loadState(): PersistedState {
		if (!browser) return createDefaultState();

		try {
			const saved = localStorage.getItem(storageKey);
			if (!saved) return createDefaultState();

			const parsed = JSON.parse(saved) as Partial<PersistedState>;
			const next = createDefaultState();
			const parsedSections = Array.isArray(parsed.sections)
				? parsed.sections.filter(
					(section) =>
						(section as { id?: string; type?: string }).id !== 'section-table-of-contents' &&
						(section as { id?: string; type?: string }).type !== 'toc'
				)
				: next.sections;
			const normalizedSections = orderSections(parsedSections.map(normalizeSection));
			const hasOpenSection = normalizedSections.some((section) => section.open);

			return {
				activeTab: parsed.activeTab === 'preview' ? 'preview' : 'create',
				previewZoom: typeof parsed.previewZoom === 'number' ? parsed.previewZoom : 1,
				hasUserZoomed: typeof parsed.hasUserZoomed === 'boolean' ? parsed.hasUserZoomed : false,
				sections: hasOpenSection ? normalizedSections : normalizedSections.map((section) => ({ ...section, open: false }))
			};
		} catch {
			return createDefaultState();
		}
	}

	function getSectionMetrics(section: Section): SectionMetrics {
		if (section.type === 'cover') {
			const done = detailFields.reduce((count, field) => count + (String(section.fields[field.key] || '').trim() ? 1 : 0), 0);
			const total = detailFields.length;
			return { done, total, percent: toPercent(done, total) };
		}

		if (section.type === 'time-log') {
			let done = 0;
			let total = 0;

			for (const day of section.days) {
				total += 1;
				if (String(day.dateISO || '').trim()) done += 1;

				for (const entry of day.entries) {
					total += 2;
					if (String(entry.time || '').trim()) done += 1;
					if (String(entry.text || '').trim()) done += 1;
				}
			}

			const safeTotal = Math.max(1, total);
			return { done, total: safeTotal, percent: toPercent(done, safeTotal) };
		}

		const done =
			Number(Boolean(section.title.trim())) +
			Number(Boolean(section.description.trim())) +
			Number(section.photos.length > 0);
		const total = 3;
		return { done, total, percent: toPercent(done, total) };
	}

	function getOverallMetrics(items: Section[]): SectionMetrics {
		let done = 0;
		let total = 0;

		for (const section of items) {
			const metrics = getSectionMetrics(section);
			done += metrics.done;
			total += metrics.total;
		}

		return { done, total, percent: clamp(toPercent(done, total), 0, 100) };
	}

	function getSectionStatus(metrics: SectionMetrics): SectionStatus {
		if (metrics.percent <= 0) return 'todo';
		if (metrics.percent >= 100) return 'complete';
		return 'in-progress';
	}

	function getSectionStatusLabel(metrics: SectionMetrics) {
		const status = getSectionStatus(metrics);

		if (status === 'todo') return 'TO DO';
		if (status === 'complete') return 'COMPLETE';
		return 'IN PROGRESS';
	}

	function getSectionStatusTextClass(metrics: SectionMetrics) {
		const status = getSectionStatus(metrics);

		if (status === 'todo') return 'text-slate-400';
		if (status === 'complete') return 'text-green-600';
		return 'text-primary-500';
	}

	function getSectionProgressFillClass(metrics: SectionMetrics) {
		const status = getSectionStatus(metrics);

		if (status === 'todo') return 'bg-secondary-300';
		if (status === 'complete') return 'bg-accent-500';
		return 'bg-primary';
	}

	function getProgressRingOffset(percent: number) {
		const normalized = clamp(percent, 0, 100);
		return overallProgressRingCircumference * (1 - normalized / 100);
	}

	function toggleSection(sectionId: string) {
		const current = sections.find((section) => section.id === sectionId);
		if (!current) return;

		const nextOpen = !current.open;
		for (const section of sections) {
			section.open = section.id === sectionId ? nextOpen : false;
		}
	}

	function addSection() {
		const nextNumber = getNextCustomSectionNumber();
		const insertIndex = sections.findIndex((section) => section.placement === 'end');
		for (const section of sections) section.open = false;

		const nextSection = createPhotoSection(`Section ${nextNumber}`, '🧩', false);
		if (insertIndex === -1) {
			sections.push(nextSection);
			return;
		}

		sections.splice(insertIndex, 0, nextSection);
	}

	function getNextCustomSectionNumber() {
		const currentMax = sections.reduce((max, section) => {
			if (section.placement !== 'middle') return max;

			const match = section.title.match(/^Section\s+(\d+)$/i);
			return match ? Math.max(max, Number(match[1])) : max;
		}, 0);

		return currentMax + 1;
	}

	function removeSection(sectionId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.locked || section.placement !== 'middle' || !browser) return;

		const okay = window.confirm(`Delete ${section.title}? This cannot be undone.`);
		if (!okay) return;

		sections = sections.filter((item) => item.id !== sectionId);

		if (dragId === sectionId || dropId === sectionId) clearDragState();
		if (photoDropId === sectionId) photoDropId = '';
	}

	function handleRemoveSectionClick(event: MouseEvent, sectionId: string) {
		event.stopPropagation();
		removeSection(sectionId);
	}

	function ensureAtLeastOneDay(section: TimeLogSection) {
		if (!section.days.length) section.days = [createTimeDay()];
	}

	function ensureAtLeastOneEntry(day: TimeDay) {
		if (!day.entries.length) day.entries = [createTimeEntry()];
	}

	function addDay(section: TimeLogSection) {
		section.days.push(createTimeDay());
	}

	function removeDay(section: TimeLogSection, dayId: string) {
		section.days = section.days.filter((day) => day.id !== dayId);
		ensureAtLeastOneDay(section);
	}

	function addEntry(day: TimeDay) {
		day.entries.push(createTimeEntry());
	}

	function maybeAddEntry(day: TimeDay, entryId: string) {
		const entryIndex = day.entries.findIndex((entry) => entry.id === entryId);
		if (entryIndex === -1 || entryIndex !== day.entries.length - 1) return;

		const entry = day.entries[entryIndex];
		const timeValue = String(entry.time ?? '').trim();
		const textValue = String(entry.text ?? '').trim();
		if (!timeValue || !textValue) return;

		addEntry(day);
	}

	function handleActivityKeyup(day: TimeDay, entryId: string, event?: KeyboardEvent) {
		if (event?.key !== 'Enter') return;

		event.preventDefault();
		maybeAddEntry(day, entryId);
	}

	function removeEntry(day: TimeDay, entryId: string) {
		day.entries = day.entries.filter((entry) => entry.id !== entryId);
		ensureAtLeastOneEntry(day);
	}

	function fileToDataUrl(file: File) {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result || ''));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	function loadImageDimensions(src: string) {
		return new Promise<{ width: number; height: number }>((resolve) => {
			if (!browser || !src) {
				resolve({ width: 0, height: 0 });
				return;
			}

			const image = new Image();
			image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
			image.onerror = () => resolve({ width: 0, height: 0 });
			image.src = src;
		});
	}

	async function createPhotoItem(file: File): Promise<PhotoItem> {
		const src = await fileToDataUrl(file);
		const { width, height } = await loadImageDimensions(src);

		return {
			id: nextId('photo'),
			name: file.name || 'Photo',
			caption: file.name ? file.name.replace(/\.[^.]+$/, '') : 'Photo',
			src,
			width,
			height
		};
	}

	async function hydratePhotoDimensions(items: Section[]) {
		let changed = false;

		for (const section of items) {
			for (const photo of section.photos) {
				if (photo.width > 0 && photo.height > 0) continue;

				const { width, height } = await loadImageDimensions(photo.src);
				if (!width || !height) continue;

				photo.width = width;
				photo.height = height;
				changed = true;
			}
		}

		return changed;
	}

	async function addPhotosToSection(sectionId: string, fileList: FileList | File[] | null | undefined) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos' || !fileList?.length) return;

		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;

			section.photos.push(await createPhotoItem(file));
		}
	}

	async function handlePhotoInput(sectionId: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		await addPhotosToSection(sectionId, input?.files ?? null);
		if (input) input.value = '';
	}

	function removePhoto(section: PhotosSection, photoId: string) {
		section.photos = section.photos.filter((photo) => photo.id !== photoId);

		if (photoDragSectionId === section.id && photoDragId === photoId) {
			clearPhotoReorderState();
		}
	}

	function formatDayDate(dateISO: string) {
		if (!dateISO) return '';

		const [year, month, day] = String(dateISO)
			.split('-')
			.map((value) => Number(value));
		if (!year || !month || !day) return '';

		const date = new Date(year, month - 1, day);
		const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
		const numeric = new Intl.DateTimeFormat(undefined, {
			month: 'numeric',
			day: 'numeric',
			year: 'numeric'
		}).format(date);

		return `${weekday}, ${numeric}`;
	}

	function getSortedEntries(day: TimeDay) {
		return [...day.entries].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
	}

	function getPhotoOrientation(photo: PhotoItem): PhotoOrientation {
		if (!photo.width || !photo.height) return 'square';
		if (photo.width / photo.height >= 1.1) return 'landscape';
		if (photo.height / photo.width >= 1.1) return 'portrait';
		return 'square';
	}

	function getPreviewPhotoGridClass(section: PhotosSection) {
		if (section.photos.length <= 1) return 'grid gap-3';
		return 'grid grid-cols-2 gap-3';
	}

	function getPreviewPhotoCardClass(section: PhotosSection, photo: PhotoItem) {
		void section;
		void photo;
		return 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white';
	}

	function getPreviewPhotoFrameHeight(section: PhotosSection, photo: PhotoItem) {
		const orientation = getPhotoOrientation(photo);

		if (section.photos.length === 1) {
			return orientation === 'portrait' ? '5.6in' : '4.7in';
		}

		if (section.photos.length === 2) {
			return orientation === 'portrait' ? '3.55in' : '2.45in';
		}

		return orientation === 'portrait' ? '2.7in' : '1.9in';
	}

	function clearDragState() {
		dragId = '';
		dropId = '';
	}

	function clearPhotoReorderState() {
		photoDragSectionId = '';
		photoDragId = '';
		photoReorderTargetId = '';
	}

	function suppressSectionToggle(sectionId: string) {
		suppressSectionToggleId = sectionId;
		suppressSectionToggleUntil = Date.now() + 400;
	}

	function handleSectionTriggerClick(sectionId: string) {
		if (suppressSectionToggleId === sectionId && Date.now() < suppressSectionToggleUntil) {
			suppressSectionToggleId = '';
			return;
		}

		toggleSection(sectionId);
	}

	function reorderSections(fromId: string, targetId: string) {
		if (!fromId || fromId === targetId) return;

		const fromIndex = sections.findIndex((section) => section.id === fromId);
		const targetIndex = sections.findIndex((section) => section.id === targetId);
		if (fromIndex < 0 || targetIndex < 0) return;

		const fromSection = sections[fromIndex];
		const targetSection = sections[targetIndex];
		if (!isSectionMovable(fromSection) || !isSectionMovable(targetSection)) return;

		const [moved] = sections.splice(fromIndex, 1);
		sections.splice(targetIndex, 0, moved);
	}

	function handleSectionDragStart(sectionId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || !isSectionMovable(section)) return;
		dragId = sectionId;
		suppressSectionToggle(sectionId);
	}

	function handleSectionDragOver(sectionId: string, event: DragEvent) {
		const targetSection = sections.find((item) => item.id === sectionId);
		if (!dragId || !targetSection || !isSectionMovable(targetSection) || dragId === sectionId) return;
		event.preventDefault();
		dropId = sectionId;
	}

	function handleSectionDragLeave(sectionId: string) {
		if (dropId === sectionId) dropId = '';
	}

	function handleSectionDrop(sectionId: string, event: DragEvent) {
		if (!dragId) return;
		event.preventDefault();
		reorderSections(dragId, sectionId);
		clearDragState();
	}

	function reorderPhotos(sectionId: string, fromPhotoId: string, targetPhotoId: string) {
		if (!fromPhotoId || fromPhotoId === targetPhotoId) return;

		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos') return;

		const fromIndex = section.photos.findIndex((photo) => photo.id === fromPhotoId);
		const targetIndex = section.photos.findIndex((photo) => photo.id === targetPhotoId);
		if (fromIndex < 0 || targetIndex < 0) return;

		const [moved] = section.photos.splice(fromIndex, 1);
		section.photos.splice(targetIndex, 0, moved);
	}

	function handlePhotoDragStart(sectionId: string, photoId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos' || section.photos.length < 2) return;

		photoDragSectionId = sectionId;
		photoDragId = photoId;
	}

	function handlePhotoDragOver(sectionId: string, photoId: string, event: DragEvent) {
		if (!photoDragId || photoDragSectionId !== sectionId || photoDragId === photoId) return;

		event.preventDefault();
		photoReorderTargetId = photoId;
	}

	function handlePhotoDragLeave(sectionId: string, photoId: string) {
		if (photoDragSectionId === sectionId && photoReorderTargetId === photoId) {
			photoReorderTargetId = '';
		}
	}

	function handlePhotoDrop(sectionId: string, photoId: string, event: DragEvent) {
		if (!photoDragId || photoDragSectionId !== sectionId) return;

		event.preventDefault();
		reorderPhotos(sectionId, photoDragId, photoId);
		clearPhotoReorderState();
	}

	function resolveTouchTarget(selector: string, clientX: number, clientY: number) {
		if (!browser) return null;

		const target = document.elementFromPoint(clientX, clientY);
		if (!(target instanceof HTMLElement)) return null;

		return target.closest<HTMLElement>(selector);
	}

	function resolveSectionTouchTarget(clientX: number, clientY: number) {
		const target = resolveTouchTarget('[data-touch-reorder-kind="section"]', clientX, clientY);
		const sectionId = target?.dataset.touchReorderId;
		if (!sectionId) return undefined;

		const section = sections.find((item) => item.id === sectionId);
		return section && isSectionMovable(section) ? sectionId : undefined;
	}

	function resolvePhotoTouchTarget(clientX: number, clientY: number, sectionId?: string) {
		if (!sectionId) return undefined;

		const target = resolveTouchTarget('[data-touch-reorder-kind="photo"]', clientX, clientY);
		if (!target || target.dataset.touchReorderScope !== sectionId) return undefined;

		return target.dataset.touchReorderId || undefined;
	}

	function attachTouchReorderListeners() {
		if (!browser || touchReorderListenersAttached) return;

		window.addEventListener('touchmove', handleTouchReorderMove, { passive: false });
		window.addEventListener('touchend', finishTouchReorder, { passive: false });
		window.addEventListener('touchcancel', cancelTouchReorder, { passive: false });
		touchReorderListenersAttached = true;
	}

	function detachTouchReorderListeners() {
		if (!browser || !touchReorderListenersAttached) return;

		window.removeEventListener('touchmove', handleTouchReorderMove);
		window.removeEventListener('touchend', finishTouchReorder);
		window.removeEventListener('touchcancel', cancelTouchReorder);
		touchReorderListenersAttached = false;
	}

	function cancelTouchReorder() {
		if (!activeTouchReorder) {
			detachTouchReorderListeners();
			return;
		}

		if (activeTouchReorder.timerId) {
			clearTimeout(activeTouchReorder.timerId);
		}

		if (activeTouchReorder.active) {
			activeTouchReorder.options.clearHover();
			activeTouchReorder.options.finish();
		}

		activeTouchReorder = null;
		detachTouchReorderListeners();
	}

	function startTouchReorder(event: TouchEvent, options: TouchReorderOptions) {
		if (!browser || event.touches.length !== 1) return;

		cancelTouchReorder();

		const touch = event.touches[0];
		const next: ActiveTouchReorder = {
			options,
			startX: touch.clientX,
			startY: touch.clientY,
			active: false,
			currentTargetId: '',
			timerId: null
		};

		next.timerId = setTimeout(() => {
			if (activeTouchReorder !== next) return;

			next.timerId = null;
			next.active = true;
			options.activate();
		}, touchReorderHoldDelay);

		activeTouchReorder = next;
		attachTouchReorderListeners();
	}

	function handleTouchReorderMove(event: TouchEvent) {
		if (!activeTouchReorder || event.touches.length !== 1) return;

		const touch = event.touches[0];
		const deltaX = touch.clientX - activeTouchReorder.startX;
		const deltaY = touch.clientY - activeTouchReorder.startY;

		if (!activeTouchReorder.active) {
			if (Math.hypot(deltaX, deltaY) > touchReorderMoveTolerance) {
				cancelTouchReorder();
			}
			return;
		}

		if (event.cancelable) event.preventDefault();

		const targetId =
			activeTouchReorder.options.resolveTarget(
				touch.clientX,
				touch.clientY,
				activeTouchReorder.options.scopeId
			) || '';

		if (!targetId || targetId === activeTouchReorder.options.itemId) {
			activeTouchReorder.currentTargetId = '';
			activeTouchReorder.options.clearHover();
			return;
		}

		activeTouchReorder.currentTargetId = targetId;
		activeTouchReorder.options.hover(targetId);
	}

	function finishTouchReorder(event?: TouchEvent) {
		if (!activeTouchReorder) return;

		const session = activeTouchReorder;
		activeTouchReorder = null;

		if (session.timerId) {
			clearTimeout(session.timerId);
			detachTouchReorderListeners();
			return;
		}

		if (!session.active) return;

		if (event?.cancelable) event.preventDefault();

		const targetId = session.currentTargetId;
		session.options.clearHover();

		if (targetId && targetId !== session.options.itemId) {
			session.options.commit(targetId);
		}

		session.options.finish();
		detachTouchReorderListeners();
	}

	function handleSectionTouchStart(event: TouchEvent, sectionId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || !isSectionMovable(section)) return;

		startTouchReorder(event, {
			itemId: sectionId,
			activate: () => {
				dragId = sectionId;
				suppressSectionToggle(sectionId);
			},
			hover: (targetId) => {
				dropId = targetId;
			},
			clearHover: () => {
				dropId = '';
			},
			commit: (targetId) => {
				reorderSections(sectionId, targetId);
			},
			finish: () => {
				clearDragState();
			},
			resolveTarget: (clientX, clientY) => resolveSectionTouchTarget(clientX, clientY)
		});
	}

	function handlePhotoTouchStart(event: TouchEvent, sectionId: string, photoId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos' || section.photos.length < 2) return;

		startTouchReorder(event, {
			itemId: photoId,
			scopeId: sectionId,
			activate: () => {
				photoDragSectionId = sectionId;
				photoDragId = photoId;
			},
			hover: (targetId) => {
				photoReorderTargetId = targetId;
			},
			clearHover: () => {
				photoReorderTargetId = '';
			},
			commit: (targetId) => {
				reorderPhotos(sectionId, photoId, targetId);
			},
			finish: () => {
				clearPhotoReorderState();
			},
			resolveTarget: (clientX, clientY, scopeId) => resolvePhotoTouchTarget(clientX, clientY, scopeId)
		});
	}

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function handleExport(format: ExportFormat) {
		if (format !== 'PDF' || !browser || !previewPages || isExporting) return;

		isExporting = true;

		try {
			const markup = Array.from(previewPages.querySelectorAll('.preview-page'))
				.map((page) => page.outerHTML)
				.join('');
			if (!markup) return;

			const response = await fetch('/api/export/pdf', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					markup,
					filename: exportFileName
				})
			});

			if (!response.ok) {
				throw new Error(`PDF export failed with status ${response.status}`);
			}

			const blob = await response.blob();
			downloadBlob(blob, exportFileName);
		} finally {
			isExporting = false;
		}
	}

	function handlePhotoZoneDragOver(sectionId: string, event: DragEvent) {
		event.preventDefault();
		photoDropId = sectionId;
	}

	function handlePhotoZoneDragLeave(sectionId: string) {
		if (photoDropId === sectionId) photoDropId = '';
	}

	async function handlePhotoZoneDrop(sectionId: string, event: DragEvent) {
		event.preventDefault();
		photoDropId = '';
		await addPhotosToSection(sectionId, event.dataTransfer?.files ?? null);
	}

	async function handlePaste(event: ClipboardEvent) {
		const activeSection =
			(sections.find((section) => section.open && section.type === 'photos') as PhotosSection | undefined) ||
			(sections.find((section) => section.type === 'photos') as PhotosSection | undefined);
		if (!activeSection) return;

		const files: File[] = [];
		for (const item of Array.from(event.clipboardData?.items || [])) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) files.push(file);
				break;
			}
		}

		if (!files.length) return;
		event.preventDefault();
		await addPhotosToSection(activeSection.id, files);
	}

	function applyFitZoomIfNeeded() {
		if (!previewViewport) return;
		const bounds = getPreviewZoomBounds();

		if (hasUserZoomed) {
			previewZoom = clamp(previewZoom || bounds.initial, bounds.min, bounds.max);
			return;
		}

		previewZoom = bounds.initial;
	}

	function getPreviewZoomBounds() {
		if (!previewViewport) {
			return {
				min: previewZoomMin,
				max: previewZoomMax,
				initial: previewZoomMax
			};
		}

		const availableWidth = Math.max(
			200,
			previewViewport.clientWidth - (isDesktop ? previewDesktopPadding : previewMobilePadding)
		);
		const fitWidthZoom = clamp(availableWidth / previewPageWidth, previewZoomMin, previewZoomMax);

		if (isDesktop) {
			return {
				min: previewZoomMin,
				max: fitWidthZoom,
				initial: fitWidthZoom
			};
		}

		const availableHeight = Math.max(200, previewViewport.clientHeight - 32);
		const fitVisiblePagesZoom = clamp(
			(availableHeight - previewMobileGap * 0.5) / (previewPageHeight * previewMobileVisiblePages),
			previewZoomMin,
			fitWidthZoom
		);

		return {
			min: previewZoomMin,
			max: fitWidthZoom,
			initial: Math.min(fitWidthZoom, fitVisiblePagesZoom)
		};
	}

	async function stepPreviewZoom(direction: 'in' | 'out') {
		if (!previewViewport) return;

		const bounds = getPreviewZoomBounds();
		const step = isDesktop ? 0.08 : 0.05;
		const delta = direction === 'in' ? step : -step;
		const nextZoom = clamp((previewZoom || bounds.initial) + delta, bounds.min, bounds.max);

		hasUserZoomed = true;
		await zoomPreviewAtCursor(previewViewport.clientHeight / 2, nextZoom);
	}

	function resetPreviewZoom() {
		hasUserZoomed = false;
		applyFitZoomIfNeeded();
	}

	async function zoomPreviewAtCursor(cursorY: number, nextZoom: number) {
		if (!previewViewport) return;
		const currentZoom = previewZoom || 1;
		const contentY = (previewViewport.scrollTop + cursorY) / currentZoom;
		previewZoom = nextZoom;
		await tick();
		previewViewport.scrollTop = Math.max(0, contentY * nextZoom - cursorY);
	}

	async function handlePreviewWheel(event: WheelEvent) {
		if (!isDesktop || !(event.ctrlKey || event.metaKey) || !previewViewport) return;

		event.preventDefault();
		hasUserZoomed = true;

		const bounds = getPreviewZoomBounds();
		const rect = previewViewport.getBoundingClientRect();
		const cursorY = clamp(event.clientY - rect.top, 0, rect.height);
		const delta = Math.sign(event.deltaY);
		const step = 0.08;
		const nextZoom = clamp((previewZoom || bounds.initial) + (delta > 0 ? -step : step), bounds.min, bounds.max);
		await zoomPreviewAtCursor(cursorY, nextZoom);
	}

	function handlePreviewTouchStart(event: TouchEvent) {
		if (event.touches.length !== 2 || !previewViewport) return;

		const [first, second] = Array.from(event.touches);
		const dx = first.clientX - second.clientX;
		const dy = first.clientY - second.clientY;
		const startDist = Math.hypot(dx, dy);
		const rect = previewViewport.getBoundingClientRect();
		const midY = clamp((first.clientY + second.clientY) / 2 - rect.top, 0, rect.height);

		pinch = { startDist, startZoom: previewZoom || 1, midY };
		hasUserZoomed = true;
	}

	async function handlePreviewTouchMove(event: TouchEvent) {
		if (!pinch || event.touches.length !== 2 || !previewViewport) return;

		event.preventDefault();

		const bounds = getPreviewZoomBounds();
		const [first, second] = Array.from(event.touches);
		const dx = first.clientX - second.clientX;
		const dy = first.clientY - second.clientY;
		const distance = Math.hypot(dx, dy);
		const ratio = distance / pinch.startDist;
		const nextZoom = clamp(pinch.startZoom * ratio, bounds.min, bounds.max);
		await zoomPreviewAtCursor(pinch.midY, nextZoom);
	}

	function handlePreviewTouchEnd() {
		pinch = null;
	}

	function resetReport() {
		if (!browser) return;
		const okay = window.confirm('Reset this report and clear all saved data? This cannot be undone.');
		if (!okay) return;
		localStorage.removeItem(storageKey);
		applyState(createDefaultState());
		cancelTouchReorder();
		clearDragState();
		clearPhotoReorderState();
		photoDropId = '';
	}

	onMount(async () => {
		const next = loadState();
		syncIdCounterFromSections(next.sections);
		applyState(next);
		const didHydratePhotoDimensions = await hydratePhotoDimensions(next.sections);
		if (didHydratePhotoDimensions) sections = [...sections];
		hydrated = true;
		await tick();
		applyFitZoomIfNeeded();
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		const serialized = JSON.stringify({ activeTab, previewZoom, hasUserZoomed, sections });
		localStorage.setItem(storageKey, serialized);
	});

	$effect(() => {
		if (!hydrated || !previewViewport || hasUserZoomed) return;
		mq.sm;
		applyFitZoomIfNeeded();
	});
</script>

<svelte:window onpaste={handlePaste} />

<div class="page-shell h-svh overflow-hidden text-slate-900">
	<div class="flex h-full min-w-0 flex-col">

		<!-- MOBILE TABS 
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
		<div class="flex shrink-0 items-center gap-2 p-4 md:hidden">

			<Button
				{...(activeTab === 'create' 
					? { heavy: true, primary: true } 
					: { outline: true, base: true }
				)}
				class="w-full flex-1"
				onclick={() => (activeTab = 'create')}
				label="Create"
			/>

			<Button
				{...(activeTab === 'preview' 
					? { heavy: true, primary: true } 
					: { outline: true, base: true }
				)}
				class="w-full flex-1"
				onclick={() => (activeTab = 'preview')}
				label="Preview"
			/>
		</div>

		<!-- MAIN 
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
		<main class="grid min-h-0 flex-1 gap-4 md:grid-cols-[24rem_minmax(0,1fr)] md:px-6 md:pb-6 lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
			
			<!-- CREATE 
			-------------------------------------------------->
			<section id="create" class:hidden={!isDesktop && activeTab !== 'create'} class="min-h-0 px-4 pb-4 md:px-0 md:pb-0 md:pt-6">
				<div class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">

					<!-- create header -->
					<div class="shrink-0 border-b border-slate-200 px-4 py-3">
						<div class="flex flex-col gap-4">
							<div class="grid gap-4 grid-cols-[minmax(0,1fr)_auto] items-start">
								<div class="min-w-0">
									<Text h2="Create" />
									<Text xs class="text-neutral" p="Build the report structure, content, and photos section by section."  />
								</div>

								<div class="flex items-center gap-5">
									<div class="relative h-18 w-18 shrink-0">
										<svg viewBox="0 0 96 96" class="h-full w-full overflow-visible -rotate-90" aria-hidden="true">
											<circle
												cx="48"
												cy="48"
												r={overallProgressRingRadius}
												fill="none"
												stroke="#d9e1ec"
												stroke-width="12"
											/>
											<circle
												cx="48"
												cy="48"
												r={overallProgressRingRadius}
												fill="none"
												stroke="#22c55e"
												stroke-linecap="round"
												stroke-width="12"
												stroke-dasharray={overallProgressRingCircumference}
												stroke-dashoffset={getProgressRingOffset(overallMetrics.percent)}
											/>
										</svg>
										<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
											<span class="text-sm font-bold text-slate-800">{overallMetrics.percent}%</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="flex flex-wrap gap-2 p-4">
						<Button
							primary xs
							onclick={addSection}
							label="Add Section"
						/>
						<Button
							outline xs
							onclick={resetReport}
							label="Reset"
						/>
					</div>
					
					<!-- create content -->
					<div class="min-h-0 flex-1 space-y-3 overflow-auto p-4 pt-4">
						{#each sections as section (section.id)}
							{@const metrics = getSectionMetrics(section)}
							{@const sectionStatusLabel = getSectionStatusLabel(metrics)}
							{@const sectionStatusTextClass = getSectionStatusTextClass(metrics)}
							{@const sectionProgressFillClass = getSectionProgressFillClass(metrics)}

							<!-- panels -->
							<article
								class:drop-target={dragId && dragId !== section.id && dropId === section.id && isSectionMovable(section)}
								class="relative rounded-2xl border border-slate-200 bg-white"
								data-dragging={dragId === section.id ? 'true' : 'false'}
								draggable={isSectionMovable(section)}
								ondragstart={() => handleSectionDragStart(section.id)}
								ondragend={clearDragState}
								ondragover={(event) => handleSectionDragOver(section.id, event)}
								ondragleave={() => handleSectionDragLeave(section.id)}
								ondrop={(event) => handleSectionDrop(section.id, event)}
							>
								{#if isSectionMovable(section)}
									<Button
										variant="icon" icon="close"
										class="text-[8px]! absolute! -right-2 -top-2 z-10"
										aria-label={`Delete ${section.title}`}
										onclick={(event: MouseEvent) => handleRemoveSectionClick(event, section.id)}
									/>
									{:else}
									<Button variant="icon" icon="lock" disabled 
										class="text-[8px]! absolute! -right-2 -top-2 z-10 text-secondary-400 bg-secondary-200 opacity-100"
									/>
								{/if}

								<!-- panel trigger -->
								<button
									type="button"
									class={`block w-full cursor-pointer p-4 text-left ${isSectionMovable(section) ? 'touch-reorder-handle select-none active:cursor-grabbing' : ''}`}
									data-touch-reorder-id={section.id}
									data-touch-reorder-kind="section"
									onclick={() => handleSectionTriggerClick(section.id)}
									ontouchstart={(event) => handleSectionTouchStart(event, section.id)}
								>
									<div class="flex items-start gap-3">
										<div class={`flex h-10 w-10 shrink-0 items-center justify-center text-3xl ${isSectionMovable(section) ? 'cursor-grab' : ''}`}>{section.icon}</div>
										<div class="min-w-0 flex-1">
											<div class="mb-2 flex items-start justify-between gap-3">
												<div>
													<div class="flex flex-wrap items-center gap-2">
														<h3 class="text-sm font-bold text-slate-800">{section.title}</h3>
													</div>
													<p class="text-xs text-slate-500">{metrics.done} of {metrics.total} complete</p>
												</div>

												<div class="text-right">
														<p class="text-sm font-bold text-slate-700">{metrics.percent}%</p>
													<p class={`${metricStatusCaptionClass} ${sectionStatusTextClass}`}>{sectionStatusLabel}</p>
												</div>
											</div>

											<div class="h-2.5 overflow-hidden rounded-full bg-slate-200">
												<div class={`h-full rounded-full transition-all duration-300 ${sectionProgressFillClass}`} style={`width: ${metrics.percent}%`}></div>
											</div>
										</div>
									</div>
								</button>

								<!-- panel content -->
								{#if section.open}
									<div class="border-t border-slate-200 p-4">

										<!-- 1. COVER PAGE 
										------------------------------>
										{#if section.type === 'cover'}
											<div class="grid gap-3">
												{#each detailFields as field (field.key)}
													<label class="block">
														<span class="mb-1 block text-xs font-semibold text-slate-600">{field.label}</span>
														<input
															bind:value={section.fields[field.key]}
															class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-primary-500"
															placeholder={field.placeholder || ''}
															type={field.type || 'text'}
														/>
													</label>
												{/each}
											</div>

										<!-- 3. TIME LOG 
										------------------------------>
										{:else if section.type === 'time-log'}
											<!-- days -->
											<div class="space-y-4">

												{#each section.days as day (day.id)}
													<Grid items="1x2" cols="1fr auto" gap="8px">
														<Input type="date" label="Date" bind:value={day.dateISO} />
														<Button ghost secondary variant="icon" icon="close" onclick={() => removeDay(section, day.id)}   />
													</Grid>
													
													<p class="mb-3 text-xs font-semibold text-slate-600">{formatDayDate(day.dateISO) || 'Select a date to generate the day name.'}</p>

													<!-- times -->
													{#each day.entries as entry (entry.id)}
														<Grid items="1x3" cols="160px 1fr auto" gap="8px">
																<Input
																	bind:value={entry.time}
																	label="Time"
																	variant="label"
																	inputmode="numeric"
																	type="time"
																	min="00:00" 
																	max="23:59"
																	step="600"
																	onblur={() => maybeAddEntry(day, entry.id)}
																/>
																<Input
																	bind:value={entry.text}
																	label="Activity"
																	variant="label"
																	type="text"
																	onblur={() => maybeAddEntry(day, entry.id)}
																	onkeyup={(event?: KeyboardEvent) => handleActivityKeyup(day, entry.id, event)}
																/>
															<Button ghost secondary variant="icon" icon="close" onclick={() => removeEntry(day, entry.id)}  />
														</Grid>
													{/each}

													<Button
														primary xs
														label="Add Time"
														onclick={() => addEntry(day)}
													/>
												{/each}

												<Button
													primary xs
													label="Add Day"
													onclick={() => addDay(section)}
												/>
											</div>
										{:else}
											<!-- photos -->
											<div class="space-y-3">
												{#if !section.locked}
													<Input
														bind:value={section.title}
														label="Title"
														variant="label"
														type="text"
													/>
												{/if}

													<Input
														bind:value={section.description}
														textarea
														label="Description"
														variant="label"
														type="text"
													/>

												<div class="space-y-3">
												
													<!-- PHOTO UPLOAD 
													------------------------------>
													<div class="flex flex-wrap gap-2">
														<!-- file -->
														<label class="rounded-xl bg-primary-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-600">
															<span>Upload</span>
															<input accept="image/*" class="hidden" multiple type="file" onchange={(event) => handlePhotoInput(section.id, event)} />
														</label>

														<!-- camera -->
														<label class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
															<span>Camera</span>
															<input accept="image/*" capture="environment" class="hidden" type="file" onchange={(event) => handlePhotoInput(section.id, event)} />
														</label>
													</div>

													<!-- drag/drop images -->
													<div
														role="presentation"
														class:drop-target={photoDropId === section.id}
														class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-medium text-slate-500"
														ondragover={(event) => handlePhotoZoneDragOver(section.id, event)}
														ondragleave={() => handlePhotoZoneDragLeave(section.id)}
														ondrop={(event) => handlePhotoZoneDrop(section.id, event)}
													>
														Drop images here
													</div>

													<div class="grid grid-cols-2 gap-3">
														{#each section.photos as photo (photo.id)}
															<div
																class:drop-target={photoDragSectionId === section.id && photoDragId && photoReorderTargetId === photo.id}
																class="rounded-2xl bg-white p-2"
																data-dragging={photoDragSectionId === section.id && photoDragId === photo.id ? 'true' : 'false'}
																role="presentation"
																ondragover={(event) => handlePhotoDragOver(section.id, photo.id, event)}
																ondragleave={() => handlePhotoDragLeave(section.id, photo.id)}
																ondrop={(event) => handlePhotoDrop(section.id, photo.id, event)}
															>
																<div
																	class={`touch-reorder-handle relative rounded-xl aspect-square bg-slate-100 ${section.photos.length > 1 ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
																	data-touch-reorder-id={photo.id}
																	data-touch-reorder-kind="photo"
																	data-touch-reorder-scope={section.id}
																	role={section.photos.length > 1 ? 'button' : 'presentation'}
																	aria-label={section.photos.length > 1 ? `Reorder ${photo.caption || photo.name || 'photo'}` : undefined}
																	draggable={section.photos.length > 1}
																	ondragstart={() => handlePhotoDragStart(section.id, photo.id)}
																	ondragend={clearPhotoReorderState}
																	ontouchstart={(event) => handlePhotoTouchStart(event, section.id, photo.id)}
																>
																	<img alt={photo.caption || photo.name} class="h-full w-full object-cover rounded-lg" draggable="false" src={photo.src} />
																	
																	<Button
																		variant="icon" icon="close"
																		class="text-[8px]! absolute! -right-1.5 -top-1.5 z-100"
																		aria-label="Remove Photo"
																		onclick={() => removePhoto(section, photo.id)}
																	/>
																	<Input
																		bind:value={photo.caption}
																		label="Caption"
																		type="text"
																	/>
																</div>
															</div>
														{/each}
													</div>
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</article>
						{/each}
					</div>
				</div>
			</section>

			<!-- PREVIEW 
			-------------------------------------------------->
			<section id="preview" class:hidden={!isDesktop && activeTab !== 'preview'} class="min-h-0 min-w-0 md:block md:pt-6">
				<div class="relative flex h-full min-h-0 flex-col">

					<!-- CONTROLS 
					-------------------------------------------------->
					<div id="previewControls" class="flex justify-end gap-2 fixed bottom-8 right-8 z-20">
						<!-- Download -->
						<Button
							primary 
							class="bg-primary"
							variant="icon text"
							icon="download"
							onclick={() => handleExport('PDF')}
							label={isExporting ? 'DOWNLOADING...' : 'DOWNLOAD'} disabled={isExporting}
						/>

						<!-- Zoomer -->
						<div id="zoomer" class="flex h-12 rounded-full border border-slate-300 bg-white shadow-sm">
							<!-- zoom in -->
							<Button
								ghost xl
								label="-"
								onclick={() => stepPreviewZoom('out')}
								class="px-4!"
							/>
							<!-- zoom percentage -->
							<Button
								ghost lg
								class="w-18! px-0! font-black! border-x border-slate-200 rounded-none!"
								onclick={resetPreviewZoom}
							>
								{Math.round((previewZoom || 1) * 100)}%
							</Button>
							<!-- zoom out -->
							<Button
								ghost xl
								label="+"
								onclick={() => stepPreviewZoom('in')}
								class="px-4!"
							/>
						</div>
					</div>

					<!-- PAGES 
					-------------------------------------------------->
					<div class="min-h-0 flex-1">
						<div
							bind:this={previewViewport}
							role="region"
							aria-label="Preview pages"
							class="h-full w-full overflow-y-auto overflow-x-hidden bg-transparent"
							style={`touch-action: ${isDesktop ? 'pan-y pinch-zoom' : 'pan-y'}`}
							onwheel={handlePreviewWheel}
							ontouchstart={handlePreviewTouchStart}
							ontouchmove={handlePreviewTouchMove}
							ontouchend={handlePreviewTouchEnd}
						>
							<div class="relative w-full px-1 pb-10 pt-0 md:px-0 md:pb-16 md:pt-2">
								<div class="w-full" style={`--preview-zoom: ${previewZoom || 1}; --preview-page-width: ${previewPageWidth}px; --preview-page-height: ${previewPageHeight}px`}>
									<div bind:this={previewPages} class="flex flex-col items-center gap-4 md:gap-12">

										<!-- 1. COVER PAGE 
										------------------------------>
										<div class="preview-sheet">
											<div class="preview-page">
												<div class="preview-page-inner flex flex-col items-center justify-center gap-6 relative">
												
													<!-- Top Cover Page-->
													<div id="topCoverPage" class="flex flex-col items-center justify-center gap-6 mb-50">
														<Logo mode="light" class="size-42" />
														<Text h1={reportSection?.fields.reportTitle || 'Survey Report'} class="text-6xl uppercase font-black" />
														<Text h2={reportSection?.fields.reportSubtitle || 'Discharge Survey of 2x Trafos from the MV BBC Kimberly'} class="font-semibold text-pretty text-3xl text-secondary-500 text-center" />
													</div>

													<!-- Bottom Cover Page -->
													<div id="bottomCoverPage" class="grid justify-center bg-secondary-200/60 w-full z-1! absolute bottom-0 left-0 right-0 pb-20">
														<Divider class="absolute bottom-full" color="text-secondary-200/60" bleed={false} />
														{#each coverMeta as item (item.label)}
														<div class="grid grid-cols-[100px_100px] gap-3">
															<span class="font-semibold text-slate-600">{item.label}:</span>
															<span class="text-slate-800">{item.value}</span>
														</div>
														{/each}
													</div>
												</div>
											</div>
										</div>

										<!-- 2. TOC 
										------------------------------>
										<div class="preview-sheet">
											<div class="preview-page">
												<div class="preview-page-inner">
													<Text h2="Table of Contents" class="text-4xl mb-4"/>
													<div class="space-y-2 text-sm">
														{#each tableOfContentsEntries as item (item.id)}
															<div class="grid grid-cols-[1fr_auto] gap-3 border-b border-dashed border-slate-200 pb-1">
																<span class="font-medium text-slate-700">{item.title}</span>
																<span class="text-slate-500">{item.page}</span>
															</div>
														{/each}
													</div>
												</div>
											</div>
										</div>

										{#each previewContentSections as section (section.id)}
											
											<!-- 3. TIME LOG
											------------------------------>
											{#if section.type === 'time-log'}
												<div class="preview-sheet">
													<div class="preview-page">
														<div class="preview-page-inner">
															<Text h2={section.title} class="text-4xl mb-4"/>
															{#each section.days as day (day.id)}
																<p class="mb-2 text-sm font-semibold text-slate-700">{formatDayDate(day.dateISO) || 'Day / date not entered yet'}</p>
																<ul class="mb-4 space-y-2 text-sm">
																	{#each getSortedEntries(day) as entry (entry.id)}
																		<li class="flex gap-3">
																			<span class="w-14 shrink-0 font-bold text-slate-800">{entry.time || '----'}</span>
																			<span class="text-slate-700">{entry.text || 'No activity entered'}</span>
																		</li>
																	{/each}
																</ul>
															{/each}
														</div>
													</div>
												</div>
												
											<!-- 3. PHOTOS
											------------------------------>
											{:else}
												<div class="preview-sheet">
													<div class="preview-page">
														<div class="preview-page-inner">
															<Text h2={section.title} class="text-4xl mb-4"/>
															{#if section.description}
																<Text p={section.description} class="text-secondary"/>
															{/if}

															<div class={getPreviewPhotoGridClass(section)}>
																{#if section.photos.length}
																	{#each section.photos as photo (photo.id)}
																		<figure class={getPreviewPhotoCardClass(section, photo)}>
																			<div class="grid place-items-center bg-slate-50 p-3" style={`height: ${getPreviewPhotoFrameHeight(section, photo)}`}> 
																				<img alt={photo.caption || photo.name} class="h-full w-full object-contain" src={photo.src} />
																			</div>
																			<figcaption class="p-3 text-xs text-slate-600">{photo.caption || photo.name || 'Photo'}</figcaption>
																		</figure>
																	{/each}
																{:else}
																	<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No photos added yet.</div>
																{/if}
															</div>
														</div>
													</div>
												</div>
											{/if}
										{/each}

									</div>
								</div>
							</div>

						</div>
					</div>


				</div>
			</section>
		</main>


	</div>
</div>

<style>
	[data-dragging='true'] {
		opacity: 0.55;
	}

	.touch-reorder-handle {
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.touch-reorder-handle img {
		-webkit-user-drag: none;
	}

	.drop-target {
		outline: 2px dashed #2563eb;
		outline-offset: 4px;
	}

	.page-shell {
		background-color: #eef2f7;
		background-image: radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.24) 1.05px, transparent 0);
		background-size: 16px 16px;
	}

	.preview-sheet {
		position: relative;
		width: calc(var(--preview-page-width) * var(--preview-zoom, 1));
		height: calc(var(--preview-page-height) * var(--preview-zoom, 1));
		flex-shrink: 0;
	}

	.preview-page {
		width: 8.5in;
		height: 11in;
		box-sizing: border-box;
		aspect-ratio: 8.5 / 11;
		background: #fff;
		border: 2px solid #d2d8e2;
		border-radius: 16px;
		overflow: hidden;
		transform-origin: top left;
		transform: scale(var(--preview-zoom, 1));
		will-change: transform;
	}

	.preview-page-inner {
		height: 100%;
		padding: 0.75in;
	}

	.preview-page-inner * {
		max-width: 100%;
	}

	@media (max-width: 767px) {
		.preview-page {
			border-radius: 14px;
			box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
		}
	}
</style>