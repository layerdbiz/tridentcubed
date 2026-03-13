<script lang="ts">
	import {
		Grid,
		Logo,
		Button,
		Input,
		Content,
		Text,
		Divider,
		mq,
		Accordion,
		AccordionTitle,
		AccordionContent,
		Draggable
	} from '@layerd/ui';
	import type { DroppableParams } from '@layerd/ui';
	import { browser } from '$app/environment';
	import { flip } from 'svelte/animate';
	import { onMount, tick } from 'svelte';
	import type { Tab, Section, CoverSection, PhotosSection, TimeLogSection, TimeDay, PersistedState } from '$lib/types';
	import { storageKey, detailFields, metricStatusCaptionClass, overallProgressRingRadius, overallProgressRingCircumference, previewPageWidth, previewPageHeight, previewZoomMin, previewZoomMax, previewDesktopPadding, previewMobilePadding, previewMobileGap, previewMobileVisiblePages } from '$lib/constants';
	import type { ExportFormat } from '$lib/constants';
	import { clamp } from '$lib/utils/math';
	import { slugify, formatDayDate } from '$lib/utils/format';
	import {
		createPhotoItem,
		hydratePhotoDimensions,
		getPreviewPhotoGridClass,
		getPreviewPhotoCardClass,
		getPreviewPhotoFrameHeight
	} from '$lib/utils/photo';
	import {
		getSectionMetrics,
		getOverallMetrics,
		getSectionStatusLabel,
		getSectionStatusTextClass,
		getSectionProgressFillClass,
		getProgressRingOffset
	} from '$lib/utils/metrics';
	import { setStorageItem, removeStorageItem } from '$lib/utils/storage';
	import {
		createTimeEntry,
		createTimeDay,
		createPhotoSection,
		createDefaultState,
		isSectionMovable,
		ensureAtLeastOneDay,
		ensureAtLeastOneEntry,
		getNextCustomSectionNumber
	} from '$lib/sections';
	import { syncIdCounterFromSections } from '$lib/utils/id';
	import { loadState } from '$lib/normalize';
	import PreviewPage from '$lib/components/PreviewPage.svelte';

	const sectionSortType = 'report-section';
	const photoSortTypePrefix = 'report-photo:';

	const baseState = createDefaultState();

	let activeTab = $state<Tab>(baseState.activeTab);
	let previewZoom = $state(baseState.previewZoom);
	let hasUserZoomed = $state(baseState.hasUserZoomed);
	let sections = $state<Section[]>(baseState.sections);
	let draggedSectionId = $state('');
	let draggedPhotoId = $state('');
	let photoDropId = $state('');
	let hydrated = $state(false);
	let previewViewport = $state<HTMLDivElement | null>(null);
	let previewPages = $state<HTMLDivElement | null>(null);
	let pinch = $state<{ startDist: number; startZoom: number; midY: number } | null>(null);
	let isExporting = $state(false);
	let suppressSectionToggleId = '';
	let suppressSectionToggleUntil = 0;

	const draggable = new Draggable({});

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

	function getPhotoSortType(sectionId: string) {
		return `${photoSortTypePrefix}${sectionId}`;
	}

	const { addDroppable, addHandle } = draggable;

	function setSections(nextSections: unknown[]) {
		sections = nextSections as Section[];
	}

	function setSectionPhotos(section: PhotosSection, nextPhotos: unknown[]) {
		section.photos = nextPhotos as PhotosSection['photos'];
	}

	function addSortableSection(node: HTMLElement, section: Section) {
		if (!isSectionMovable(section)) return;

		return draggable.addDraggable(node, {
			item: () => section,
			type: sectionSortType,
			accept: [sectionSortType]
		});
	}

	function addSortableSectionHandle(node: HTMLElement, section: Section) {
		if (!isSectionMovable(section)) return;

		return addHandle(node);
	}

	function addSortablePhoto(node: HTMLElement, args: { section: PhotosSection; photo: PhotosSection['photos'][number] }) {
		const sortType = getPhotoSortType(args.section.id);

		return draggable.addDraggable(node, {
			item: () => args.photo,
			type: sortType,
			accept: [sortType]
		});
	}

	function handleDraggableDragStart(event: any) {
		const item = event.operation?.source?.data?.item?.();
		const type = event.operation?.source?.data?.type;

		if (!item?.id) return;

		if (type === sectionSortType) {
			draggedSectionId = item.id;
			suppressSectionToggle(item.id);
			return;
		}

		if (typeof type === 'string' && type.startsWith(photoSortTypePrefix)) {
			draggedPhotoId = item.id;
		}
	}

	function clearDraggedItems() {
		draggedSectionId = '';
		draggedPhotoId = '';
	}

	function applyState(next: PersistedState) {
		activeTab = next.activeTab;
		previewZoom = next.previewZoom;
		hasUserZoomed = next.hasUserZoomed;
		sections = next.sections;
	}

	function handleAccordionToggle(sectionId: string, event: Event) {
		const details = event.currentTarget as HTMLDetailsElement | null;
		if (!details) return;

		for (const section of sections) {
			section.open = section.id === sectionId ? details.open : false;
		}
	}

	function addSection() {
		const nextNumber = getNextCustomSectionNumber(sections);
		const insertIndex = sections.findIndex((section) => section.placement === 'end');
		for (const section of sections) section.open = false;

		const nextSection = createPhotoSection(`Section ${nextNumber}`, '🧩', false);
		if (insertIndex === -1) {
			sections.push(nextSection);
			return;
		}

		sections.splice(insertIndex, 0, nextSection);
	}

	function removeSection(sectionId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.locked || section.placement !== 'middle' || !browser) return;

		const okay = window.confirm(`Delete ${section.title}? This cannot be undone.`);
		if (!okay) return;

		sections = sections.filter((item) => item.id !== sectionId);

		if (draggedSectionId === sectionId) draggedSectionId = '';
		if (photoDropId === sectionId) photoDropId = '';
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

		if (draggedPhotoId === photoId) draggedPhotoId = '';
	}

	function getSortedEntries(day: TimeDay) {
		return [...day.entries].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
	}

	function suppressSectionToggle(sectionId: string) {
		suppressSectionToggleId = sectionId;
		suppressSectionToggleUntil = Date.now() + 400;
	}

	function handleSectionTitleClick(sectionId: string, event: MouseEvent) {
		if (suppressSectionToggleId === sectionId && Date.now() < suppressSectionToggleUntil) {
			suppressSectionToggleId = '';
			event.preventDefault();
			return;
		}

		suppressSectionToggleId = '';
	}

	function handleSectionActionClick(event: MouseEvent, sectionId: string) {
		event.preventDefault();
		event.stopPropagation();
		removeSection(sectionId);
	}

	function handleSectionActionDisabledClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
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
			const markup = Array.from(previewPages.querySelectorAll('[data-export-page]'))
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
		removeStorageItem(storageKey);
		applyState(createDefaultState());
		clearDraggedItems();
		photoDropId = '';
	}

	onMount(() => {
		void (async () => {
			draggable.manager.monitor.addEventListener('dragstart', handleDraggableDragStart);
			draggable.manager.monitor.addEventListener('dragend', clearDraggedItems);

			const next = loadState();
			syncIdCounterFromSections(next.sections);
			applyState(next);
			const didHydratePhotoDimensions = await hydratePhotoDimensions(next.sections);
			if (didHydratePhotoDimensions) sections = [...sections];
			hydrated = true;
			await tick();
			applyFitZoomIfNeeded();
		})();

		return () => {
			draggable.manager.monitor.removeEventListener('dragstart', handleDraggableDragStart);
			draggable.manager.monitor.removeEventListener('dragend', clearDraggedItems);
			draggable.destroy();
		};
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		setStorageItem(storageKey, { activeTab, previewZoom, hasUserZoomed, sections });
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

								<!-- progress bar -->
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

					<!-- create controls -->
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
					<div id="createContentPanels"
						class="min-h-0 flex-1 space-y-3 overflow-auto p-4 pt-4"
						use:addDroppable={{
							items: { get: () => sections, set: (items: unknown[]) => setSections(items) },
							accept: [sectionSortType]
						}}
					>
						{#each sections as section (section.id)}
							{@const metrics = getSectionMetrics(section)}
							{@const sectionStatusLabel = getSectionStatusLabel(metrics)}
							{@const sectionStatusTextClass = getSectionStatusTextClass(metrics)}
							{@const sectionProgressFillClass = getSectionProgressFillClass(metrics)}

<!-- panels -->
<div
	animate:flip={{ duration: 180 }}
	class="relative"
	data-dragging={draggedSectionId === section.id ? 'true' : 'false'}
					use:addSortableSection={section}
>
								<Accordion
									class="rounded-2xl border border-slate-200 bg-white"
									name="report-sections"
									open={section.open}
									ontoggle={(event: Event) => handleAccordionToggle(section.id, event)}
							>
								<AccordionTitle
									class="block w-full cursor-pointer p-4 text-left"
									onclick={(event: MouseEvent) => handleSectionTitleClick(section.id, event)}
								>
									<div class="flex items-start gap-3">
										{#if isSectionMovable(section)}
											<div
												class="touch-reorder-handle flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-2xl text-slate-700 cursor-grab active:cursor-grabbing"
												use:addSortableSectionHandle={section}
												aria-label={`Reorder ${section.title}`}
											>
												{section.icon}
											</div>
										{:else}
											<div class="flex h-10 w-10 shrink-0 items-center justify-center text-3xl">{section.icon}</div>
										{/if}
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

										{#if isSectionMovable(section)}
											<Button
												variant="icon"
												icon="close"
												class="mt-0.5 shrink-0 text-[8px]!"
												aria-label={`Delete ${section.title}`}
												onclick={(event: MouseEvent) => handleSectionActionClick(event, section.id)}
											/>
										{:else}
											<Button
												variant="icon"
												icon="lock"
												class="mt-0.5 shrink-0 text-[8px]! text-secondary-400 bg-secondary-200 opacity-100"
												aria-label={`${section.title} is locked`}
												onclick={handleSectionActionDisabledClick}
											/>
										{/if}
									</div>
								</AccordionTitle>

								<!-- panel content -->
								<AccordionContent class="border-t border-slate-200 p-4">

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

													<div
														class="grid grid-cols-2 gap-3"
														use:addDroppable={{
															items: {
																get: () => section.photos,
																set: (items: unknown[]) => setSectionPhotos(section, items)
															},
															accept: [getPhotoSortType(section.id)]
														}}
													>
														{#each section.photos as photo (photo.id)}
															<div
																animate:flip={{ duration: 180 }}
																class="rounded-2xl bg-white p-2"
																data-dragging={draggedPhotoId === photo.id ? 'true' : 'false'}
																role="presentation"
																use:addSortablePhoto={{ section, photo }}
															>
																<div
																	class="relative rounded-xl aspect-square bg-slate-100"
																>
																	<img alt={photo.caption || photo.name} class="h-full w-full object-cover rounded-lg" draggable="false" src={photo.src} />

																	<div
																		class="touch-reorder-handle absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-black text-slate-700 shadow-sm cursor-grab active:cursor-grabbing"
																		use:addHandle
																		aria-label={`Reorder ${photo.caption || photo.name || 'photo'}`}
																	>
																		::
																	</div>
																	
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
								</AccordionContent>
							</Accordion>
							</div>
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
										<PreviewPage innerClass="flex flex-col items-center justify-center gap-6 relative">
											
												<!-- Top Cover Page-->
												<div id="topCoverPage" class="flex flex-col items-center justify-center gap-6 mb-50">
													<Logo mode="light" class="size-42" />
													<Text h1={reportSection?.fields.reportTitle || 'Survey Report'} class="text-6xl uppercase font-black" />
													<Text h2={reportSection?.fields.reportTitle || 'Survey Report'} class="font-semibold text-pretty text-3xl text-secondary-500 text-center" />
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
										</PreviewPage>

										<!-- 2. TOC 
										------------------------------>
										<PreviewPage>
											<Text h2="Table of Contents" class="text-4xl mb-4"/>
											<div class="space-y-2 text-sm">
												{#each tableOfContentsEntries as item (item.id)}
													<div class="grid grid-cols-[1fr_auto] gap-3 border-b border-dashed border-slate-200 pb-1">
														<span class="font-medium text-slate-700">{item.title}</span>
														<span class="text-slate-500">{item.page}</span>
													</div>
												{/each}
											</div>
										</PreviewPage>

										{#each previewContentSections as section (section.id)}
											
											<!-- 3. TIME LOG
											------------------------------>
											{#if section.type === 'time-log'}
												<PreviewPage>
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
												</PreviewPage>
												
											<!-- 4. PHOTOS
											------------------------------>
											{:else}
												<PreviewPage>
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
												</PreviewPage>
											{/if}
										{/each}

										<!-- DISCLAIMER
										------------------------------>
										<PreviewPage>
											<Content class="prose prose-sm">
												<h2>Standard Disclaimer</h2>
												<p>This Cargo Survey Report is prepared based on the observations, conditions, and information available to the undersigned at the time of the inspection. The findings and conclusions herein are made to the best of our knowledge and belief, but are subject to the following limitations:</p>
												<ul class="max-w-lg text-balance prose prose-xs grid gap-1">
													<li><b>Scope Limitation:</b> The survey was conducted without dismantling or intrusive testing unless explicitly stated otherwise. Our observations are limited to visible and accessible parts of the cargo.</li>
													<li><b>No Warranty:</b> This report does not constitute a warranty or guarantee of the cargo's condition, quality, or fitness for any particular purpose. It is not a guarantee against latent defects or conditions not apparent at the time of inspection.</li>
													<li><b>Use Limitation:</b> This report is provided solely for the use of the party to whom it is addressed. No liability is assumed by the Company or the undersigned for any use or reliance by third parties. </li>
													<li><b>Liability Limitation:</b> The liability of the Company and the undersigned, if any, arising from this report shall be limited to the fee charged for this service. We shall not be liable for any indirect, consequential, or special damages, including but not limited to loss of profit or business interruption.</li>
													<li><b>Accuracy of Information:</b> The accuracy of this report depends on the information provided by the client and others involved. We do not guarantee the accuracy of such third-party information.</li>
													<li><b>Right to Amend:</b> We reserve the right to amend or supplement this report should additional pertinent information become available.</li>
													<li><b>Legal Context:</b> This report is not intended to be used for legal proceedings without the express written consent of the Company.</li>
													<li><b>No Endorsement:</b> This survey does not endorse or approve the cargo for any specific use or handling beyond what is stated in the report.</li>
												</ul>
												<p>Please note that this report reflects the situation as observed on a date of Inspection and may not reflect subsequent changes or conditions.</p>
											</Content>
										</PreviewPage>

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

<style lang="postcss">
	@reference "../app.css";

	[data-dragging='true'] {
		@apply border-2 border-primary;
	}

	.page-shell {
		background-color: #eef2f7;
		background-image: radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.24) 1.05px, transparent 0);
		background-size: 16px 16px;
	}

</style>