<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fromAction } from 'svelte/attachments';
	import type { SortableApi } from '@layerd/ui';
	import { Button, InputNew } from '@layerd/ui';
	import * as projectAssets from '../projects.assets';
	import type * as projectTypes from '../projects.types';

	export interface PhotoGridProps {
		photos: projectTypes.PhotoItemType[];
		photoSort: SortableApi<projectTypes.PhotoItemType>;
		draggedPhotoId: string;
		enabled: boolean;
		editable?: boolean;
		isDropTarget: boolean;
		captionLabel?: string;
		emptyMessage?: string;
		cardClass?: string;
		onUpload: (event: Event) => void | Promise<void>;
		onDragOver: (event: DragEvent) => void;
		onDragLeave: () => void;
		onDrop: (event: DragEvent) => void | Promise<void>;
		onReorder: (nextPhotos: unknown[]) => void;
		onRemove: (photo: projectTypes.PhotoItemType, index: number) => void;
		onCaptionInput?: (photo: projectTypes.PhotoItemType, index: number, event: Event) => void;
	}

	let {
		photos,
		photoSort,
		draggedPhotoId,
		enabled,
		editable = true,
		isDropTarget,
		captionLabel = 'Caption',
		emptyMessage = 'No photos added yet.',
		cardClass = 'rounded-2xl bg-white p-2',
		onUpload,
		onDragOver,
		onDragLeave,
		onDrop,
		onReorder,
		onRemove,
		onCaptionInput
	}: PhotoGridProps = $props();

	const isInteractive = $derived(enabled && editable);
</script>

<div class="space-y-3">
	<div class="flex flex-wrap gap-2">
		<label class={`rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${isInteractive ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
			<span>Upload</span>
			<input accept="image/*" class="hidden" multiple type="file" disabled={!isInteractive} onchange={onUpload} />
		</label>
		<label class={`rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${isInteractive ? 'border-neutral-300 bg-white text-neutral-700' : 'border-secondary-200 bg-secondary-100 text-neutral-500'}`}>
			<span>Camera</span>
			<input accept="image/*" capture="environment" class="hidden" type="file" disabled={!isInteractive} onchange={onUpload} />
		</label>
	</div>

	<div role="presentation" class:drop-target={isDropTarget} class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-center text-xs font-medium text-neutral-500" ondragover={onDragOver} ondragleave={onDragLeave} ondrop={onDrop}>
		Drop images here
	</div>

	<div class="grid grid-cols-2 gap-3" {@attach fromAction(photoSort.list, () => ({ items: { get: () => photos, set: onReorder }, accept: [photoSort.type] }))}>
		{#each photos as photo, photoIndex (photo.id)}
			<div animate:flip={{ duration: 180 }} class={cardClass} class:dragging-item={draggedPhotoId === photo.id} role="presentation" {@attach fromAction(photoSort.item, () => photo)}>
				<div class="relative aspect-square rounded-xl bg-neutral-100">
					<img alt={photo.caption || photo.name} class="h-full w-full rounded-lg object-cover" draggable="false" src={projectAssets.getRenderableAssetUrl(photo.src)} />
					<div class="touch-reorder-handle absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-black text-neutral-700 shadow-sm cursor-grab active:cursor-grabbing" {@attach fromAction(photoSort.handle, () => true)} aria-label={`Reorder ${photo.caption || photo.name || 'photo'}`}>
						::
					</div>
					<Button variant="icon" icon="close" class="absolute! -right-1.5 -top-1.5 z-100 text-[8px]!" aria-label="Remove Photo" onclick={() => onRemove(photo, photoIndex)} />
				</div>
				{#if onCaptionInput}
					<InputNew xs label={captionLabel} variant="text" type="text" value={photo.caption} oninput={(event: Event) => onCaptionInput(photo, photoIndex, event)} />
				{/if}
			</div>
		{/each}
		{#if !photos.length}
			<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-500">{emptyMessage}</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	@reference "#app.css";

	.dragging-item {
		@apply border-2 border-primary;
	}
</style>