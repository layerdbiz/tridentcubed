<script
	module
	lang="ts"
>
	// The sections open in each group, by its name: opening one shuts the others (`group`).
	const GROUPS = new Map<string, Set<() => void>>();
</script>

<script lang="ts">
	/**
	 * @tags accordion, section, fold, group
	 * @layout vertical
	 */
	// A folding section (#389): a header that opens and shuts it, and what it holds, drawn only while open and slid
	// open and shut by script, so it animates on iPhone Safari too (no `interpolate-size`). `open` opens and shuts it
	// from outside; a press on the header opens or shuts it and tells `ontoggle`, as the Switch tells `onchange` (bind
	// `open` or keep it in step from `ontoggle`). The header is not a button: a disabled fieldset round the section (a
	// Sent or Complete project) would switch a button off, and the section could not be opened to read. `controls`
	// sit on its right (a switch); a press on them never folds the section or starts a drag. `grip` names the header
	// for a drag-to-reorder script (`data-grip`). At its foot, the owner's `actions` and, with `ondelete`, a Delete on
	// the far right. Sections given the same `group` open one at a time, as `<details name>` do: opening one, by a press
	// or from outside, shuts the others, each telling its `ontoggle`. With `snap`, a section a press opened scrolls itself
	// to the top of the area it scrolls in once it has slid open (Justin, 2026-11-27), so what it holds is in view from
	// its header; its owner leaves room above it with a `scroll-mt-*` class, under a fade say. Opened from outside, or by
	// its group, it stays where it is.
	//
	// Its look is set from outside (Justin, 2026-11-26), like the Button's: it is the base component, so `color`,
	// `appearance`, `size` and their shorthands (`lite`, `neutral`, `sm`) and `class` all land on its box; with none it
	// is a bare section in the text colour around it. Its spacing is in em, so `size` scales it. The chevron is the
	// library Icon (`icon`, in any form the Icon takes, such as `icon-[mdi--chevron-down] text-base-400`), and the
	// Delete is the library Button, which takes any Button prop through `deleteButton`, as the Toggle's trigger takes
	// `button`. Layout snippets (`left`, `center`, `a1c3`...) lay out what it holds.
	import { untrack, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import {
		Button,
		Component,
		Icon,
		type ButtonProps,
		type ComponentProps,
		type ComponentRenderArgs,
		type IconProps
	} from '@layerd/ui';

	export interface AccordionProps extends ComponentProps {
		/** Whether it is open (bindable). */
		open?: boolean;
		/** Told after each press on the header, with whether it is now open, and when its group shuts it. */
		ontoggle?: (open: boolean) => void;
		/** The sections given the same name open one at a time: opening one shuts the others. */
		group?: string;
		/** Opened by a press, it scrolls itself to the top of the area it scrolls in once it has slid open. */
		snap?: boolean;
		/** The header's words, when no `head` draws it. */
		label?: string;
		/** What the section is: the header's content, before its controls and the chevron. */
		head?: Snippet;
		/** Controls on the header's right, such as a switch. */
		controls?: Snippet;
		/** The chevron, in any form the library Icon takes; it turns over while open. */
		icon?: IconProps['icon'];
		/** The name a drag-to-reorder script holds the header by. */
		grip?: string;
		/** Buttons at the foot of the open section, on the left. */
		actions?: Snippet;
		/** Deletes the section: a Delete at the foot, on the far right. */
		ondelete?: () => void;
		deleteLabel?: string;
		/** The Delete's look, or any other library Button prop, set from outside. */
		deleteButton?: Partial<ButtonProps>;
	}

	let {
		open = $bindable(false),
		ontoggle = undefined,
		group = undefined,
		snap = false,
		label = undefined,
		head = undefined,
		controls = undefined,
		icon = 'mdi--chevron-down',
		grip = undefined,
		actions = undefined,
		ondelete = undefined,
		deleteLabel = 'Delete',
		deleteButton = {},
		class: className = '',
		...props
	}: AccordionProps = $props();

	// Whether a press opened it, for `snap`.
	let isPressed = false;

	function toggle(): void {
		open = !open;
		isPressed = open;
		ontoggle?.(open);
	}

	// Slid open: a section a press opened scrolls itself to the top, when it snaps. Its neighbours have slid shut by then,
	// so the top it scrolls to is where it stays.
	function settle(event: Event): void {
		if (!snap || !isPressed) return;
		isPressed = false;
		const section = (event.currentTarget as HTMLElement).parentElement;
		const isStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
		section?.scrollIntoView({ block: 'start', behavior: isStill ? 'auto' : 'smooth' });
	}

	// Shut by another section of its group opening.
	function shut(): void {
		if (!open) return;
		open = false;
		isPressed = false;
		ontoggle?.(false);
	}

	$effect(() => {
		if (!group) return;
		const name = group;
		const members = GROUPS.get(name) ?? new Set();
		GROUPS.set(name, members);
		members.add(shut);
		return () => {
			members.delete(shut);
			if (members.size === 0) GROUPS.delete(name);
		};
	});

	// Opening shuts the rest of its group.
	$effect(() => {
		if (!open || !group) return;
		const name = group;
		untrack(() => {
			for (const each of GROUPS.get(name) ?? []) if (each !== shut) each();
		});
	});

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

<Component
	{...props}
	class={`accordion ${className}`.trim()}
>
	{#snippet component({ props: root, layout }: ComponentRenderArgs)}
		<div {...root}>
			<div
				role="button"
				tabindex="0"
				class="accordion-head flex w-full min-w-0 cursor-pointer items-center gap-[0.625em] p-[0.75em] text-left select-none [-webkit-touch-callout:none]"
				aria-expanded={open}
				data-grip={grip}
				title={grip ? 'Hold and drag to reorder' : undefined}
				onclick={press}
				onkeydown={pressKey}
			>
				{#if head}{@render head()}{:else if label}<span class="min-w-0 flex-1">{label}</span>{/if}
				{#if controls}
					<span
						class="accordion-controls contents"
						data-no-drag>{@render controls()}</span
					>
				{/if}
				<Icon
					{icon}
					class="accordion-chevron size-[1.25em] shrink-0 transition {open ? 'rotate-180' : ''}"
				/>
			</div>
			{#if open}
				<div
					class="accordion-body space-y-[0.75em] px-[1em] pb-[0.75em]"
					transition:slide={{ duration: 180 }}
					onintroend={settle}
				>
					{@render layout()}
					<!-- The foot row is drawn even when empty: its gap is part of the section's spacing. -->
					<div class="accordion-foot -mx-[0.25em] flex flex-wrap items-center gap-[0.5em]">
						{@render actions?.()}
						{#if ondelete}
							<Button
								ghost
								size="sm"
								icon="mdi--trash-can-outline"
								class="accordion-delete ms-auto text-danger"
								{...deleteButton}
								label={deleteLabel}
								onclick={ondelete}
							/>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	/* Size scales the whole section, its spacing being in em (the Button's ladder). */
	:global(.accordion:where(.xxs)) {
		@apply text-[10px];
	}
	:global(.accordion:where(.xs)) {
		@apply text-xs;
	}
	:global(.accordion:where(.sm)) {
		@apply text-sm;
	}
	:global(.accordion:where(.md)) {
		@apply text-md;
	}
	:global(.accordion:where(.lg)) {
		@apply text-lg;
	}
	:global(.accordion:where(.xl)) {
		@apply text-2xl;
	}
	:global(.accordion:where(.xxl)) {
		@apply text-3xl;
	}
</style>
