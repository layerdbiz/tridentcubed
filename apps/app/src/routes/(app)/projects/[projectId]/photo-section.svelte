<script lang="ts">
	import type { SortableApi } from '@layerd/ui';
	import { Button, Input } from '@layerd/ui';
	import GroupedRepeater from './grouped-repeater.svelte';
	import PhotoGrid from './photo-grid.svelte';
	import type * as projectTypes from '../projects.types';

	export interface PhotoSectionProps {
		section: projectTypes.PhotosSectionType;
		variantOptions: string[];
		draggedPhotoId: string;
		photoDropId: string;
		showFiles: boolean;
		groupSort: SortableApi<projectTypes.PhotoGroupType>;
		getPhotoSort: (groupId: string) => SortableApi<projectTypes.PhotoItemType>;
		onSetGroups: (items: unknown[]) => void;
		onSetGroupPhotos: (group: projectTypes.PhotoGroupType, items: unknown[]) => void;
		onAddGroup: (afterIndex: number) => void;
		onRemoveGroup: (groupId: string) => void;
		onUpload: (groupId: string, event: Event) => void | Promise<void>;
		onFilesInput: (groupId: string, event: Event) => void;
		onDragOver: (groupId: string, event: DragEvent) => void;
		onDragLeave: (groupId: string) => void;
		onDrop: (groupId: string, event: DragEvent) => void | Promise<void>;
		onRemove: (
			group: projectTypes.PhotoGroupType,
			photo: projectTypes.PhotoItemType
		) => void;
	}

	let {
		section,
		variantOptions,
		draggedPhotoId,
		photoDropId,
		showFiles,
		groupSort,
		getPhotoSort,
		onSetGroups,
		onSetGroupPhotos,
		onAddGroup,
		onRemoveGroup,
		onUpload,
		onFilesInput,
		onDragOver,
		onDragLeave,
		onDrop,
		onRemove
	}: PhotoSectionProps = $props();

	function getGroupTitle(group: projectTypes.PhotoGroupType, groupIndex: number): string {
		return group.title || `${section.title} ${groupIndex + 1}`;
	}

	function getGroupMeta(group: projectTypes.PhotoGroupType): string {
		const total = group.photos.length + group.files.length;
		return total ? `${total} item${total === 1 ? '' : 's'}` : 'Empty';
	}

	function canRemoveGroup(_group: projectTypes.PhotoGroupType, _groupIndex: number): boolean {
		if (section.required) return section.groups.length > 1;
		return section.groups.length > 0;
	}

	function handleFileRemove(group: projectTypes.PhotoGroupType, fileName: string) {
		group.files = group.files.filter((item) => item !== fileName);
	}

	const emptyPhotoItem = {
		id: 'empty',
		name: '',
		caption: '',
		src: '',
		width: 0,
		height: 0
	} satisfies projectTypes.PhotoItemType;
</script>

{#snippet groupContent(
	group: projectTypes.PhotoGroupType,
	_groupIndex: number,
	addGroupAfter: () => void,
	removeGroupAt: () => void,
	canDeleteGroup: boolean
)}
	<div class="space-y-3">
		<Input xs bind:value={group.title} label="Title" variant="text" type="text" disabled={!section.enabled} />

		<label class="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
			<span>Variant</span>
			<select class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-info focus:ring-2 focus:ring-info/15" bind:value={group.variant} disabled={!section.enabled}>
				{#each variantOptions as option (option)}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</label>

		<Input xs bind:value={group.description} textarea label="Description" variant="text" type="text" disabled={!section.enabled} />

		{#if showFiles}
			<div class="space-y-2 rounded-2xl border border-secondary-200 bg-white p-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<p class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Files</p>
					<label class={`inline-flex rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ${section.enabled ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-secondary-200 text-neutral-500'}`}>
						<span>{group.files.length ? 'Replace Files' : 'Upload Files'}</span>
						<input class="hidden" type="file" multiple disabled={!section.enabled} onchange={(event) => onFilesInput(group.id, event)} />
					</label>
				</div>
				{#if group.files.length}
					<div class="space-y-2">
						{#each group.files as fileName (`${group.id}-${fileName}`)}
							<div class="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
								<span class="min-w-0 flex-1 truncate">{fileName}</span>
								<Button ghost secondary variant="icon" icon="close" onclick={() => handleFileRemove(group, fileName)} disabled={!section.enabled} />
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<PhotoGrid
			photos={group.photos}
			photoSort={getPhotoSort(group.id)}
			{draggedPhotoId}
			enabled={section.enabled}
			isDropTarget={photoDropId === group.id}
			onUpload={(event) => onUpload(group.id, event)}
			onDragOver={(event) => onDragOver(group.id, event)}
			onDragLeave={() => onDragLeave(group.id)}
			onDrop={(event) => onDrop(group.id, event)}
			onReorder={(items) => onSetGroupPhotos(group, items)}
			onRemove={(photo) => onRemove(group, photo)}
			onCaptionInput={(photo, _index, event) => {
				const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
				photo.caption = target?.value ?? '';
			}}
		/>

		<div class="flex flex-wrap gap-2">
			<Button primary xs variant="text" label="Add Group" onclick={addGroupAfter} />
			<Button outline xs variant="text" label="Delete Group" onclick={removeGroupAt} disabled={!canDeleteGroup} />
		</div>
	</div>
{/snippet}

{#snippet emptyItem(
	_group: projectTypes.PhotoGroupType,
	_groupIndex: number,
	_item: projectTypes.PhotoItemType,
	_itemIndex: number,
	_addItem: () => void,
	_removeItem: () => void,
	_canRemoveItem: boolean
)}{/snippet}

{#if section.groups.length}
	<GroupedRepeater
		id={`${section.id}-photos`}
		groups={section.groups}
		enabled={section.enabled}
		groupReorderEnabled={true}
		itemReorderEnabled={false}
		groupSort={groupSort}
		setGroups={onSetGroups}
		getGroupKey={(group) => group.id}
		getGroupTitle={getGroupTitle}
		getGroupMeta={(group) => getGroupMeta(group)}
		getItems={() => [emptyPhotoItem]}
		getItemKey={() => 'empty-photo-item'}
		addGroup={onAddGroup}
		removeGroup={(group) => onRemoveGroup(group.id)}
		addItem={() => undefined}
		removeItem={() => undefined}
		canRemoveGroup={canRemoveGroup}
		renderGroupContent={groupContent}
		renderItem={emptyItem}
		itemShellClass="hidden"
	/>
{:else}
	<div class="space-y-3 rounded-2xl border border-dashed border-secondary-300 bg-white/70 p-4 text-sm text-neutral-500">
		<p>No groups added yet.</p>
		<Button primary xs variant="text" label="Add Group" onclick={() => onAddGroup(-1)} disabled={!section.enabled} />
	</div>
{/if}