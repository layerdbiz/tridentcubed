<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fromAction } from 'svelte/attachments';
	import type { SortableApi } from '@layerd/ui';
	import * as projectAssets from '../projects.assets';
	import * as projectSchemas from '../projects.schema';
	import {
		Grid,
		Button,
		Input,
		Text,
		Accordion,
		AccordionTitle,
		AccordionContent
	} from '@layerd/ui';
	import * as projectConstants from '../projects.constants';
	import * as projectUtils from '../projects.utils';
	import * as projectStates from '../projects.state';
	import GroupedRepeater from './grouped-repeater.svelte';
	import PhotoSection from './photo-section.svelte';
	import PhotoGrid from './photo-grid.svelte';
	import SharedPhotoInputs from './shared-photo-inputs.svelte';
	import type * as projectTypes from '../projects.types';

	type WorkspacePaneType = 'edit' | 'preview';
	type AccordionLayoutMetricType = {
		closedHeight: number;
		marginTop: number;
	};

	export interface PanelsProps {
		isDesktop: boolean;
		activePane: WorkspacePaneType;
		projectListHref: string;
		sections: projectTypes.SectionType[];
		schema: projectTypes.ProjectSchemaType;
		draggedSectionId: string;
		draggedPhotoId: string;
		photoDropId: string;
		overallMetrics: projectTypes.SectionMetricsType;
		sectionSort: SortableApi<projectTypes.SectionType>;
		getPhotoSort: (groupId: string) => SortableApi<projectTypes.PhotoItemType>;
		getPhotoGroupSort: (sectionId: string) => SortableApi<projectTypes.PhotoGroupType>;
		setSections: (nextSections: unknown[]) => void;
		setSectionGroups: (section: projectTypes.PhotosSectionType, nextGroups: unknown[]) => void;
		setPhotoGroupPhotos: (group: projectTypes.PhotoGroupType, nextPhotos: unknown[]) => void;
		getAccordionAnchorId: (sectionId: string) => string;
		measureAccordionLayout: (node: HTMLElement, params: { sectionId: string; index: number }) => { update: (params: { sectionId: string; index: number }) => void; destroy: () => void };
		handleAccordionToggle: (sectionId: string, event: Event) => void;
		handleSectionTitleClick: (sectionId: string, event: MouseEvent) => void;
		handleSectionActionClick: (event: MouseEvent, sectionId: string) => void;
		handleSectionActionDisabledClick: (event: MouseEvent) => void;
		addSection: (afterSectionId?: string) => void;
		addPhotoGroup: (section: projectTypes.PhotosSectionType, afterIndex?: number) => void;
		removePhotoGroup: (section: projectTypes.PhotosSectionType, groupId: string) => void;
		resetReport: () => void;
		toggleSectionEnabled: (sectionId: string) => void;
		removeDay: (section: projectTypes.TimeLogSectionType, dayId: string) => void;
		addDay: (section: projectTypes.TimeLogSectionType, afterIndex?: number) => void;
		removeEntry: (day: projectTypes.TimeDayType, entryId: string) => void;
		addEntry: (day: projectTypes.TimeDayType, afterIndex?: number) => void;
		maybeAddEntry: (day: projectTypes.TimeDayType, entryId: string) => void;
		handleActivityKeyup: (day: projectTypes.TimeDayType, entryId: string, event?: KeyboardEvent) => void;
		handlePhotoInput: (sectionId: string, groupId: string, event: Event) => Promise<void>;
		handlePhotoFilesInput: (sectionId: string, groupId: string, event: Event) => void;
		handlePhotoZoneDragOver: (groupId: string, event: DragEvent) => void;
		handlePhotoZoneDragLeave: (groupId: string) => void;
		handlePhotoZoneDrop: (sectionId: string, groupId: string, event: DragEvent) => Promise<void>;
		removePhoto: (group: projectTypes.PhotoGroupType, photoId: string) => void;
		setSectionFieldValue: (sectionId: string, path: string, value: projectTypes.FieldStateValueType) => void;
		setSectionFieldValues: (
			sectionId: string,
			values: Record<string, projectTypes.FieldStateValueType>
		) => void;
	}

	let {
		isDesktop,
		activePane,
		projectListHref,
		sections,
		schema,
		draggedSectionId,
		draggedPhotoId,
		photoDropId,
		overallMetrics,
		sectionSort,
		getPhotoSort,
		getPhotoGroupSort,
		setSections,
		setSectionGroups,
		setPhotoGroupPhotos,
		getAccordionAnchorId,
		measureAccordionLayout,
		handleAccordionToggle,
		handleSectionTitleClick,
		handleSectionActionClick,
		handleSectionActionDisabledClick,
		addSection,
		addPhotoGroup,
		removePhotoGroup,
		resetReport,
		toggleSectionEnabled,
		removeDay,
		addDay,
		removeEntry,
		addEntry,
		maybeAddEntry,
		handleActivityKeyup,
		handlePhotoInput,
		handlePhotoFilesInput,
		handlePhotoZoneDragOver,
		handlePhotoZoneDragLeave,
		handlePhotoZoneDrop,
		removePhoto,
		setSectionFieldValue,
		setSectionFieldValues
	}: PanelsProps = $props();

	function isToggleableSection(
		section: projectTypes.SectionType,
		panelDefinition: projectTypes.PanelDefinitionType | undefined,
		inputGroup: projectTypes.PanelInputGroupDefinitionType | undefined
	): boolean {
		if (!section.locked) return false;
		if (section.type === 'photos') return !section.required;
		if (section.type === 'fields' || section.type === 'cover') {
			return Boolean(panelDefinition && !panelDefinition.required && getSharedPhotoFields(inputGroup).imageField);
		}

		return false;
	}

	function handleSectionToggleClick(event: MouseEvent, sectionId: string) {
		event.preventDefault();
		event.stopPropagation();
		toggleSectionEnabled(sectionId);
	}

	function isPanelReorderable(
		section: projectTypes.SectionType,
		panelDefinition: projectTypes.PanelDefinitionType | undefined
	): boolean {
		return section.placement === 'middle' && Boolean(panelDefinition?.draggable);
	}

	function handleReorderHandlePointerDown(event: PointerEvent) {
		event.stopPropagation();
	}

	function handleReorderHandleClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleFieldInput(sectionId: string, path: string, event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
		setSectionFieldValue(sectionId, path, target?.value ?? '');
	}

	function handleFieldSelect(sectionId: string, path: string, event: Event) {
		const target = event.currentTarget as HTMLSelectElement | null;
		if (!target) return;

		if (target.multiple) {
			setSectionFieldValue(
				sectionId,
				path,
				Array.from(target.selectedOptions).map((option) => option.value)
			);
			return;
		}

		setSectionFieldValue(sectionId, path, target.value);
	}

	async function handleFieldFileInput(
		sectionId: string,
		field: projectTypes.InputDefinitionType,
		event: Event
	) {
		const target = event.currentTarget as HTMLInputElement | null;
		const files = Array.from(target?.files ?? []);
		if (!files.length) return;

		if (field.input === 'image') {
			const section = sections.find(
				(item) => item.id === sectionId && (item.type === 'fields' || item.type === 'cover')
			) as projectTypes.FieldSectionType | undefined;
			const existingValue = section ? projectSchemas.getFieldStringValue(section.fields, field.path) : '';
			const src = await projectAssets.saveImageFile(files[0]);
			void projectAssets.removeStoredAsset(existingValue);
			setSectionFieldValue(sectionId, field.path, src);
		} else {
			const fileNames = files.map((file) => file.name);
			setSectionFieldValue(
				sectionId,
				field.path,
				field.repeatable || files.length > 1 ? fileNames : (fileNames[0] ?? '')
			);
		}

		if (target) target.value = '';
	}

	function getFieldValueList(value: projectTypes.FieldStateValueType | undefined): string[] {
		if (Array.isArray(value)) {
			return value.map((item) => String(item || '').trim()).filter(Boolean);
		}

		const text = String(value || '').trim();
		return text ? [text] : [];
	}

	function getSectionPanelDefinition(
		section: projectTypes.SectionType
	): projectTypes.PanelDefinitionType | undefined {
		if (section.type === 'fields' || section.type === 'cover') {
			return projectSchemas.getPanelDefinition(schema, section.section);
		}

		if (section.type === 'photos' && section.panelId) {
			return projectSchemas.getPanelDefinitionById(schema, section.panelId);
		}

		return projectSchemas.getPanelDefinition(schema, section.title);
	}

	type SharedPhotoFieldsType = {
		descriptionField?: projectTypes.InputDefinitionType;
		variantField?: projectTypes.InputDefinitionType;
		imageField?: projectTypes.InputDefinitionType;
		captionField?: projectTypes.InputDefinitionType;
		fileField?: projectTypes.InputDefinitionType;
		regularFields: projectTypes.InputDefinitionType[];
	};

	function getSharedPhotoFields(
		inputGroup: projectTypes.PanelInputGroupDefinitionType | undefined
	): SharedPhotoFieldsType {
		const fields = inputGroup?.inputs ?? [];
		const imageField = fields.find((field) => field.input === 'image' && field.repeatable);
		const captionField = imageField
			? fields.find(
				(field) => field.input === 'text' && field.repeatable && field.reference.includes(imageField.id)
			)
			: undefined;
		const descriptionField = fields.find((field) => field.input === 'textarea');
		const variantField = fields.find(
			(field) => field.input === 'select' && field.options.some((option) => option.startsWith('photos-'))
		);
		const fileField = fields.find((field) => field.input === 'file' && field.repeatable);
		const specialFieldIds = new Set(
			[descriptionField?.id, variantField?.id, imageField?.id, captionField?.id, fileField?.id].filter(Boolean)
		);

		return {
			descriptionField,
			variantField,
			imageField,
			captionField,
			fileField,
			regularFields: fields.filter((field) => !specialFieldIds.has(field.id))
		};
	}
