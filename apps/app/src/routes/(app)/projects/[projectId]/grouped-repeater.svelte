<script lang="ts" generics="GroupType, ItemType">
	import { flip } from 'svelte/animate';
	import { fromAction } from 'svelte/attachments';
	import type { Snippet } from 'svelte';
	import { Accordion, AccordionContent, AccordionTitle } from '@layerd/ui';
	import type { SortableApi } from '@layerd/ui';

	type GroupContentSnippetType<GroupType> = Snippet<
		[GroupType, number, () => void, () => void, boolean]
	>;
	type ItemSnippetType<GroupType, ItemType> = Snippet<
		[GroupType, number, ItemType, number, () => void, () => void, boolean]
	>;
	type EmptyItemsSnippetType<GroupType> = Snippet<[GroupType, number, () => void]>;

	export interface GroupedRepeaterProps<GroupType, ItemType> {
		id: string;
		groups: GroupType[];
		enabled?: boolean;
		groupReorderEnabled?: boolean;
		itemReorderEnabled?: boolean;
		groupsClass?: string;
		itemsClass?: string;
		itemShellClass?: string;
		groupSort?: SortableApi<GroupType>;
		setGroups?: (nextGroups: unknown[]) => void;
		getItemSort?: (
			group: GroupType,
			groupIndex: number
		) => SortableApi<ItemType> | undefined;
		setItems?: (group: GroupType, nextItems: unknown[]) => void;
		getGroupKey: (group: GroupType, index: number) => string;
		getGroupTitle: (group: GroupType, index: number) => string;
		getGroupMeta?: (group: GroupType, index: number) => string;
		getGroupTrailingMeta?: (group: GroupType, index: number) => string;
		getItems: (group: GroupType) => ItemType[];
		getItemKey: (item: ItemType, groupIndex: number, itemIndex: number) => string;
		addGroup: (afterIndex: number) => void;
		removeGroup: (group: GroupType, index: number) => void;
		addItem: (group: GroupType, groupIndex: number, afterIndex: number) => void;
		removeItem: (
			group: GroupType,
			groupIndex: number,
			item: ItemType,
			itemIndex: number
		) => void;
		canRemoveGroup?: (group: GroupType, index: number) => boolean;
		canRemoveItem?: (
			group: GroupType,
			groupIndex: number,
			item: ItemType,
			itemIndex: number
		) => boolean;
		renderGroupContent: GroupContentSnippetType<GroupType>;
		renderItem: ItemSnippetType<GroupType, ItemType>;
		renderEmptyItems?: EmptyItemsSnippetType<GroupType>;
	}

	let {
		id,
		groups,
		enabled = true,
		groupReorderEnabled = true,
		itemReorderEnabled = true,
		groupsClass = 'space-y-3',
		itemsClass = 'space-y-3',
		itemShellClass = 'rounded-2xl border border-secondary-200 bg-white p-3',
		groupSort,
		setGroups,
		getItemSort,
		setItems,
		getGroupKey,
		getGroupTitle,
		getGroupMeta,
		getGroupTrailingMeta,
		getItems,
		getItemKey,
		addGroup,
		removeGroup,
		addItem,
		removeItem,
		canRemoveGroup,
		canRemoveItem,
		renderGroupContent,
		renderItem,
		renderEmptyItems
	}: GroupedRepeaterProps<GroupType, ItemType> = $props();

	let openByGroupId = $state<Record<string, boolean>>({});

	function isGroupOpen(groupKey: string): boolean {
		return openByGroupId[groupKey] ?? true;
	}

	function handleGroupToggle(groupKey: string, event: Event) {
		const details = event.currentTarget as HTMLDetailsElement | null;
		if (!details) return;

		openByGroupId[groupKey] = details.open;
	}

	function resolveCanRemoveGroup(group: GroupType, index: number): boolean {
		return canRemoveGroup ? canRemoveGroup(group, index) : true;
	}

	function resolveCanRemoveItem(
		group: GroupType,
		groupIndex: number,
		item: ItemType,
		itemIndex: number
	): boolean {
		return canRemoveItem ? canRemoveItem(group, groupIndex, item, itemIndex) : true;
	}
</script>

