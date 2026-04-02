<script lang="ts">
	import type { SortableApi } from '@layerd/ui';
	import { InputNew } from '@layerd/ui';
	import * as projectAssets from '../projects.assets';
	import PhotoGrid from './photo-grid.svelte';
	import type * as projectTypes from '../projects.types';

	export interface SharedPhotoInputsProps {
		section: projectTypes.FieldSectionType;
		descriptionField?: projectTypes.InputDefinitionType;
		variantField?: projectTypes.InputDefinitionType;
		imageField: projectTypes.InputDefinitionType;
		captionField?: projectTypes.InputDefinitionType;
		fileField?: projectTypes.InputDefinitionType;
		photoSort: SortableApi<projectTypes.PhotoItemType>;
		draggedPhotoId: string;
		setSectionFieldValue: (
			sectionId: string,
			path: string,
			value: projectTypes.FieldStateValueType
		) => void;
		setSectionFieldValues: (
			sectionId: string,
			values: Record<string, projectTypes.FieldStateValueType>
		) => void;
	}

	let {
		section,
		descriptionField,
		variantField,
		imageField,
		captionField,
		fileField,
		photoSort,
		draggedPhotoId,
		setSectionFieldValue,
		setSectionFieldValues
	}: SharedPhotoInputsProps = $props();

	let isDropTarget = $state(false);

	function getFieldValueList(
		value: projectTypes.FieldStateValueType | undefined
	): string[] {
		if (Array.isArray(value)) {
			return value.map((item) => String(item || '').trim()).filter(Boolean);
		}

		const text = String(value || '').trim();
		return text ? [text] : [];
	}

	function getCaptionValues(): string[] {
		if (!captionField) return [];
		return getFieldValueList(section.fields[captionField.path]);
	}

	let photoItemCache: Record<string, projectTypes.PhotoItemType> = {};

	const photoItems = $derived.by(() => {
		const images = getFieldValueList(section.fields[imageField.path]);
		const captions = getCaptionValues();
		const nextCache: Record<string, projectTypes.PhotoItemType> = {};

		const items = images.map((src, index) => {
			const photoId = src || `${section.id}-${imageField.id}-${index + 1}`;
			const photo = photoItemCache[photoId] ?? {
				id: photoId,
				src,
				caption: captions[index] || '',
				name: `${imageField.label || 'Photo'} ${index + 1}`,
				width: 0,
				height: 0
			};

			photo.src = src;
			photo.caption = captions[index] || '';
			photo.name = `${imageField.label || 'Photo'} ${index + 1}`;
			nextCache[photoId] = photo;
			return photo;
		});

		photoItemCache = nextCache;
		return items;
	});

	function commitPhotos(nextPhotos: projectTypes.PhotoItemType[]) {
		const nextValues: Record<string, projectTypes.FieldStateValueType> = {
			[imageField.path]: nextPhotos.map((photo) => photo.src)
		};

		if (captionField) {
			nextValues[captionField.path] = nextPhotos.map((photo) => photo.caption);
		}

		setSectionFieldValues(section.id, nextValues);
	}

	function reorderPhotos(nextPhotos: unknown[]) {
		const orderedPhotos = nextPhotos as projectTypes.PhotoItemType[];
		commitPhotos(orderedPhotos);
	}

	async function addPhotos(fileList: FileList | File[] | null | undefined) {
		if (!fileList?.length) return;

		const nextImages = getFieldValueList(section.fields[imageField.path]);
		const nextCaptions = getCaptionValues();

		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;
			const src = await projectAssets.saveImageFile(file);
			nextImages.push(src);
			if (captionField) {
				nextCaptions.push(file.name ? file.name.replace(/\.[^.]+$/, '') : '');
			}
		}

		commitPhotos(
			nextImages.map((src, index) => ({
				id: src || `${section.id}-${imageField.id}-${index + 1}`,
				src,
				caption: nextCaptions[index] || '',
				name: `${imageField.label || 'Photo'} ${index + 1}`,
				width: photoItems[index]?.width || 0,
				height: photoItems[index]?.height || 0
			}))
		);
	}

	async function handlePhotoInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		await addPhotos(input?.files ?? null);
		if (input) input.value = '';
	}

	function handleDescriptionInput(event: Event) {
		if (!descriptionField) return;
		const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
		setSectionFieldValue(section.id, descriptionField.path, target?.value ?? '');
	}

	function handleVariantChange(event: Event) {
		if (!variantField) return;
		const target = event.currentTarget as HTMLSelectElement | null;
		if (!target) return;
		setSectionFieldValue(section.id, variantField.path, target.value);
	}

	async function handleFileInput(event: Event) {
		if (!fileField) return;
		const input = event.currentTarget as HTMLInputElement | null;
		const files = Array.from(input?.files ?? []);
		if (!files.length) return;

		const fileNames = files.map((file) => file.name);
		setSectionFieldValue(
			section.id,
			fileField.path,
			fileField.repeatable || files.length > 1 ? fileNames : (fileNames[0] ?? '')
		);

		if (input) input.value = '';
	}

	function handleCaptionInput(index: number, event: Event) {
		if (!captionField) return;
		const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
		const nextPhotos = photoItems.map((photo, photoIndex) =>
			photoIndex === index ? { ...photo, caption: target?.value ?? '' } : photo
		);
		commitPhotos(nextPhotos);
	}

	function removePhoto(index: number) {
		const removedImage = photoItems[index]?.src || '';
		void projectAssets.removeStoredAsset(removedImage);
		commitPhotos(photoItems.filter((_, itemIndex) => itemIndex !== index));
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDropTarget = true;
	}

	function handleDragLeave() {
		isDropTarget = false;
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDropTarget = false;
		await addPhotos(event.dataTransfer?.files ?? null);
	}