</script>

{#snippet timeLogGroupContent(
	day: projectTypes.TimeDayType,
	_dayIndex: number,
	addDayAfter: () => void,
	removeDayAt: () => void,
	canRemoveDay: boolean
)}
	<div class="space-y-3">
		<Input xs type="date" label="Date" bind:value={day.dateISO} />
		<div class="flex flex-wrap gap-2">
			<Button primary xs variant="text" label="Add Day" onclick={addDayAfter} />
			<Button outline xs variant="text" label="Delete Day" onclick={removeDayAt} disabled={!canRemoveDay} />
		</div>
	</div>
{/snippet}

{#snippet timeLogItem(
	day: projectTypes.TimeDayType,
	_dayIndex: number,
	entry: projectTypes.TimeEntryType,
	_entryIndex: number,
	addEntryAfter: () => void,
	removeEntryAt: () => void,
	canRemoveEntry: boolean
)}
	<Grid items="1x3" cols="160px 1fr auto" gap="8px">
		<Input xs bind:value={entry.time} label="Time" variant="text" inputmode="numeric" type="time" min="00:00" max="23:59" step="600" onblur={() => maybeAddEntry(day, entry.id)} />
		<Input xs bind:value={entry.text} label="Activity" variant="text" type="text" onblur={() => maybeAddEntry(day, entry.id)} onkeyup={(event?: KeyboardEvent) => handleActivityKeyup(day, entry.id, event)} />
		<div class="flex items-center gap-2">
			<Button primary xs variant="text" label="Add" onclick={addEntryAfter} />
			<Button ghost secondary variant="icon" icon="close" onclick={removeEntryAt} disabled={!canRemoveEntry} />
		</div>
	</Grid>
{/snippet}