{#if groupReorderEnabled && groupSort && setGroups}
	<div
		class={groupsClass}
		{@attach fromAction(groupSort.list, () => ({
			items: { get: () => groups, set: (nextGroups: unknown[]) => setGroups(nextGroups) },
			accept: [groupSort.type]
		}))}
	>
		{#each groups as group, groupIndex (getGroupKey(group, groupIndex))}
			{@const groupKey = getGroupKey(group, groupIndex)}
			{@const items = getItems(group)}
			{@const itemSort = itemReorderEnabled ? getItemSort?.(group, groupIndex) : undefined}
			<div
				animate:flip={{ duration: 180 }}
				class="relative isolate overflow-hidden rounded-2xl"
				{@attach fromAction(groupSort.item, () => group)}
			>
				<Accordion class="overflow-hidden rounded-2xl" name={`${id}-groups`} open={isGroupOpen(groupKey)} ontoggle={(event: Event) => handleGroupToggle(groupKey, event)}>
					<AccordionTitle class={`relative z-10 block w-full rounded-t-2xl border border-b border-secondary-200 bg-secondary-50 p-4 text-left transition ${enabled ? 'cursor-pointer' : 'cursor-not-allowed grayscale opacity-70'} ${isGroupOpen(groupKey) ? '' : 'rounded-b-2xl'}`}>
						<div class="flex items-start gap-3">
							<div class="touch-reorder-handle flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary-200 bg-white text-sm font-black text-neutral-700 cursor-grab active:cursor-grabbing" aria-label={`Reorder ${getGroupTitle(group, groupIndex)}`}>
								::
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-3">
									<div class="flex min-w-0 flex-wrap items-center gap-2">
										<h4 class="text-sm font-bold text-neutral-800">{getGroupTitle(group, groupIndex)}</h4>
										{#if getGroupMeta?.(group, groupIndex)}
											<span class="text-xs text-neutral-500">{getGroupMeta(group, groupIndex)}</span>
										{/if}
									</div>
									{#if getGroupTrailingMeta?.(group, groupIndex)}
										<span class="text-xs font-medium text-neutral-500">{getGroupTrailingMeta(group, groupIndex)}</span>
									{/if}
								</div>
							</div>
						</div>
					</AccordionTitle>

					<AccordionContent class="relative z-0 rounded-b-2xl border-x border-b border-secondary-200 bg-secondary-50 p-4">
						<div class="relative z-0 overflow-hidden space-y-4" class:grayscale={!enabled} class:opacity-60={!enabled} class:pointer-events-none={!enabled}>
							{@render renderGroupContent(group, groupIndex, () => addGroup(groupIndex), () => removeGroup(group, groupIndex), resolveCanRemoveGroup(group, groupIndex))}

							{#if itemSort && setItems}
								<div
									class={itemsClass}
									{@attach fromAction(itemSort.list, () => ({
										items: {
											get: () => items,
											set: (nextItems: unknown[]) => setItems(group, nextItems)
										},
										accept: [itemSort.type]
									}))}
								>
									{#if items.length}
										{#each items as item, itemIndex (getItemKey(item, groupIndex, itemIndex))}
											<div animate:flip={{ duration: 180 }} class={itemShellClass} {@attach fromAction(itemSort.item, () => item)}>
												{@render renderItem(group, groupIndex, item, itemIndex, () => addItem(group, groupIndex, itemIndex), () => removeItem(group, groupIndex, item, itemIndex), resolveCanRemoveItem(group, groupIndex, item, itemIndex))}
											</div>
										{/each}
									{:else if renderEmptyItems}
										{@render renderEmptyItems(group, groupIndex, () => addItem(group, groupIndex, -1))}
									{/if}
								</div>
							{:else}
								<div class={itemsClass}>
									{#if items.length}
										{#each items as item, itemIndex (getItemKey(item, groupIndex, itemIndex))}
											<div animate:flip={{ duration: 180 }} class={itemShellClass}>
												{@render renderItem(group, groupIndex, item, itemIndex, () => addItem(group, groupIndex, itemIndex), () => removeItem(group, groupIndex, item, itemIndex), resolveCanRemoveItem(group, groupIndex, item, itemIndex))}
											</div>
										{/each}
									{:else if renderEmptyItems}
										{@render renderEmptyItems(group, groupIndex, () => addItem(group, groupIndex, -1))}
									{/if}
								</div>
							{/if}
						</div>
					</AccordionContent>
				</Accordion>
			</div>
		{/each}
	</div>
{:else}
	<div class={groupsClass}>
		{#each groups as group, groupIndex (getGroupKey(group, groupIndex))}
			{@const groupKey = getGroupKey(group, groupIndex)}
			{@const items = getItems(group)}
			{@const itemSort = itemReorderEnabled ? getItemSort?.(group, groupIndex) : undefined}
			<div animate:flip={{ duration: 180 }} class="relative isolate overflow-hidden rounded-2xl">
				<Accordion class="overflow-hidden rounded-2xl" name={`${id}-groups`} open={isGroupOpen(groupKey)} ontoggle={(event: Event) => handleGroupToggle(groupKey, event)}>
					<AccordionTitle class={`relative z-10 block w-full rounded-t-2xl border border-b border-secondary-200 bg-secondary-50 p-4 text-left transition ${enabled ? 'cursor-pointer' : 'cursor-not-allowed grayscale opacity-70'} ${isGroupOpen(groupKey) ? '' : 'rounded-b-2xl'}`}>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 flex-wrap items-center gap-2">
									<h4 class="text-sm font-bold text-neutral-800">{getGroupTitle(group, groupIndex)}</h4>
									{#if getGroupMeta?.(group, groupIndex)}
										<span class="text-xs text-neutral-500">{getGroupMeta(group, groupIndex)}</span>
									{/if}
								</div>
								{#if getGroupTrailingMeta?.(group, groupIndex)}
									<span class="text-xs font-medium text-neutral-500">{getGroupTrailingMeta(group, groupIndex)}</span>
								{/if}
							</div>
						</div>
					</AccordionTitle>

					<AccordionContent class="relative z-0 rounded-b-2xl border-x border-b border-secondary-200 bg-secondary-50 p-4">
						<div class="relative z-0 overflow-hidden space-y-4" class:grayscale={!enabled} class:opacity-60={!enabled} class:pointer-events-none={!enabled}>
							{@render renderGroupContent(group, groupIndex, () => addGroup(groupIndex), () => removeGroup(group, groupIndex), resolveCanRemoveGroup(group, groupIndex))}

							{#if itemSort && itemReorderEnabled && setItems}
								<div
									class={itemsClass}
									{@attach fromAction(itemSort.list, () => ({
										items: {
											get: () => items,
											set: (nextItems: unknown[]) => setItems(group, nextItems)
										},
										accept: [itemSort.type]
									}))}
								>
									{#if items.length}
										{#each items as item, itemIndex (getItemKey(item, groupIndex, itemIndex))}
											<div animate:flip={{ duration: 180 }} class={itemShellClass} {@attach fromAction(itemSort.item, () => item)}>
												{@render renderItem(group, groupIndex, item, itemIndex, () => addItem(group, groupIndex, itemIndex), () => removeItem(group, groupIndex, item, itemIndex), resolveCanRemoveItem(group, groupIndex, item, itemIndex))}
											</div>
										{/each}
									{:else if renderEmptyItems}
										{@render renderEmptyItems(group, groupIndex, () => addItem(group, groupIndex, -1))}
									{/if}
								</div>
							{:else}
								<div class={itemsClass}>
									{#if items.length}
										{#each items as item, itemIndex (getItemKey(item, groupIndex, itemIndex))}
											<div animate:flip={{ duration: 180 }} class={itemShellClass}>
												{@render renderItem(group, groupIndex, item, itemIndex, () => addItem(group, groupIndex, itemIndex), () => removeItem(group, groupIndex, item, itemIndex), resolveCanRemoveItem(group, groupIndex, item, itemIndex))}
											</div>
										{/each}
									{:else if renderEmptyItems}
										{@render renderEmptyItems(group, groupIndex, () => addItem(group, groupIndex, -1))}
									{/if}
								</div>
							{/if}
						</div>
					</AccordionContent>
				</Accordion>
			</div>
		{/each}
	</div>
{/if}