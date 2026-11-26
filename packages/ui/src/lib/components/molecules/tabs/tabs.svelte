<script lang="ts">
	/**
	 * @tags navigation, tabs
	 * @layout horizontal
	 */
	// One row of tabs that picks which view a screen shows (#306, the first of #382): the Activity's Grouped and By
	// Time. Each tab is a native button, so a tap, a click, Enter and Space pick it, and the row reads as tabs to a
	// screen reader, the picked one selected. Tab reaches the picked tab only; the arrow keys, Home and End move along
	// the row and pick as they go. The look is the app's own tab rows' (the install how-to's): a light track with the
	// picked tab raised in white. The root override is for that row and its buttons.
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	/** One tab: what it picks, its words, and an icon before them when it has one. */
	export type TabsItemType = { id: string; label: string; icon?: string };

	export interface TabsProps extends ComponentProps {
		/** The tabs, in order. */
		tabs: TabsItemType[];
		/** The id of the picked tab (bindable). */
		value?: string;
		/** What the row picks between, read out by a screen reader: "Activity view". */
		label: string;
		/** The id of the element the tabs show, which each tab says it controls. */
		panel?: string;
		/** Called with the newly picked tab's id each time one is picked. */
		onchange?: (value: string) => void;
	}

	let {
		tabs,
		value = $bindable(),
		label,
		panel = undefined,
		onchange = undefined,
		...props
	}: TabsProps = $props();

	const picked = $derived(tabs.some((tab) => tab.id === value) ? value : tabs[0]?.id);

	function pick(id: string): void {
		if (id === picked) return;
		value = id;
		onchange?.(id);
	}

	// The tab a key moves to from `index`: the next or the one before, round the ends, or the first or the last.
	function toIndex(key: string, index: number): number | undefined {
		const last = tabs.length - 1;
		if (key === 'ArrowRight') return index === last ? 0 : index + 1;
		if (key === 'ArrowLeft') return index === 0 ? last : index - 1;
		if (key === 'Home') return 0;
		if (key === 'End') return last;
		return undefined;
	}

	function move(event: KeyboardEvent & { currentTarget: HTMLButtonElement }, index: number): void {
		const next = toIndex(event.key, index);
		if (next === undefined) return;
		event.preventDefault();
		pick(tabs[next].id);
		const row = event.currentTarget.parentElement;
		row?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	}
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<div
			{...props}
			role="tablist"
			aria-label={label}
			class={['tabs inline-flex rounded-full bg-black/[0.05] p-1', props.class]}
		>
			{#each tabs as tab, index (tab.id)}
				{@const isPicked = tab.id === picked}
				<button
					type="button"
					role="tab"
					aria-selected={isPicked}
					aria-controls={panel}
					tabindex={isPicked ? 0 : -1}
					onclick={() => pick(tab.id)}
					onkeydown={(event) => move(event, index)}
					class={[
						'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition',
						isPicked ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black/70'
					]}
					>{#if tab.icon}<span class="{tab.icon} size-4"></span>{/if}{tab.label}</button
				>
			{/each}
		</div>
	{/snippet}
</Component>
