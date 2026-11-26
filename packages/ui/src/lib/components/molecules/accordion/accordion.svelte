<script lang="ts">
	/**
	 * @tags accordion, section, fold, group
	 * @layout vertical
	 */
	// A folding section (#389), grown from the app's panel groups (the days, stages, stops, companies...): a header that
	// opens and shuts it, and what it holds, drawn only while open and slid open and shut by script, so it animates on
	// iPhone Safari too (no `interpolate-size`). `open` opens and shuts it from outside; a press on the header opens or
	// shuts it and tells `ontoggle`, as the Switch tells `onchange` (bind `open` or keep it in step from `ontoggle`).
	// The header is not a button: a disabled fieldset round the section (a Sent or Complete project) would switch a
	// button off, and the section could not be opened to read. `controls` sit on its right (a switch); a press on them
	// never folds the section or starts a drag. `grip` names the header for a drag-to-reorder script (`data-grip`). At
	// its foot, the owner's `actions` and, with `ondelete`, a Delete on the far right. The look is the app's panel
	// groups', slate shades included (a known exception, #33).
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	export interface AccordionProps extends ComponentProps {
		/** Whether it is open (bindable). */
		open?: boolean;
		/** Told after each press on the header, with whether it is now open. */
		ontoggle?: (open: boolean) => void;
		/** What the section is: the header's content, before its controls and the chevron. */
		head: Snippet;
		/** Controls on the header's right, such as a switch. */
		controls?: Snippet;
		/** The name a drag-to-reorder script holds the header by. */
		grip?: string;
		/** Buttons at the foot of the open section, on the left. */
		actions?: Snippet;
		/** Deletes the section: a Delete at the foot, on the far right. */
		ondelete?: () => void;
		deleteLabel?: string;
	}

	let {
		open = $bindable(false),
		ontoggle = undefined,
		head,
		controls = undefined,
		grip = undefined,
		actions = undefined,
		ondelete = undefined,
		deleteLabel = 'Delete',
		children = undefined,
		...props
	}: AccordionProps = $props();

	function toggle(): void {
		open = !open;
		ontoggle?.(open);
	}

	// A press on the header's controls is theirs alone.
	function isControl(event: Event): boolean {
		return event.target instanceof Element && Boolean(event.target.closest('.accordion-controls'));
	}

	function press(event: MouseEvent): void {
		if (!isControl(event)) toggle();
	}

	function pressKey(event: KeyboardEvent): void {
		if (isControl(event) || (event.key !== 'Enter' && event.key !== ' ')) return;
		event.preventDefault();
		toggle();
	}
</script>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<div
			{...props}
			class={['accordion rounded-2xl bg-slate-900/[0.03] transition', props.class]}
		>
			<div
				role="button"
				tabindex="0"
				class="flex w-full min-w-0 cursor-pointer items-center gap-2.5 py-3 pr-3 pl-3 text-left select-none [-webkit-touch-callout:none]"
				aria-expanded={open}
				data-grip={grip}
				title={grip ? 'Hold and drag to reorder' : undefined}
				onclick={press}
				onkeydown={pressKey}
			>
				{@render head()}
				{#if controls}
					<span
						class="accordion-controls contents"
						data-no-drag>{@render controls()}</span
					>
				{/if}
				<span
					class={[
						'icon-[mdi--chevron-down] size-5 shrink-0 text-slate-400 transition',
						open && 'rotate-180'
					]}
				></span>
			</div>
			{#if open}
				<div
					class="space-y-3 px-4 pb-3"
					transition:slide={{ duration: 180 }}
				>
					{@render children?.()}
					<!-- The foot row is drawn even when empty: its gap is part of the section's spacing. -->
					<div class="-mx-1 flex flex-wrap items-center gap-2">
						{@render actions?.()}
						{#if ondelete}
							<button
								type="button"
								class="ml-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
								onclick={ondelete}
								><span class="icon-[mdi--trash-can-outline] size-[18px]"
								></span>{deleteLabel}</button
							>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</Component>