<section class:hidden={!isDesktop && activePane !== 'edit'} class="min-h-0 px-4 pb-4 md:px-0 md:pb-0 md:pt-6">
	<div class="flex h-full min-h-0 flex-col rounded-2xl border border-secondary-200 bg-white shadow-sm">
		<div class="shrink-0 border-b border-secondary-200 px-4 py-3">
			<div class="flex flex-col gap-4">
				<div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
					<div class="min-w-0">
						<div class="flex items-center gap-3 pl-1">
							<Button
								sm
								outline
								variant="icon"
								icon="arrow-left"
								class="shrink-0 border-secondary-300 bg-white text-neutral-700"
								aria-label="Back to projects"
								href={projectListHref}
							/>
							<Text h2="Edit" />
						</div>
						<Text xs class="text-neutral" p="Build the report structure, content, and photos section by section." />
					</div>

					<div class="flex items-center gap-5">
						<div class="relative h-18 w-18 shrink-0">
							<svg viewBox="0 0 96 96" class="h-full w-full overflow-visible -rotate-90" aria-hidden="true">
								<circle class="fill-none stroke-secondary-200 stroke-12" cx="48" cy="48" r={projectConstants.overallProgressRingRadius} />
								<circle
									cx="48"
									cy="48"
									r={projectConstants.overallProgressRingRadius}
									fill="none"
									stroke="#22c55e"
									stroke-linecap="round"
									stroke-width="12"
									stroke-dasharray={projectConstants.overallProgressRingCircumference}
									stroke-dashoffset={projectUtils.getProgressRingOffset(overallMetrics.percent)}
								/>
							</svg>
							<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
								<span class="text-sm font-bold text-secondary-800">{overallMetrics.percent}%</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="flex flex-wrap gap-2 p-4">
			<Button primary xs variant="text" onclick={addSection} label="Add Panel" />
			<Button outline xs variant="text" onclick={resetReport} label="Reset" />
		</div>

		<div
			id="createContentPanels"
			class="scroller mask-b-sm min-h-0 flex-1 space-y-3 p-4 pt-1.75"
			{@attach fromAction(sectionSort.list, () => ({
				items: { get: () => sections, set: (items: unknown[]) => setSections(items) },
				accept: [sectionSort.type]
			}))}
		>
			{#each sections as section, index (section.id)}
				{@const panelDefinition = getSectionPanelDefinition(section)}
				{@const inputGroup = section.type === 'fields' || section.type === 'cover' ? projectSchemas.getInputGroup(schema, section.section) : undefined}
				{@const photoPanelFields = section.type === 'photos' && panelDefinition ? projectSchemas.getPhotoPanelFields(schema, panelDefinition) : null}
				{@const sharedPhotoFields = getSharedPhotoFields(inputGroup)}
				{@const metrics = projectUtils.getPanelMetrics(section)}
				{@const sectionDisabled = !section.enabled}
				{@const sectionStatusLabel = sectionDisabled ? 'DISABLED' : projectUtils.getPanelStatusLabel(metrics)}
				{@const sectionStatusTextClass = sectionDisabled ? 'text-neutral-400' : projectUtils.getPanelStatusTextClass(metrics)}
				{@const sectionProgressFillClass = sectionDisabled ? 'bg-secondary-300' : projectUtils.getPanelProgressFillClass(metrics)}
				{@const sectionReorderable = isPanelReorderable(section, panelDefinition)}

				<div
					id={getAccordionAnchorId(section.id)}
					animate:flip={{ duration: 180 }}
					class="relative"
					class:dragging-item={draggedSectionId === section.id}
					{@attach fromAction(measureAccordionLayout, () => ({ sectionId: section.id, index }))}
					{@attach fromAction(sectionSort.item, () => (sectionReorderable ? section : null))}
				>
					<Accordion class="relative" name="report-sections" open={section.open} ontoggle={(event: Event) => handleAccordionToggle(section.id, event)}>
						<AccordionTitle
							class="shadow-[-12px_-12px_0px_white] sticky top-0 z-1 block w-full rounded-t-2xl border border-b border-secondary-200 bg-secondary-100 p-4 text-left transition {section.open ? '' : 'rounded-b-2xl'} {sectionDisabled ? 'cursor-not-allowed grayscale opacity-70' : 'cursor-pointer'}"
							onclick={(event: MouseEvent) => handleSectionTitleClick(section.id, event)}
						>
							<div class="flex items-start gap-3">
								{#if sectionReorderable}
										<button type="button" class="touch-reorder-handle touch-none select-none flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary-200 bg-neutral-50 text-2xl text-neutral-700 cursor-grab active:cursor-grabbing" {@attach fromAction(sectionSort.handle, () => true)} aria-label={`Reorder ${section.title}`} onpointerdown={handleReorderHandlePointerDown} onclick={handleReorderHandleClick}>
										{section.icon}
										</button>
								{:else}
									<div class="flex h-10 w-10 shrink-0 items-center justify-center text-3xl">{section.icon}</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="mb-2 flex items-start justify-between gap-3">
										<div>
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="text-sm font-bold text-neutral-800">{section.title}</h3>
											</div>
											<p class="text-xs text-neutral-500">{sectionDisabled ? 'Disabled for preview' : `${metrics.done} of ${metrics.total} complete`}</p>
										</div>
										<div class="text-right">
											<p class="text-sm font-bold text-neutral-700">{sectionDisabled ? 'OFF' : `${metrics.percent}%`}</p>
											<p class={`${projectConstants.metricStatusCaptionClass} ${sectionStatusTextClass}`}>{sectionStatusLabel}</p>
										</div>
									</div>
									<div class="h-2.5 overflow-hidden rounded-full bg-secondary-200/60">
										<div class={`h-full rounded-full transition-all duration-300 ${sectionProgressFillClass}`} style={`width: ${sectionDisabled ? 0 : metrics.percent}%`}></div>
									</div>
								</div>
										{#if isToggleableSection(section, panelDefinition, inputGroup)}
											<button
												type="button"
												role="switch"
												aria-checked={section.enabled}
												aria-label={`${section.enabled ? 'Disable' : 'Enable'} ${section.title}`}
												class={`absolute -right-2 -top-2 flex h-6 w-11 items-center rounded-full border p-0.5 transition ${section.enabled ? 'justify-end border-success-600 bg-success-500' : 'justify-start border-secondary-300 bg-white'}`}
												onclick={(event: MouseEvent) => handleSectionToggleClick(event, section.id)}
											>
												<span class={`block h-4.5 w-4.5 rounded-full ${section.enabled ? 'bg-white' : 'bg-neutral-400'}`}></span>
											</button>
										{:else if sectionReorderable}
									<Button variant="icon" icon="close" class="absolute! -top-2! -right-2! text-[8px]!" aria-label={`Delete ${section.title}`} onclick={(event: MouseEvent) => handleSectionActionClick(event, section.id)} />
								{:else}
									<Button variant="icon" icon="lock" class="absolute! -top-2! -right-2! text-[8px]! bg-secondary-200 text-secondary-400 opacity-100" aria-label={`${section.title} is locked`} onclick={handleSectionActionDisabledClick} disabled />
								{/if}
							</div>
						</AccordionTitle>

						<AccordionContent class="rounded-b-2xl border-x border-b border-secondary-200 bg-secondary-100 p-4 {section.open ? '' : 'rounded-b-2xl'}">
							<div class:grayscale={sectionDisabled} class:opacity-60={sectionDisabled} class:pointer-events-none={sectionDisabled}>
							{#if section.type === 'fields' || section.type === 'cover'}
								<div class="relative z-0 grid gap-5">
									<div class="space-y-3">
										{#if panelDefinition?.description}
											<p class="text-sm text-neutral-600">{panelDefinition.description}</p>
										{/if}
										{#if inputGroup}
										{#if sharedPhotoFields.imageField}
											<SharedPhotoInputs
												section={section}
												descriptionField={sharedPhotoFields.descriptionField}
												variantField={sharedPhotoFields.variantField}
												imageField={sharedPhotoFields.imageField}
												captionField={sharedPhotoFields.captionField}
												fileField={sharedPhotoFields.fileField}
												photoSort={getPhotoSort(section.id)}
												{draggedPhotoId}
												{setSectionFieldValue}
												{setSectionFieldValues}
											/>
										{/if}
										<div class="space-y-3">
											<Text h4={inputGroup.panel} class="font-bold text-neutral-800" />
												{#each sharedPhotoFields.regularFields as field (field.id)}
													<div class={field.input === 'textarea' || field.input === 'multiselect' ? 'md:col-span-2' : ''}>
														{#if field.input === 'textarea'}
															<Input xs label={field.label} variant="text" type="text" value={projectSchemas.getFieldStringValue(section.fields, field.path)} placeholder={field.placeholder || ' '} disabled={!section.enabled || !field.editable} oninput={(event: Event) => handleFieldInput(section.id, field.path, event)} />
														{:else if field.input === 'image'}
															{@const imageSrc = projectSchemas.getFieldStringValue(section.fields, field.path)}
															<div class="space-y-2">
																<p class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{field.label}</p>
																{#if imageSrc}
																	<div class="overflow-hidden rounded-2xl border border-secondary-200 bg-white p-2">
																		<img alt={field.label} class="h-36 w-full rounded-xl object-cover" src={projectAssets.getRenderableAssetUrl(imageSrc)} />
																	</div>
																{/if}
																<label class={`inline-flex rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled && field.editable ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
																	<span>{imageSrc ? 'Replace Image' : 'Upload Image'}</span>
																	<input accept="image/*" class="hidden" type="file" disabled={!section.enabled || !field.editable} onchange={(event) => handleFieldFileInput(section.id, field, event)} />
																</label>
															</div>
														{:else if field.input === 'file'}
															{@const fileValues = getFieldValueList(section.fields[field.path])}
															<div class="space-y-2">
																<p class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{field.label}</p>
																{#if fileValues.length}
																	<div class="rounded-2xl border border-secondary-200 bg-white p-3 text-sm text-neutral-600">
																		{fileValues.join(', ')}
																	</div>
																{/if}
																<label class={`inline-flex rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled && field.editable ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
																	<span>{fileValues.length ? 'Replace Files' : 'Upload Files'}</span>
																	<input class="hidden" type="file" multiple={field.repeatable} disabled={!section.enabled || !field.editable} onchange={(event) => handleFieldFileInput(section.id, field, event)} />
																</label>
															</div>
														{:else if (field.input === 'select' || field.input === 'multiselect') && field.options.length}
															<label class="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
																<span>{field.label}</span>
																<select class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-info focus:ring-2 focus:ring-info/15" multiple={field.input === 'multiselect'} disabled={!section.enabled || !field.editable} onchange={(event) => handleFieldSelect(section.id, field.path, event)}>
																	{#each field.options as option, optionIndex (`${field.id}-${option}-${optionIndex}`)}
																		<option selected={Array.isArray(section.fields[field.path]) ? section.fields[field.path].includes(option) : projectSchemas.getFieldStringValue(section.fields, field.path) === option} value={option}>{option}</option>
																	{/each}
																</select>
															</label>
														{:else}
															<Input xs label={field.label} variant="text" type={field.input === 'date' ? 'date' : field.input === 'email' ? 'email' : field.input === 'tel' ? 'tel' : field.input === 'url' ? 'url' : field.input === 'number' ? 'number' : 'text'} value={projectSchemas.getFieldStringValue(section.fields, field.path)} placeholder={field.placeholder || ' '} disabled={!section.enabled || !field.editable} oninput={(event: Event) => handleFieldInput(section.id, field.path, event)} />
														{/if}
													</div>
												{/each}
										</div>
										{:else}
											<div class="rounded-2xl border border-dashed border-secondary-300 bg-white/70 p-4 text-sm text-neutral-500">
												No inputs are configured for this panel yet.
											</div>
										{/if}
									</div>
								</div>
							{:else if section.type === 'time-log'}
								<div class="space-y-4">
									{#if panelDefinition?.description}
										<p class="text-sm text-neutral-600">{panelDefinition.description}</p>
									{/if}
									<GroupedRepeater
										id={`${section.id}-timelog`}
										groups={section.days}
										enabled={section.enabled}
										groupReorderEnabled={false}
										itemReorderEnabled={false}
										getGroupKey={(day) => day.id}
										getGroupTitle={(_day, dayIndex) => `Day ${dayIndex + 1}`}
										getGroupMeta={(day) => `${day.entries.length} ${day.entries.length === 1 ? 'entry' : 'entries'}`}
										getGroupTrailingMeta={(day) => day.dateISO || ''}
										getItems={(day) => day.entries}
										getItemKey={(entry) => entry.id}
										addGroup={(afterIndex) => addDay(section, afterIndex)}
										removeGroup={(day) => removeDay(section, day.id)}
										addItem={(day, _groupIndex, afterIndex) => addEntry(day, afterIndex)}
										removeItem={(day, _groupIndex, entry) => removeEntry(day, entry.id)}
										canRemoveGroup={() => section.days.length > 1}
										canRemoveItem={(day) => day.entries.length > 1}
										renderGroupContent={timeLogGroupContent}
										renderItem={timeLogItem}
									/>
								</div>
							{:else if section.type === 'photos'}
								<PhotoSection
									{section}
									variantOptions={photoPanelFields?.variantOptions?.length ? photoPanelFields.variantOptions : schema.customVariantOptions}
									{draggedPhotoId}
									{photoDropId}
									showFiles={Boolean(photoPanelFields?.filesPath)}
									groupSort={getPhotoGroupSort(section.id)}
									{getPhotoSort}
									onSetGroups={(items) => setSectionGroups(section, items)}
									onSetGroupPhotos={setPhotoGroupPhotos}
									onAddGroup={(afterIndex) => addPhotoGroup(section, afterIndex)}
									onRemoveGroup={(groupId) => removePhotoGroup(section, groupId)}
									onUpload={(groupId, event) => handlePhotoInput(section.id, groupId, event)}
									onFilesInput={(groupId, event) => handlePhotoFilesInput(section.id, groupId, event)}
									onDragOver={handlePhotoZoneDragOver}
									onDragLeave={handlePhotoZoneDragLeave}
									onDrop={(groupId, event) => handlePhotoZoneDrop(section.id, groupId, event)}
									onRemove={(group, photo) => removePhoto(group, photo.id)}
								/>
							{/if}
							</div>
						</AccordionContent>
					</Accordion>
				</div>
			{/each}
		</div>
	</div>
</section>

<style lang="postcss">
	@reference "#app.css";

	.dragging-item {
		@apply border-2 border-primary;
	}

	#createContentPanels {
		scroll-behavior: smooth;
	}
</style>