</script>

<div class="space-y-3 rounded-2xl border border-secondary-200 bg-white p-4">
	{#if variantField}
		<label class="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
			<span>{variantField.label}</span>
			<select class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-info focus:ring-2 focus:ring-info/15" disabled={!section.enabled || !variantField.editable} onchange={handleVariantChange}>
				{#each variantField.options as option (option)}
					<option selected={getFieldValueList(section.fields[variantField.path])[0] === option} value={option}>{option}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if descriptionField}
		<InputNew xs label={descriptionField.label} textarea variant="text" type="text" value={getFieldValueList(section.fields[descriptionField.path])[0] || ''} placeholder={descriptionField.placeholder || ' '} disabled={!section.enabled || !descriptionField.editable} oninput={handleDescriptionInput} />
	{/if}

	<div class="space-y-3">
		<PhotoGrid
			photos={photoItems}
			{photoSort}
			{draggedPhotoId}
			enabled={section.enabled}
			editable={imageField.editable}
			{isDropTarget}
			captionLabel={captionField?.label || 'Caption'}
			cardClass="rounded-2xl bg-secondary-50 p-2"
			onUpload={handlePhotoInput}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onReorder={reorderPhotos}
			onRemove={(_, index) => removePhoto(index)}
			onCaptionInput={captionField ? (_, index, event) => handleCaptionInput(index, event) : undefined}
		/>

		{#if fileField}
			{@const fileValues = getFieldValueList(section.fields[fileField.path])}
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{fileField.label}</p>
				{#if fileValues.length}
					<div class="rounded-2xl border border-secondary-200 bg-white p-3 text-sm text-neutral-600">{fileValues.join(', ')}</div>
				{/if}
				<label class={`inline-flex rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled && fileField.editable ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
					<span>{fileValues.length ? 'Replace Files' : 'Upload Files'}</span>
					<input class="hidden" type="file" multiple={fileField.repeatable} disabled={!section.enabled || !fileField.editable} onchange={handleFileInput} />
				</label>
			</div>
		{/if}
	</div>
</div>
