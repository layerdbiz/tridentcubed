<script lang="ts">
	import { Button, InputNew } from '@layerd/ui';
	import * as projectUtils from '../projects.utils';
	import type * as projectTypes from '../projects.types';

	export interface SharedPhotoInputsProps {
		section: projectTypes.FieldSectionType;
		descriptionField?: projectTypes.InputDefinitionType;
		variantField?: projectTypes.InputDefinitionType;
		imageField: projectTypes.InputDefinitionType;
		captionField?: projectTypes.InputDefinitionType;
		fileField?: projectTypes.InputDefinitionType;
		setSectionFieldValue: (
			sectionId: string,
			path: string,
			value: projectTypes.FieldStateValueType
		) => void;
	}

	let {
		section,
		descriptionField,
		variantField,
		imageField,
		captionField,
		fileField,
		setSectionFieldValue
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

	const photoItems = $derived.by(() => {
		const images = getFieldValueList(section.fields[imageField.path]);
		const captions = getCaptionValues();

		return images.map((src, index) => ({
			id: `${section.id}-${imageField.id}-${index + 1}`,
			src,
			caption: captions[index] || '',
			name: `${imageField.label || 'Photo'} ${index + 1}`
		}));
	});

	async function addPhotos(fileList: FileList | File[] | null | undefined) {
		if (!fileList?.length) return;

		const nextImages = getFieldValueList(section.fields[imageField.path]);
		const nextCaptions = getCaptionValues();

		for (const file of Array.from(fileList)) {
			if (!file.type.startsWith('image/')) continue;
			nextImages.push(await projectUtils.fileToDataUrl(file));
			if (captionField) {
				nextCaptions.push(file.name ? file.name.replace(/\.[^.]+$/, '') : '');
			}
		}

		setSectionFieldValue(section.id, imageField.path, nextImages);
		if (captionField) {
			setSectionFieldValue(section.id, captionField.path, nextCaptions);
		}
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
		const nextCaptions = getCaptionValues();
		nextCaptions[index] = target?.value ?? '';
		setSectionFieldValue(section.id, captionField.path, nextCaptions);
	}

	function removePhoto(index: number) {
		const nextImages = getFieldValueList(section.fields[imageField.path]).filter((_, itemIndex) => itemIndex !== index);
		setSectionFieldValue(section.id, imageField.path, nextImages);

		if (!captionField) return;
		const nextCaptions = getCaptionValues().filter((_, itemIndex) => itemIndex !== index);
		setSectionFieldValue(section.id, captionField.path, nextCaptions);
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
		<div class="flex flex-wrap gap-2">
			<label class={`rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled && imageField.editable ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
				<span>Upload</span>
				<input accept="image/*" class="hidden" multiple={imageField.repeatable} type="file" disabled={!section.enabled || !imageField.editable} onchange={handlePhotoInput} />
			</label>
			<label class={`rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled && imageField.editable ? 'border-neutral-300 bg-white text-neutral-700' : 'border-secondary-200 bg-secondary-100 text-neutral-500'}`}>
				<span>Camera</span>
				<input accept="image/*" capture="environment" class="hidden" type="file" disabled={!section.enabled || !imageField.editable} onchange={handlePhotoInput} />
			</label>
		</div>

		<div role="presentation" class:drop-target={isDropTarget} class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-center text-xs font-medium text-neutral-500" ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop}>
			Drop images here
		</div>

		<div class="grid grid-cols-2 gap-3">
			{#each photoItems as photo, photoIndex (photo.id)}
				<div class="rounded-2xl bg-secondary-50 p-2">
					<div class="relative aspect-square rounded-xl bg-neutral-100">
						<img alt={photo.caption || photo.name} class="h-full w-full rounded-lg object-cover" draggable="false" src={photo.src} />
						<Button variant="icon" icon="close" class="absolute! -right-1.5 -top-1.5 z-100 text-[8px]!" aria-label="Remove Photo" onclick={() => removePhoto(photoIndex)} />
					</div>
					{#if captionField}
						<InputNew xs label={captionField.label} variant="text" type="text" value={photo.caption} oninput={(event: Event) => handleCaptionInput(photoIndex, event)} />
					{/if}
				</div>
			{/each}
			{#if !photoItems.length}
				<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">No photos added yet.</div>
			{/if}
		</div>

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