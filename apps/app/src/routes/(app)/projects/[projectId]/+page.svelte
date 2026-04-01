<script lang="ts">
	import {
		Grid,
		Logo,
		Button,
		InputNew,
		Content,
		Text,
		Divider,
		mq,
		Accordion,
		AccordionTitle,
		AccordionContent,
		Draggable,
		persist
	} from '@layerd/ui';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { pushState } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import * as projectConstants from '../projects.constants';
	import type { ExportFormatType } from '../projects.constants';
	import { fetchProjectDefinitions } from '../projects.remote';
	import * as projectSchemas from '../projects.schema';
	import * as projectUtils from '../projects.utils';
	import * as projectStates from '../projects.state';
	import Panels from './panels.svelte';
	import Preview from './preview.svelte';
	import type * as projectTypes from '../projects.types';

	const projectDefinitions = await fetchProjectDefinitions();
	const projectSchema = projectSchemas.createProjectSchema(projectDefinitions);
	const customPanelDefinition = projectSchemas.getPanelDefinition(projectSchema, 'Custom');
	const sectionSortType = 'report-section';
	const photoSortTypePrefix = 'report-photo:';
	const baseState = projectStates.createDefaultState(projectSchema);
	const projectPersist = persist.json<projectTypes.PersistedStateType>({
		key: projectConstants.storageKey,
		fallback: () => projectStates.createDefaultState(projectSchema)
	});

	type WorkspacePaneType = 'edit' | 'preview';
	type AccordionLayoutMetricType = {
		closedHeight: number;
		marginTop: number;
	};

	let previewZoom = $state(baseState.previewZoom);
	let hasUserZoomed = $state(baseState.hasUserZoomed);
	let sections = $state<projectTypes.SectionType[]>(baseState.sections);
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
	let accordionLayoutMetrics = $state<Record<string, AccordionLayoutMetricType>>({});

	const draggable = new Draggable({});
	const sectionSort = draggable.sort<projectTypes.SectionType>(sectionSortType);

	const isDesktop = $derived(!mq.sm);
	const activePane = $derived.by<WorkspacePaneType>(() => {
		if (page.state.projectPane === 'preview') return 'preview';
		if (page.state.projectPane === 'edit') return 'edit';
		return page.url.searchParams.get('pane') === 'preview' ? 'preview' : 'edit';
	});
	const overallMetrics = $derived(projectUtils.getOverallPanelMetrics(sections));
	const timeLogSection = $derived(sections.find((section) => section.type === 'time-log') as projectTypes.TimeLogSectionType | undefined);
	const photoSections = $derived(sections.filter((section) => section.type === 'photos') as projectTypes.PhotosSectionType[]);
	const fixedPhotoSections = $derived(photoSections.filter((section) => section.locked));
	const customPhotoSections = $derived(photoSections.filter((section) => !section.locked));
	const reportTitle = $derived(projectSchemas.getPanelFieldStringValue(sections, 'project.title') || 'Survey Report');
	const reportSubtitle = $derived(projectSchemas.getPanelFieldStringValue(sections, 'project.subtitle'));
	const exportFileName = $derived(`${projectUtils.slugify(reportTitle || 'survey-report')}.pdf`);
	const projectSummaryItems = $derived<projectTypes.PreviewSummaryItemType[]>([
		{ label: 'Organization', value: projectSchemas.getPanelFieldStringValue(sections, 'org.name') || '—' },
		{ label: 'Project', value: reportTitle || '—', emphasis: true },
		{ label: 'Client', value: projectSchemas.getPanelFieldStringValue(sections, 'client.company') || '—' },
		{ label: 'Facility', value: projectSchemas.getPanelFieldStringValue(sections, 'facility.name') || '—' },
		{ label: 'Carrier', value: projectSchemas.getPanelFieldStringValue(sections, 'carrier.name') || '—' },
		{ label: 'Items', value: projectSchemas.getPanelFieldStringValue(sections, 'items.title') || '—' }
	]);
	const personnelEntries = $derived.by<projectTypes.PreviewPersonnelItemType[]>(() => {
		const owner = projectSchemas.getPanelFieldStringValue(sections, 'team.owner').trim();
		const assigned = getSectionFieldValues('team.assigned').filter((name) => name !== owner);

		return [
			...(owner ? [{ name: owner, role: 'Project Owner', isPrimary: true }] : []),
			...assigned.map((name) => ({ name, role: 'Assigned Team Member' }))
		];
	});
	const previewPagesData = $derived.by<projectTypes.PreviewPageItemType[]>(() => {
		const items: projectTypes.PreviewPageItemType[] = [];
		const fixedPhotoSectionsByPanelId = new Map(
			fixedPhotoSections
				.filter((section): section is projectTypes.PhotosSectionType & { panelId: string } => Boolean(section.panelId))
				.map((section) => [section.panelId, section])
		);
		const fallbackPhotoSectionsByPageId = new Map(
			fixedPhotoSections
				.filter((section): section is projectTypes.PhotosSectionType & { pageId: string } => !section.panelId && Boolean(section.pageId))
				.map((section) => [section.pageId, section])
		);
		const enabledCustomSections = customPhotoSections.filter((section) => section.enabled);
		const disclaimerOrder = projectSchema.pages.reduce((max, item) => Math.max(max, item.order), 0);
		let customSectionsInserted = false;

		for (const pageDefinition of projectSchema.pages) {
			if (pageDefinition.order === 1) {
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page || projectSchema.coverPageTitle,
					kind: 'cover',
					pageDefinition,
					section: null
				});
				continue;
			}

			if (pageDefinition.order === 2 || pageDefinition.page === projectSchema.tocPageTitle) {
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page || projectSchema.tocPageTitle,
					kind: 'toc',
					pageDefinition,
					section: null
				});
				continue;
			}

			if (pageDefinition.page === projectSchema.timeLogPageTitle) {
				if (timeLogSection) {
					items.push({
						id: pageDefinition.id,
						title: pageDefinition.page,
						kind: 'time-log',
						pageDefinition,
						section: timeLogSection
					});
				}
				continue;
			}

			if (pageDefinition.order === disclaimerOrder || pageDefinition.page === projectSchema.disclaimerPageTitle) {
				for (const section of enabledCustomSections) {
					items.push({
						id: section.id,
						title: section.title,
						kind: 'photo',
						pageDefinition: null,
						section
					});
				}
				customSectionsInserted = true;
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page || projectSchema.disclaimerPageTitle,
					kind: 'disclaimer',
					pageDefinition,
					section: null
				});
				continue;
			}

			if (pageDefinition.variant === 'team') {
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page,
					kind: 'team',
					pageDefinition,
					section: null
				});
				continue;
			}

			if (pageDefinition.variant === 'template') {
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page,
					kind: 'template',
					pageDefinition,
					section: null
				});
				continue;
			}

			if (pageDefinition.variant === 'photo') {
				const derivedSection = createDerivedPhotoPreviewSection(pageDefinition);
				const panel = projectSchemas.getPanelForPhotoPage(projectSchema, pageDefinition);
				const section = panel
					? fixedPhotoSectionsByPanelId.get(panel.id) || fallbackPhotoSectionsByPageId.get(pageDefinition.id)
					: fallbackPhotoSectionsByPageId.get(pageDefinition.id);
				const resolvedSection = section || derivedSection;
				const hasDerivedContent = Boolean(
					derivedSection && (
						derivedSection.photos.length ||
						derivedSection.files.length ||
						derivedSection.description.trim()
					)
				);
				if (!resolvedSection) continue;
				if (section) {
					if (!resolvedSection.enabled && !pageDefinition.required) continue;
				} else if (!pageDefinition.required && (!hasDerivedContent || !resolvedSection.enabled)) {
					continue;
				}
				items.push({
					id: pageDefinition.id,
					title: pageDefinition.page,
					kind: 'photo',
					pageDefinition,
					section: resolvedSection
				});
			}
		}

		if (!customSectionsInserted) {
			for (const section of enabledCustomSections) {
				items.push({
					id: section.id,
					title: section.title,
					kind: 'photo',
					pageDefinition: null,
					section
				});
			}
		}

		return items;
	});
	const tableOfContentsEntries = $derived(
		previewPagesData.map((item, index) => ({
			id: `toc-${item.id}`,
			title: item.title,
			page: index + 1
		}))
	);
	const coverMeta = $derived([
		{ label: 'Facility', value: projectSchemas.getPanelFieldStringValue(sections, 'facility.name') || '—' },
		{
			label: 'Dates',
			value: (() => {
				const days = timeLogSection?.days.map((day) => day.dateISO).filter(Boolean).sort();
				if (!days?.length) return '—';
				if (days.length === 1) return projectUtils.formatDayDate(days[0]) || days[0];
				const firstDay = days[0];
				const lastDay = days[days.length - 1];
				return `${projectUtils.formatDayDate(firstDay) || firstDay} to ${projectUtils.formatDayDate(lastDay) || lastDay}`;
			})()
		},
		{ label: 'Client', value: projectSchemas.getPanelFieldStringValue(sections, 'client.company') || '—' },
		{ label: 'Owner', value: projectSchemas.getPanelFieldStringValue(sections, 'team.owner') || '—' },
		{ label: 'Project Type', value: projectSchemas.getPanelFieldStringValue(sections, 'project.type') || '—' }
	]);

	function getFieldValue(path: string): projectTypes.FieldStateValueType | undefined {
		for (const section of sections) {
			if ((section.type !== 'fields' && section.type !== 'cover') || !(path in section.fields)) {
				continue;
			}

			return section.fields[path];
		}

		return undefined;
	}

	function hasFieldValue(value: projectTypes.FieldStateValueType | undefined): boolean {
		if (Array.isArray(value)) {
			return value.some((item) => String(item || '').trim());
		}

		return String(value || '').trim().length > 0;
	}

	function getFieldValueList(value: projectTypes.FieldStateValueType | undefined): string[] {
		if (Array.isArray(value)) {
			return value.map((item) => String(item || '').trim()).filter(Boolean);
		}

		const text = String(value || '').trim();
		return text ? [text] : [];
	}

	function getOutputPageInputs(pageDefinition: projectTypes.PageDefinitionType) {
		return projectSchemas.getInputsForOutputPage(projectSchema, pageDefinition);
	}

	function getFieldImageItems(paths: string[]): projectTypes.PhotoItemType[] {
		const items: projectTypes.PhotoItemType[] = [];

		for (const path of paths) {
			const value = getFieldValue(path);
			const values = Array.isArray(value) ? value : [value];

			for (const item of values) {
				const src = String(item || '').trim();
				if (!src) continue;

				items.push({
					id: `derived-${path}-${items.length + 1}`,
					name: path,
					caption: '',
					src,
					width: 0,
					height: 0
				});
			}
		}

		return items;
	}

	function getFieldFileItems(paths: string[]): string[] {
		const items: string[] = [];

		for (const path of paths) {
			const value = getFieldValue(path);
			const values = Array.isArray(value) ? value : [value];

			for (const item of values) {
				const fileName = String(item || '').trim();
				if (!fileName) continue;
				items.push(fileName);
			}
		}

		return items;
	}

	function getOutputPagePhotoItems(
		outputInputs: projectTypes.InputDefinitionType[]
	): projectTypes.PhotoItemType[] {
		const items: projectTypes.PhotoItemType[] = [];

		for (const input of outputInputs) {
			if (input.input !== 'image') continue;

			const sources = getFieldValueList(getFieldValue(input.path));
			const captionInput = outputInputs.find((candidate) =>
				candidate.input === 'text' && candidate.reference.includes(input.id)
			);
			const captions = captionInput
				? getFieldValueList(getFieldValue(captionInput.path))
				: [];

			for (const [index, src] of sources.entries()) {
				items.push({
					id: `derived-${input.id}-${index + 1}`,
					name: input.label || input.path,
					caption: captions[index] || '',
					src,
					width: 0,
					height: 0
				});
			}
		}

		return items;
	}

	function getOutputPageDescription(
		pageDefinition: projectTypes.PageDefinitionType,
		outputInputs: projectTypes.InputDefinitionType[]
	): string {
		for (const input of outputInputs) {
			if (input.input !== 'textarea' && input.input !== 'richtext') continue;
			const value = projectSchemas.getPanelFieldStringValue(sections, input.path).trim();
			if (value) return value;
		}

		if (pageDefinition.page === 'Cargo Description') {
			return projectSchemas.getPanelFieldStringValue(sections, 'items.description') || projectSchemas.getPanelFieldStringValue(sections, 'items.title');
		}

		return '';
	}

	function getOutputPageVariant(
		pageDefinition: projectTypes.PageDefinitionType,
		outputInputs: projectTypes.InputDefinitionType[],
		photos: projectTypes.PhotoItemType[],
		files: string[]
	): string {
		const variantInput = outputInputs.find(
			(input) =>
				input.input === 'select' &&
				input.options.some((option) => option.startsWith('photos-'))
		);
		const configuredVariant = variantInput
			? projectSchemas.getPanelFieldStringValue(sections, variantInput.path).trim()
			: '';
		if (configuredVariant) return configuredVariant;

		if (pageDefinition.page === 'Introduction' || pageDefinition.page === 'Cargo Description') {
			return 'photos-1';
		}

		return photos.length + files.length <= 1 ? 'photos-1' : 'photos-4';
	}

	function createDerivedPhotoPreviewSection(
		pageDefinition: projectTypes.PageDefinitionType
	): projectTypes.PhotosSectionType | null {
		const outputInputs = getOutputPageInputs(pageDefinition);
		if (!outputInputs.length) return null;

		const mediaOwnerInput = outputInputs.find((input) => {
			if (input.input !== 'image' && input.input !== 'file') return false;
			return hasFieldValue(getFieldValue(input.path));
		}) || outputInputs.find((input) => input.input === 'image' || input.input === 'file') || outputInputs[0];
		const ownerPanel = mediaOwnerInput
			? projectSchemas.getPanelDefinition(projectSchema, mediaOwnerInput.panel)
			: projectSchemas.getPrimaryPanelForPage(projectSchema, pageDefinition);
		if (!ownerPanel) return null;

		const imagePaths = outputInputs
			.filter((input) => input.input === 'image' && !input.reference.length)
			.map((input) => input.path);
		const filePaths = outputInputs
			.filter((input) => input.input === 'file')
			.map((input) => input.path);
		const derivedPhotos = getOutputPagePhotoItems(outputInputs);
		const photos = derivedPhotos.length ? derivedPhotos : getFieldImageItems(imagePaths);
		const files = getFieldFileItems(filePaths);
		const description = getOutputPageDescription(pageDefinition, outputInputs);
		const ownerSection = ownerPanel
			? sections.find(
				(section) =>
					(section.type === 'fields' || section.type === 'cover') &&
					section.section === ownerPanel.title
			  ) as projectTypes.FieldSectionType | undefined
			: undefined;

		return {
			id: `derived-${pageDefinition.id}`,
			type: 'photos',
			title: pageDefinition.page,
			icon: ownerPanel.icon || '🖼️',
			open: false,
			locked: true,
			enabled: ownerSection?.enabled ?? true,
			placement: 'middle',
			description,
			variant: getOutputPageVariant(pageDefinition, outputInputs, photos, files),
			files,
			panelId: ownerPanel.id,
			pageId: pageDefinition.id,
			required: pageDefinition.required,
			photos
		};
	}

	function getSectionFieldValues(path: string): string[] {
		for (const section of sections) {
			if ((section.type !== 'fields' && section.type !== 'cover') || !(path in section.fields)) {
				continue;
			}

			const value = section.fields[path];
			if (Array.isArray(value)) {
				return value.map((item) => String(item || '').trim()).filter(Boolean);
			}

			return String(value || '')
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);
		}

		return [];
	}

	function setMobilePane(nextPane: WorkspacePaneType) {
		const url = new URL(page.url);
		if (nextPane === 'preview') {
			url.searchParams.set('pane', 'preview');
		} else {
			url.searchParams.delete('pane');
		}

		pushState(`${url.pathname}${url.search}`, { ...page.state, projectPane: nextPane });
	}

	function getPhotoSortType(sectionId: string) {
		return `${photoSortTypePrefix}${sectionId}`;
	}

	function getAccordionAnchorId(sectionId: string) {
		return `report-section-${sectionId}`;
	}

	function getPhotoSort(sectionId: string) {
		return draggable.sort<projectTypes.PhotosSectionType['photos'][number]>(getPhotoSortType(sectionId));
	}

	function setSections(nextSections: unknown[]) {
		sections = nextSections as projectTypes.SectionType[];
	}

	function setSectionPhotos(section: projectTypes.PhotosSectionType, nextPhotos: unknown[]) {
		section.photos = nextPhotos as projectTypes.PhotosSectionType['photos'];
	}

	function measureAccordionLayout(node: HTMLElement, params: { sectionId: string; index: number }) {
		let currentParams = params;
		let frameId = 0;
		const summaryElement = node.querySelector('summary');

		const measure = () => {
			const detailsElement = node.querySelector('details');
			if (!(detailsElement instanceof HTMLDetailsElement) || !(summaryElement instanceof HTMLElement)) return;

			const detailsStyles = window.getComputedStyle(detailsElement);
			const wrapperStyles = window.getComputedStyle(node);
			const closedHeight =
				summaryElement.getBoundingClientRect().height +
				parseFloat(detailsStyles.borderTopWidth || '0') +
				parseFloat(detailsStyles.borderBottomWidth || '0');
			const marginTop = parseFloat(wrapperStyles.marginTop || '0');

			accordionLayoutMetrics[currentParams.sectionId] = { closedHeight, marginTop };
		};

		const scheduleMeasure = () => {
			cancelAnimationFrame(frameId);
			frameId = requestAnimationFrame(measure);
		};

		scheduleMeasure();

		const resizeObserver = summaryElement instanceof HTMLElement ? new ResizeObserver(scheduleMeasure) : null;

		if (resizeObserver && summaryElement instanceof HTMLElement) {
			resizeObserver.observe(summaryElement);
		}

		return {
			update(nextParams: { sectionId: string; index: number }) {
				currentParams = nextParams;
				scheduleMeasure();
			},
			destroy() {
				cancelAnimationFrame(frameId);
				resizeObserver?.disconnect();
			}
		};
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

	function applyState(next: projectTypes.PersistedStateType) {
		previewZoom = next.previewZoom;
		hasUserZoomed = next.hasUserZoomed;
		sections = next.sections;
	}

	function handleAccordionToggle(sectionId: string, event: Event) {
		const details = event.currentTarget as HTMLDetailsElement | null;
		if (!details) return;

		const section = sections.find((item) => item.id === sectionId);
		if (!section) return;
		if (!section.enabled) {
			details.open = false;
			section.open = false;
			return;
		}

		section.open = details.open;
	}

	function addSection() {
		const nextNumber = projectStates.getNextCustomPanelNumber(sections);
		for (const section of sections) section.open = false;

		sections.push(
			projectStates.createPhotoSection(
				`Section ${nextNumber}`,
				customPanelDefinition?.icon || '🧩',
				projectSchema.customVariantOptions[0] || 'photos-4',
				false
			)
		);
	}

	function setSectionFieldValue(sectionId: string, path: string, value: projectTypes.FieldStateValueType) {
		const sectionIndex = sections.findIndex(
			(item) => item.id === sectionId && (item.type === 'fields' || item.type === 'cover')
		);
		if (sectionIndex === -1) return;

		const section = sections[sectionIndex] as projectTypes.FieldSectionType;
		const nextSection: projectTypes.FieldSectionType = {
			...section,
			fields: {
				...section.fields,
				[path]: value
			}
		};

		sections = sections.map((item, index) => (index === sectionIndex ? nextSection : item));
	}

	function toggleSectionEnabled(sectionId: string) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || !section.locked) return;

		if (section.type === 'photos') {
			if (section.required) return;
			section.enabled = !section.enabled;
			if (!section.enabled) {
				section.open = false;
			}
			return;
		}

		if (section.type !== 'fields' && section.type !== 'cover') return;

		const panelDefinition = projectSchemas.getPanelDefinition(projectSchema, section.section);
		if (!panelDefinition || panelDefinition.required) return;

		section.enabled = !section.enabled;
		if (!section.enabled) {
			section.open = false;
		}
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

	function addDay(section: projectTypes.TimeLogSectionType) {
		section.days.push(projectStates.createTimeDay());
	}

	function removeDay(section: projectTypes.TimeLogSectionType, dayId: string) {
		section.days = section.days.filter((day) => day.id !== dayId);
		projectStates.ensureAtLeastOneDay(section);
	}

	function addEntry(day: projectTypes.TimeDayType) {
		day.entries.push(projectStates.createTimeEntry());
	}

	function maybeAddEntry(day: projectTypes.TimeDayType, entryId: string) {
		const entryIndex = day.entries.findIndex((entry) => entry.id === entryId);
		if (entryIndex === -1 || entryIndex !== day.entries.length - 1) return;

		const entry = day.entries[entryIndex];
		const timeValue = String(entry.time ?? '').trim();
		const textValue = String(entry.text ?? '').trim();
		if (!timeValue || !textValue) return;

		addEntry(day);
	}

	function handleActivityKeyup(day: projectTypes.TimeDayType, entryId: string, event?: KeyboardEvent) {
		if (event?.key !== 'Enter') return;

		event.preventDefault();
		maybeAddEntry(day, entryId);
	}

	function removeEntry(day: projectTypes.TimeDayType, entryId: string) {
		day.entries = day.entries.filter((entry) => entry.id !== entryId);
		projectStates.ensureAtLeastOneEntry(day);
	}

	async function addPhotosToSection(sectionId: string, fileList: FileList | File[] | null | undefined) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section || section.type !== 'photos' || !fileList?.length) return;

		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;

			section.photos.push(await projectUtils.createPhotoItem(file));
		}
	}

	async function handlePhotoInput(sectionId: string, event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		await addPhotosToSection(sectionId, input?.files ?? null);
		if (input) input.value = '';
	}

	function removePhoto(section: projectTypes.PhotosSectionType, photoId: string) {
		section.photos = section.photos.filter((photo) => photo.id !== photoId);

		if (draggedPhotoId === photoId) draggedPhotoId = '';
	}

	function getSortedEntries(day: projectTypes.TimeDayType) {
		return [...day.entries].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
	}

	function suppressSectionToggle(sectionId: string) {
		suppressSectionToggleId = sectionId;
		suppressSectionToggleUntil = Date.now() + 400;
	}

	function handleSectionTitleClick(sectionId: string, event: MouseEvent) {
		const section = sections.find((item) => item.id === sectionId);
		if (!section) return;

		if (!section.enabled) {
			event.preventDefault();
			return;
		}

		if (suppressSectionToggleId === sectionId && Date.now() < suppressSectionToggleUntil) {
			suppressSectionToggleId = '';
			event.preventDefault();
			return;
		}

		suppressSectionToggleId = '';

		const createContentPanels = (event.currentTarget as HTMLElement | null)?.closest('#createContentPanels');
		if (!(createContentPanels instanceof HTMLElement)) return;

		let targetScrollTop = 0;

		for (const section of sections) {
			const metric = accordionLayoutMetrics[section.id];
			if (!metric) continue;

			if (section.id === sectionId) {
				targetScrollTop += metric.marginTop;
				break;
			}

			targetScrollTop += metric.closedHeight + metric.marginTop;
		}

		createContentPanels.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
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

	async function handleExport(format: ExportFormatType) {
		if (format !== 'PDF' || !browser || !previewPages || isExporting) return;

		isExporting = true;

		try {
			const markup = Array.from(previewPages.querySelectorAll('.preview-page'))
				.map((item) => item.outerHTML)
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
			(sections.find((section) => section.open && section.type === 'photos') as projectTypes.PhotosSectionType | undefined) ||
			(sections.find((section) => section.type === 'photos') as projectTypes.PhotosSectionType | undefined);
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
			previewZoom = projectUtils.clamp(previewZoom || bounds.initial, bounds.min, bounds.max);
			return;
		}

		previewZoom = bounds.initial;
	}

	function getPreviewZoomBounds() {
		if (!previewViewport) {
			return {
				min: projectConstants.previewZoomMin,
				max: projectConstants.previewZoomMax,
				initial: projectConstants.previewZoomMax
			};
		}

		const availableWidth = Math.max(
			200,
			previewViewport.clientWidth - (isDesktop ? projectConstants.previewDesktopPadding : projectConstants.previewMobilePadding)
		);
		const fitWidthZoom = projectUtils.clamp(
			availableWidth / projectConstants.previewPageWidth,
			projectConstants.previewZoomMin,
			projectConstants.previewZoomMax
		);

		if (isDesktop) {
			return {
				min: projectConstants.previewZoomMin,
				max: fitWidthZoom,
				initial: fitWidthZoom
			};
		}

		const availableHeight = Math.max(200, previewViewport.clientHeight - 32);
		const fitVisiblePagesZoom = projectUtils.clamp(
			(availableHeight - projectConstants.previewMobileGap * 0.5) /
				(projectConstants.previewPageHeight * projectConstants.previewMobileVisiblePages),
			projectConstants.previewZoomMin,
			fitWidthZoom
		);

		return {
			min: projectConstants.previewZoomMin,
			max: fitWidthZoom,
			initial: Math.min(fitWidthZoom, fitVisiblePagesZoom)
		};
	}

	async function stepPreviewZoom(direction: 'in' | 'out') {
		if (!previewViewport) return;

		const bounds = getPreviewZoomBounds();
		const step = isDesktop ? 0.08 : 0.05;
		const delta = direction === 'in' ? step : -step;
		const nextZoom = projectUtils.clamp((previewZoom || bounds.initial) + delta, bounds.min, bounds.max);

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
		const cursorY = projectUtils.clamp(event.clientY - rect.top, 0, rect.height);
		const delta = Math.sign(event.deltaY);
		const step = 0.08;
		const nextZoom = projectUtils.clamp((previewZoom || bounds.initial) + (delta > 0 ? -step : step), bounds.min, bounds.max);
		await zoomPreviewAtCursor(cursorY, nextZoom);
	}

	function handlePreviewTouchStart(event: TouchEvent) {
		if (event.touches.length !== 2 || !previewViewport) return;

		const [first, second] = Array.from(event.touches);
		const dx = first.clientX - second.clientX;
		const dy = first.clientY - second.clientY;
		const startDist = Math.hypot(dx, dy);
		const rect = previewViewport.getBoundingClientRect();
		const midY = projectUtils.clamp((first.clientY + second.clientY) / 2 - rect.top, 0, rect.height);

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
		const nextZoom = projectUtils.clamp(pinch.startZoom * ratio, bounds.min, bounds.max);
		await zoomPreviewAtCursor(pinch.midY, nextZoom);
	}

	function handlePreviewTouchEnd() {
		pinch = null;
	}

	function resetReport() {
		if (!browser) return;
		const okay = window.confirm('Reset this report and clear all saved data? This cannot be undone.');
		if (!okay) return;
		projectPersist.reset();
		applyState(projectStates.createDefaultState(projectSchema));
		clearDraggedItems();
		photoDropId = '';
	}

	onMount(() => {
		const dragMonitor = draggable.listen({
			dragstart: handleDraggableDragStart,
			dragend: clearDraggedItems
		});

		void (async () => {
			const next = projectStates.loadState(projectSchema);
			projectUtils.syncIdCounterFromSections(next.sections);
			applyState(next);
			const didHydratePhotoDimensions = await projectUtils.hydratePhotoDimensions(next.sections);
			if (didHydratePhotoDimensions) sections = [...sections];
			hydrated = true;
			await tick();
			applyFitZoomIfNeeded();
		})();

		return () => {
			dragMonitor.destroy();
			draggable.destroy();
		};
	});

	$effect(() => {
		if (!browser || !hydrated) return;
		projectPersist.set({
			activeTab: activePane === 'preview' ? 'preview' : 'create',
			previewZoom,
			hasUserZoomed,
			sections
		});
	});

	$effect(() => {
		if (!hydrated || !previewViewport || hasUserZoomed) return;
		mq.sm;
		applyFitZoomIfNeeded();
	});
</script>

<svelte:window onpaste={handlePaste} />

<div class="page-shell h-svh overflow-hidden text-neutral-900">
	<div class="flex h-full min-w-0 flex-col">
		<div class="flex shrink-0 items-center gap-2 p-4 md:hidden">
			<Button
				{...(activePane === 'edit' ? { heavy: true, primary: true } : { outline: true, base: true })}
				variant="text"
				class="w-full flex-1"
				onclick={() => setMobilePane('edit')}
				label="Edit"
			/>

			<Button
				{...(activePane === 'preview' ? { heavy: true, primary: true } : { outline: true, base: true })}
				variant="text"
				class="w-full flex-1"
				onclick={() => setMobilePane('preview')}
				label="Preview"
			/>
		</div>

		<main class="grid min-h-0 flex-1 gap-4 md:grid-cols-[24rem_minmax(0,1fr)] md:px-6 md:pb-6 lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[28rem_minmax(0,1fr)]">
			<Panels
				{isDesktop}
				{activePane}
				{sections}
				schema={projectSchema}
				{draggedSectionId}
				{draggedPhotoId}
				{photoDropId}
				{overallMetrics}
				{sectionSort}
				{getPhotoSort}
				{setSections}
				{setSectionPhotos}
				{getAccordionAnchorId}
				{measureAccordionLayout}
				{handleAccordionToggle}
				{handleSectionTitleClick}
				{handleSectionActionClick}
				{handleSectionActionDisabledClick}
				{addSection}
				{resetReport}
				toggleSectionEnabled={toggleSectionEnabled}
				{removeDay}
				{addDay}
				{removeEntry}
				{addEntry}
				{maybeAddEntry}
				{handleActivityKeyup}
				{handlePhotoInput}
				{handlePhotoZoneDragOver}
				{handlePhotoZoneDragLeave}
				{handlePhotoZoneDrop}
				{removePhoto}
				setSectionFieldValue={setSectionFieldValue}
			/>

			<Preview
				{isDesktop}
				{activePane}
				{isExporting}
				{handleExport}
				{stepPreviewZoom}
				{resetPreviewZoom}
				{previewZoom}
				bind:previewViewport
				bind:previewPages
				schema={projectSchema}
				{reportTitle}
				{reportSubtitle}
				{handlePreviewWheel}
				{handlePreviewTouchStart}
				{handlePreviewTouchMove}
				{handlePreviewTouchEnd}
				{coverMeta}
				projectSummaryItems={projectSummaryItems}
				personnelEntries={personnelEntries}
				{tableOfContentsEntries}
				previewPageItems={previewPagesData}
				{getSortedEntries}
			/>
		</main>
	</div>
</div>

<style lang="postcss">
	@reference "#app.css";

	.page-shell {
		background-color: #eef2f7;
		background-image: radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.24) 1.05px, transparent 0);
		background-size: 16px 16px;
	}
</style>