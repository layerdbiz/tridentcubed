<script lang="ts">
	import { Button } from '@layerd/ui';
	import { Disclosure } from '$lib';
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';

	type Tab = 'create' | 'preview';
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

	interface DetailsSection {
		id: string;
		type: 'details';
		title: string;
		icon: string;
		open: boolean;
		fields: DetailsFields;
		photos: PhotoItem[];
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

	interface TimeLogSection {
		id: string;
		type: 'time-log';
		title: string;
		icon: string;
		open: boolean;
		days: TimeDay[];
		photos: PhotoItem[];
	}

	interface PhotosSection {
		id: string;
		type: 'photos';
		title: string;
		icon: string;
		open: boolean;
		description: string;
		photos: PhotoItem[];
	}

	type Section = DetailsSection | TimeLogSection | PhotosSection;

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

	const storageKey = 'survey-report-mvp-v3';
	const exportFormats = ['PDF', 'DOCX', 'HTML', 'MD'] as const;
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

	const createTimeEntry = (): TimeEntry => ({ id: nextId('entry'), time: '', text: '' });
	const createTimeDay = (): TimeDay => ({ id: nextId('day'), dateISO: '', entries: [createTimeEntry()] });
	const createPhotoSection = (title: string, icon: string, open = false): PhotosSection => ({
		id: nextId('section'),
		type: 'photos',
		title,
		icon,
		open,
		description: '',
		photos: []
	});

	const createDefaultState = (): PersistedState => ({
		activeTab: 'create',
		previewZoom: 1,
		hasUserZoomed: false,
		sections: [
			{
				id: 'section-report-details',
				type: 'details',
				title: 'Project Report',
				icon: '📄',
				open: true,
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
			},
			{
				id: 'section-time-log',
				type: 'time-log',
				title: 'Time Log',
				icon: '⏱️',
				open: false,
				days: [createTimeDay()],
				photos: []
			},
			{
				id: 'section-cargo-photos',
				type: 'photos',
				title: 'Cargo Operations Photos',
				icon: '📷',
				open: false,
				description: '',
				photos: []
			}
		]
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
	let pinch = $state<{ startDist: number; startZoom: number; midY: number } | null>(null);

	const isDesktop = $derived(innerWidth >= 768);
	const overallMetrics = $derived(getOverallMetrics(sections));
	const reportSection = $derived(sections.find((section) => section.type === 'details') as DetailsSection | undefined);
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
		const entries = Array.isArray((value as TimeDay)?.entries) ? (value as TimeDay).entries.map(normalizeTimeEntry) : [createTimeEntry()];
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
		const section = value as Partial<Section> & { fields?: Partial<DetailsFields>; days?: TimeDay[]; photos?: PhotoItem[] };
		const photos = Array.isArray(section.photos) ? section.photos.map(normalizePhotoItem).filter((photo) => photo.src) : [];

		if (section.type === 'details') {
			return {
				id: typeof section.id === 'string' ? section.id : 'section-report-details',
				type: 'details',
				title: typeof section.title === 'string' ? section.title : 'Project Report',
				icon: typeof section.icon === 'string' ? section.icon : '📄',
				open: Boolean(section.open),
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
				title: typeof section.title === 'string' ? section.title : 'Time Log',
				icon: typeof section.icon === 'string' ? section.icon : '⏱️',
				open: Boolean(section.open),
				days: days.length ? days : [createTimeDay()],
				photos
			};
		}

		return {
			id: typeof section.id === 'string' ? section.id : nextId('section'),
			type: 'photos',
			title: typeof section.title === 'string' ? section.title : `New Section ${index + 1}`,
			icon: typeof section.icon === 'string' ? section.icon : '🧩',
			open: Boolean(section.open),
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
			const normalizedSections = Array.isArray(parsed.sections) ? parsed.sections.map(normalizeSection) : next.sections;
			const hasOpenSection = normalizedSections.some((section) => section.open);

			return {
				activeTab: parsed.activeTab === 'preview' ? 'preview' : 'create',
				previewZoom: typeof parsed.previewZoom === 'number' ? parsed.previewZoom : 1,
				hasUserZoomed: typeof parsed.hasUserZoomed === 'boolean' ? parsed.hasUserZoomed : false,
				sections: hasOpenSection
					? normalizedSections
					: normalizedSections.map((section, sectionIndex) => ({ ...section, open: sectionIndex === 0 }))
			};
		} catch {
			return createDefaultState();
		}
	}

	function getSectionMetrics(section: Section): SectionMetrics {
		if (section.type === 'details') {
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

		const done = Number(Boolean(section.description.trim())) + Number(section.photos.length > 0);
		const total = 2;
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

	function setSectionOpen(sectionId: string, nextOpen: boolean) {
		for (const section of sections) {
			section.open = section.id === sectionId ? nextOpen : false;
		}
	}

	function addSection() {
		const nextNumber = sections.length + 1;
		for (const section of sections) section.open = false;
		sections.push(createPhotoSection(`New Section ${nextNumber}`, '🧩', true));
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

	function getSortedEntries(day: TimeDay) {
		return [...day.entries].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
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

	function clearDragState() {
		dragId = '';
		dropId = '';
	}

	function reorderSections(fromId: string, targetId: string) {
		if (!fromId || fromId === targetId) return;

		const fromIndex = sections.findIndex((section) => section.id === fromId);
		const targetIndex = sections.findIndex((section) => section.id === targetId);
		if (fromIndex < 0 || targetIndex < 0) return;

		const [moved] = sections.splice(fromIndex, 1);
		sections.splice(targetIndex, 0, moved);
	}

	function handleSectionDragStart(sectionId: string) {
		dragId = sectionId;
	}

	function handleSectionDragOver(sectionId: string, event: DragEvent) {
		event.preventDefault();
		if (dragId && dragId !== sectionId) dropId = sectionId;
	}

	function handleSectionDragLeave(sectionId: string) {
		if (dropId === sectionId) dropId = '';
	}

	function handleSectionDrop(sectionId: string, event: DragEvent) {
		event.preventDefault();
		reorderSections(dragId, sectionId);
		clearDragState();
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
		const baseWidth = 820;
		const paddingAllowance = 28;
		const available = Math.max(320, previewViewport.clientWidth - paddingAllowance);
		previewZoom = clamp(available / baseWidth, 0.2, 1);
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

<div class="h-svh overflow-hidden bg-slate-100 text-slate-900">
	<div class="mx-auto flex h-full max-w-7xl flex-col p-4 md:p-6">
		<header class="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Survey Report Generator MVP</p>
					<h1 class="text-xl font-bold text-slate-800 md:text-2xl">Create Report</h1>
				</div>

				<div class="flex items-center gap-3">
					<div class="relative h-12 w-12 shrink-0">
						<svg class="h-12 w-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
							<path
								d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
								fill="none"
								stroke="#e2e8f0"
								stroke-width="3"
							/>
							<path
								d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
								fill="none"
								stroke="#16a34a"
								stroke-width="3"
								stroke-linecap="round"
								stroke-dasharray={`${overallMetrics.percent} 100`}
							/>
						</svg>

						<div class="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700">
							<span>{overallMetrics.percent}%</span>
						</div>
					</div>

					<div class="min-w-0">
						<p class="text-sm font-semibold text-slate-700">Overall Progress</p>
						<p class="text-xs text-slate-500">{overallMetrics.done} of {overallMetrics.total} complete</p>
					</div>
					<Button appearance="outline" label="Reset" size="xs" class="border border-slate-300" onclick={resetReport} />
				</div>
			</div>

			<div class="mt-4">
				<div class="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
					<span>Completion</span>
					<span>{overallMetrics.percent}%</span>
				</div>

				<div class="h-2 overflow-hidden rounded-full bg-slate-200">
					<div class="h-full rounded-full bg-green-600 transition-all duration-300" style={`width: ${overallMetrics.percent}%`}></div>
				</div>
			</div>
		</header>

		<div class="mb-4 flex shrink-0 items-center gap-2 md:hidden">
			<Button label="Create" onclick={() => (activeTab = 'create')} />
			<Button label="Preview" onclick={() => (activeTab = 'preview')} />
		</div>

		<div class="grid min-h-0 flex-1 gap-4 md:grid-cols-12">
			<section class:hidden={!isDesktop && activeTab !== 'create'} class="min-h-0 md:col-span-5">
				<div class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div class="shrink-0 border-b border-slate-200 px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<h2 class="font-bold text-slate-800">Input Panels</h2>
								<p class="text-xs text-slate-500">Drag sections to reorder. Autosaves locally.</p>
							</div>

							<Button label="Add Section" primary onclick={addSection} />
						</div>
					</div>

					<div class="min-h-0 flex-1 space-y-3 overflow-auto p-4">
						{#each sections as section (section.id)}
							{@const metrics = getSectionMetrics(section)}
							<Disclosure
								icon={section.icon}
								title={section.title}
								open={section.open}
								done={metrics.done}
								total={metrics.total}
								percent={metrics.percent}
								draggable={true}
								dragging={dragId === section.id}
								dropTarget={Boolean(dragId && dragId !== section.id && dropId === section.id)}
								onToggle={(isOpen) => setSectionOpen(section.id, isOpen)}
								ondragstart={() => handleSectionDragStart(section.id)}
								ondragend={clearDragState}
								ondragover={(event) => handleSectionDragOver(section.id, event)}
								ondragleave={() => handleSectionDragLeave(section.id)}
								ondrop={(event) => handleSectionDrop(section.id, event)}
							>
								<div>
										{#if section.type === 'details'}
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
																<Button label="Add" size="xs" class="!w-18" onclick={() => addEntry(day)} />
																<Button label="Delete" size="xs" class="!w-18" appearance="outline" onclick={() => removeDay(section, day.id)} />
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
																		<Button label="Delete" size="xs" class="!w-18" appearance="outline" onclick={() => removeEntry(day, entry.id)} />
																	</div>
																</div>
															{/each}
														</div>
													</div>
												{/each}

												<Button label="Add Day" primary onclick={() => addDay(section)} />
											</div>
										{:else}
											<div class="space-y-3">
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
																	<Button label="✕" appearance="outline" class="absolute right-2 top-2 bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow" aria-label="Remove photo" onclick={() => removePhoto(section, photo.id)} />
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
								</Disclosure>
						{/each}
					</div>
				</div>
			</section>

			<section class:hidden={!isDesktop && activeTab !== 'preview'} class="min-h-0 md:col-span-7 md:block">
				<div class="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div class="shrink-0 border-b border-slate-200 px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<h2 class="text-base font-bold text-slate-800">Live Preview</h2>
								<p class="text-xs text-slate-500">Scroll to navigate. Ctrl/Cmd + Wheel or pinch to zoom.</p>
							</div>

							<div class="flex flex-wrap gap-2">
								{#each exportFormats as format (format)}
									<Button size="xs" label={format} />
								{/each}
							</div>
						</div>
					</div>

					<div class="min-h-0 flex-1 overflow-hidden p-0">
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
									<div class="preview-pages">
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
													{#each sections as section, index (section.id)}
														<div class="grid grid-cols-[1fr_auto] gap-3 border-b border-dashed border-slate-200 pb-1">
															<span class="font-medium text-slate-700">{section.title}</span>
															<span class="text-slate-500">{index + 3}</span>
														</div>
													{/each}
												</div>
											</div>
										</div>

										{#each sections as section (section.id)}
											<div class="preview-page">
												<div class="preview-page-inner">
													<h2 class="mb-3 text-lg font-bold text-slate-900">{section.title}</h2>

													{#if section.type === 'details'}
														<p class="text-sm text-slate-600">Core report details captured above.</p>
													{:else if section.type === 'time-log'}
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
		</div>
	</div>
</div>

<style>
	.photo-tile {
		aspect-ratio: 4 / 3;
	}

	.preview-viewport {
		height: 100%;
		width: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		background: #f1f5f9;
		padding: 16px 10px;
		touch-action: pan-y pinch-zoom;
	}

	.preview-stage {
		position: relative;
		width: 100%;
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
		width: 820px;
		aspect-ratio: 8.5 / 11;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
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
			width: 760px;
			border-radius: 14px;
		}

		.preview-page-inner {
			padding: 18px;
		}
	}
</style>