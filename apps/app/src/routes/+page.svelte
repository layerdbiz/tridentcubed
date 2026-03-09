<script lang="ts">
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

	type SectionStatus = 'todo' | 'in-progress' | 'complete';

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
	const panelTitleClass = 'text-xl font-bold tracking-tight text-slate-900';
	const panelSubtitleClass = 'text-sm text-slate-500';
	const metricLabelClass = 'text-sm font-semibold text-slate-700';
	const metricMetaClass = 'text-xs text-slate-500';
	const metricMetaStrongClass = 'text-xs font-semibold uppercase tracking-[0.16em] text-slate-400';
	const metricValueClass = 'text-sm font-bold text-slate-700';
	const metricValueCaptionClass = 'text-[11px] uppercase tracking-[0.16em] text-slate-400';
	const metricStatusCaptionClass = 'text-[11px] uppercase tracking-[0.16em]';
	const progressTrackClass = 'h-2.5 overflow-hidden rounded-full bg-slate-200';
	const progressFillClass = 'h-full rounded-full bg-green-500 transition-all duration-300';
	const previewPageWidth = 8.5 * 96;
	const previewPageHeight = 11 * 96;
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
	let innerWidth = $state(0);
	let hydrated = $state(false);
	let previewViewport = $state<HTMLDivElement | null>(null);
	let previewPages = $state<HTMLDivElement | null>(null);
	let pinch = $state<{ startDist: number; startZoom: number; midY: number } | null>(null);
	let isExporting = $state(false);

	const isDesktop = $derived(innerWidth >= 768);
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
			src: String((value as PhotoItem)?.src || '')
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
		return 'text-blue-600';
	}

	function getSectionProgressFillClass(metrics: SectionMetrics) {
		const status = getSectionStatus(metrics);

		if (status === 'todo') return 'bg-slate-300';
		if (status === 'complete') return 'bg-green-500';
		return 'bg-blue-500';
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

	async function addPhotosToSection(sectionId: string, fileList: FileList | File[] | null | undefined) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos' || !fileList?.length) return;

		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;

			const src = await fileToDataUrl(file);
			section.photos.push({
				id: nextId('photo'),
				name: file.name || 'Photo',
				caption: file.name ? file.name.replace(/\.[^.]+$/, '') : 'Photo',
				src
			});
		}
	}

	async function handlePhotoInput(sectionId: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		await addPhotosToSection(sectionId, input?.files ?? null);
		if (input) input.value = '';
	}

	function removePhoto(section: PhotosSection, photoId: string) {
		section.photos = section.photos.filter((photo) => photo.id !== photoId);
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

	function clearDragState() {
		dragId = '';
		dropId = '';
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
			const markup = previewPages.innerHTML;
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
		if (!previewViewport || hasUserZoomed) return;
		const paddingAllowance = 28;
		const available = Math.max(320, previewViewport.clientWidth - paddingAllowance);
		previewZoom = clamp(available / previewPageWidth, 0.2, 1);
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
		if (!(event.ctrlKey || event.metaKey) || !previewViewport) return;

		event.preventDefault();
		hasUserZoomed = true;

		const rect = previewViewport.getBoundingClientRect();
		const cursorY = clamp(event.clientY - rect.top, 0, rect.height);
		const delta = Math.sign(event.deltaY);
		const step = 0.08;
		const nextZoom = clamp((previewZoom || 1) + (delta > 0 ? -step : step), 0.2, 2);
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

		const [first, second] = Array.from(event.touches);
		const dx = first.clientX - second.clientX;
		const dy = first.clientY - second.clientY;
		const distance = Math.hypot(dx, dy);
		const ratio = distance / pinch.startDist;
		const nextZoom = clamp(pinch.startZoom * ratio, 0.2, 2);
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
		clearDragState();
		photoDropId = '';
	}

	onMount(async () => {
		const next = loadState();
		syncIdCounterFromSections(next.sections);
		applyState(next);
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
		innerWidth;
		applyFitZoomIfNeeded();
	});
</script>

<svelte:window bind:innerWidth={innerWidth} onpaste={handlePaste} />

<div class="page-shell h-svh overflow-hidden text-slate-900">
	<div class="mx-auto flex h-full max-w-7xl flex-col">

		<!-- MOBILE TABS 
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
		<div class="mb-4 flex shrink-0 items-center gap-2 p-4 md:hidden">
			<button
				type="button"
				class={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${activeTab === 'create' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
				onclick={() => (activeTab = 'create')}
			>
				Create
			</button>

			<button
				type="button"
				class={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
				onclick={() => (activeTab = 'preview')}
			>
				Preview
			</button>
		</div>

		<!-- MAIN 
		:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
		<main class="grid min-h-0 flex-1 gap-4 md:grid-cols-12 md:px-6 md:pb-6">
			
			<!-- CREATE 
			-------------------------------------------------->
			<section class:hidden={!isDesktop && activeTab !== 'create'} class="min-h-0 px-4 pb-4 md:col-span-5 md:px-0 md:pb-0 md:pt-6">
				<div class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">

					<!-- create header -->
					<div class="shrink-0 border-b border-slate-200 px-4 py-3">
						<div class="flex flex-col gap-4">
							<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
								<div class="min-w-0">
									<h2 class={panelTitleClass}>Create</h2>
									<p class={panelSubtitleClass}>Build the report structure, content, and photos section by section.</p>
								</div>

								<div class="flex flex-wrap gap-2 lg:justify-end">
									<button
										type="button"
										class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
										onclick={addSection}
									>
										Add Section
									</button>

									<button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onclick={resetReport}>Reset</button>
								</div>
							</div>

							<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
								<div class="mb-2 flex items-start justify-between gap-3">
									<div>
										<p class={metricLabelClass}>Overall Progress</p>
										<p class={metricMetaClass}>{overallMetrics.done} of {overallMetrics.total} complete</p>
									</div>

									<div class="text-right">
										<p class={metricValueClass}>{overallMetrics.percent}%</p>
										<p class={metricMetaStrongClass}>complete</p>
									</div>
								</div>

								<div class={progressTrackClass}>
									<div class={progressFillClass} style={`width: ${overallMetrics.percent}%`}></div>
								</div>
							</div>
						</div>
					</div>

					<!-- create content -->
					<div class="min-h-0 flex-1 space-y-3 overflow-auto p-4">
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
									<button
										type="button"
										class="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-500 shadow-sm transition hover:border-red-200 hover:text-red-600"
										aria-label={`Delete ${section.title}`}
										onclick={(event) => handleRemoveSectionClick(event, section.id)}
									>
										✕
									</button>
								{/if}

								<!-- panel trigger -->
								<button
									type="button"
									class={`block w-full cursor-pointer p-4 text-left ${isSectionMovable(section) ? 'active:cursor-grabbing' : ''}`}
									onclick={() => toggleSection(section.id)}
								>
									<div class="flex items-start gap-3">
										<div class={`flex h-10 w-10 shrink-0 items-center justify-center text-3xl ${isSectionMovable(section) ? 'cursor-grab' : ''}`}>{section.icon}</div>
										<div class="min-w-0 flex-1">
											<div class="mb-2 flex items-start justify-between gap-3">
												<div>
													<div class="flex flex-wrap items-center gap-2">
														<h3 class="text-sm font-bold text-slate-800">{section.title}</h3>
														{#if section.locked}
															<span class="text-xs text-slate-400">🔒</span>
														{/if}
													</div>
													<p class="text-xs text-slate-500">{metrics.done} of {metrics.total} complete</p>
												</div>

												<div class="text-right">
														<p class="text-sm font-bold text-slate-700">{metrics.percent}%</p>
													<p class={`${metricStatusCaptionClass} ${sectionStatusTextClass}`}>{sectionStatusLabel}</p>
												</div>
											</div>

											<div class={progressTrackClass}>
												<div class={`h-full rounded-full transition-all duration-300 ${sectionProgressFillClass}`} style={`width: ${metrics.percent}%`}></div>
											</div>
										</div>
									</div>
								</button>

								<!-- panel content -->
								{#if section.open}
									<div class="border-t border-slate-200 p-4">
										{#if section.type === 'cover'}
											<!-- details form -->
											<div class="grid gap-3">
												{#each detailFields as field (field.key)}
													<label class="block">
														<span class="mb-1 block text-xs font-semibold text-slate-600">{field.label}</span>
														<input
															bind:value={section.fields[field.key]}
															class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500"
															placeholder={field.placeholder || ''}
															type={field.type || 'text'}
														/>
													</label>
												{/each}
											</div>
										{:else if section.type === 'time-log'}
											<div class="space-y-4">
												{#each section.days as day (day.id)}
													<div class="rounded-2xl border border-slate-200 bg-white p-3">
														<div class="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
															<label class="block">
																<span class="mb-1 block text-xs font-semibold text-slate-600">Day / Date</span>
																<input
																	bind:value={day.dateISO}
																	class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500"
																	type="date"
																/>
															</label>

															<div class="flex flex-wrap gap-2">
																<button type="button" class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700" onclick={() => addEntry(day)}>Add Log Entry</button>
																<button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm" onclick={() => removeDay(section, day.id)}>Delete Day</button>
															</div>
														</div>

														<p class="mb-3 text-xs font-semibold text-slate-600">{formatDayDate(day.dateISO) || 'Select a date to generate the day name.'}</p>

														<div class="space-y-2">
															{#each day.entries as entry (entry.id)}
																<div class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[140px_1fr_auto]">
																	<label class="block">
																		<span class="mb-1 block text-xs font-semibold text-slate-600">Time</span>
																		<input bind:value={entry.time} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500" inputmode="numeric" placeholder="0700" type="text" />
																	</label>

																	<label class="block">
																		<span class="mb-1 block text-xs font-semibold text-slate-600">Activity</span>
																		<input bind:value={entry.text} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500" placeholder="Arrive on site" type="text" />
																	</label>

																	<div class="flex items-end">
																		<button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm" onclick={() => removeEntry(day, entry.id)}>Delete</button>
																	</div>
																</div>
															{/each}
														</div>
													</div>
												{/each}

												<button type="button" class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700" onclick={() => addDay(section)}>Add Day</button>
											</div>
										{:else}
									<!-- photos -->
											<div class="space-y-3">
												{#if !section.locked}
													<label class="block">
														<span class="mb-1 block text-xs font-semibold text-slate-600">Section Title</span>
														<input bind:value={section.title} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500" placeholder="Section title" type="text" />
													</label>
												{/if}

												<label class="block">
													<span class="mb-1 block text-xs font-semibold text-slate-600">Section Summary</span>
													<textarea bind:value={section.description} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500" placeholder="Add a short description for this section..." rows="3"></textarea>
												</label>

												<div class="space-y-3">
													<div class="flex flex-wrap gap-2">
														<label class="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">
															<span>Upload</span>
															<input accept="image/*" class="hidden" multiple type="file" onchange={(event) => handlePhotoInput(section.id, event)} />
														</label>

														<label class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
															<span>Camera</span>
															<input accept="image/*" capture="environment" class="hidden" type="file" onchange={(event) => handlePhotoInput(section.id, event)} />
														</label>
													</div>

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
															<div class="rounded-2xl border border-slate-200 bg-white p-2">
																<div class="photo-tile relative overflow-hidden rounded-xl bg-slate-100">
																	<img alt={photo.caption || photo.name} class="h-full w-full object-cover" src={photo.src} />
																	<button type="button" aria-label="Remove photo" class="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow" onclick={() => removePhoto(section, photo.id)}>✕</button>
																</div>

																<label class="mt-2 block">
																	<span class="mb-1 block text-xs font-semibold text-slate-600">Caption</span>
																	<input bind:value={photo.caption} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500" type="text" />
																</label>
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
			<section class:hidden={!isDesktop && activeTab !== 'preview'} class="min-h-0 md:col-span-7 md:block md:pt-6">
				<div class="flex h-full min-h-0 flex-col">
					<div class="preview-toolbar shrink-0 px-4 pb-3 md:px-2">
						<div class="flex w-full flex-wrap gap-2 md:justify-end">
								{#each exportFormats as format (format)}
									<button
										type="button"
										class={`rounded-xl border px-3 py-2 text-xs font-semibold ${format === 'PDF' ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
										disabled={format !== 'PDF' || isExporting}
										onclick={() => handleExport(format)}
									>
										{format === 'PDF' && isExporting ? 'Exporting…' : format}
									</button>
								{/each}
						</div>
					</div>

					<!-- preview content -->
					<div class="min-h-0 flex-1 overflow-hidden">
						<div
							bind:this={previewViewport}
							role="region"
							aria-label="Preview pages"
							class="preview-viewport"
							onwheel={handlePreviewWheel}
							ontouchstart={handlePreviewTouchStart}
							ontouchmove={handlePreviewTouchMove}
							ontouchend={handlePreviewTouchEnd}
						>
							<div class="preview-stage">
								<div class="preview-scale" style={`--preview-zoom: ${previewZoom || 1}`}>
									<div bind:this={previewPages} class="preview-pages">
										<div class="preview-page">
											<div class="preview-page-inner">
												<h1 class="text-2xl font-bold text-slate-900">{reportSection?.fields.reportTitle || 'Survey Report'}</h1>

												<div class="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
													{#each coverMeta as item (item.label)}
														<div class="grid grid-cols-[100px_1fr] gap-3">
															<span class="font-semibold text-slate-600">{item.label}:</span>
															<span class="text-slate-800">{item.value}</span>
														</div>
													{/each}
												</div>
											</div>
										</div>

										<div class="preview-page">
											<div class="preview-page-inner">
												<h2 class="mb-3 text-lg font-bold text-slate-900">Table of Contents</h2>
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

										{#each previewContentSections as section (section.id)}
											<div class="preview-page">
												<div class="preview-page-inner">
													{#if section.type === 'time-log'}
														<h2 class="mb-3 text-lg font-bold text-slate-900">{section.title}</h2>
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
													{:else}
														<h2 class="mb-3 text-lg font-bold text-slate-900">{section.title}</h2>
														{#if section.description}
															<p class="mb-3 text-sm text-slate-600">{section.description}</p>
														{/if}

														<div class="grid gap-3 sm:grid-cols-2">
															{#if section.photos.length}
																{#each section.photos as photo (photo.id)}
																	<figure class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
																		<img alt={photo.caption || photo.name} class="h-48 w-full object-cover" src={photo.src} />
																		<figcaption class="p-3 text-xs text-slate-600">{photo.caption || photo.name || 'Photo'}</figcaption>
																	</figure>
																{/each}
															{:else}
																<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No photos added yet.</div>
															{/if}
														</div>
													{/if}
												</div>
											</div>
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

	.drop-target {
		outline: 2px dashed #2563eb;
		outline-offset: 4px;
	}

	.photo-tile {
		aspect-ratio: 4 / 3;
	}

	.page-shell {
		background-color: #eef2f7;
		background-image: radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.24) 1.05px, transparent 0);
		background-size: 16px 16px;
	}

	.preview-viewport {
		height: 100%;
		width: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		background: transparent;
		padding: 8px 4px 24px;
		touch-action: pan-y pinch-zoom;
	}

	.preview-toolbar {
		position: relative;
		z-index: 1;
	}

	.preview-stage {
		position: relative;
		width: 100%;
		padding: 8px 0 64px;
	}

	.preview-scale {
		position: relative;
		left: 50%;
		transform-origin: top center;
		transform: translateX(-50%) scale(var(--preview-zoom, 1));
		will-change: transform;
	}

	.preview-pages {
		display: flex;
		flex-direction: column;
		gap: 16px;
		align-items: center;
	}

	.preview-page {
		width: 8.5in;
		min-height: 11in;
		box-sizing: border-box;
		aspect-ratio: 8.5 / 11;
		background: #fff;
		border: 1px solid #dbe3ef;
		border-radius: 16px;
		box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
		overflow: hidden;
	}

	.preview-page-inner {
		height: 100%;
		padding: 28px;
		overflow: hidden;
	}

	.preview-page-inner * {
		max-width: 100%;
	}

	@media (max-width: 767px) {
		.preview-page {
			border-radius: 14px;
		}

		.preview-page-inner {
			padding: 18px;
		}
	}
</style>