<script lang="ts">
	/**
	 * @tags ui, popover, menu, dialog
	 */
	// The Popover (#405): a box of anything that hangs from a library Button, such as the bell's Notifications. Where
	// the Menu holds a list of choices, this holds whatever it is given. It began as the bell's box, written in the app,
	// which hung from the bell's right edge and ran off the left of Justin's phone, where the bell sits in the middle of
	// the menu (2026-11-26).
	//
	// Its look is set from outside, like the Button's: it is the base component, and `color`, `appearance`, their
	// shorthands and `class` (its width) land on the box, the part that shows, which is the theme's surface until it is
	// given a look. It hangs from the library Button, every prop of which is set through `button`; the Button's own
	// `onclick` runs too.
	//
	// A tap of its button opens it; a second tap, Escape or a tap outside closes it, and so does the place that uses it,
	// through `isOpen`. The box opens in the browser's top layer (a popover), so no scrolling or rounded box around its
	// button cuts it off, as the Menu's list does. It hangs under its button, or over it when it does not fit under it
	// and there is more room above. `align` says which edge lines up with the same edge of its button: the right (it
	// opens toward the left, the default) or the left (toward the right). Then it moves back from the edge of the
	// screen as far as it must, keeping 8px clear, so it is never cut off: never wider than the screen, never taller
	// than the room on its side, and what it holds scrolls inside it.
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';
	import {
		Button,
		Component,
		type ButtonProps,
		type ComponentProps,
		type ComponentReturn
	} from '@layerd/ui';

	export interface PopoverProps extends Omit<ComponentProps, 'label' | 'children'> {
		// The box's name, read out for its button (unless the button has a label of its own) and for the box.
		label: string;
		// The library Button it hangs from: its look, or any other Button prop, set from outside.
		button?: Partial<ButtonProps>;
		// Which of its edges lines up with the same edge of its button: right unless told, so it opens toward the left;
		// left, so it opens toward the right.
		align?: 'left' | 'right';
		// How far from its button the box stands, in pixels.
		offset?: number;
		// Whether it is open: bind it to open or close it from the place that uses it (a pick inside it).
		isOpen?: boolean;
		children: Snippet;
	}

	let {
		label,
		button = {},
		align = 'right',
		offset = 8,
		isOpen = $bindable(false),
		children,
		...props
	}: PopoverProps = $props();

	// How close to the edge of the screen it may come.
	const EDGE = 8;
	// Where the box stands until it is measured: unseen at the screen's left, where nothing squeezes it, so its own
	// width is the one measured (at its button's edge it would shrink to the room left before the screen's edge).
	const UNSEEN = `left: 0px; top: 0px; max-width: calc(100% - ${EDGE * 2}px); visibility: hidden`;

	let root: HTMLDivElement | undefined = $state();
	let box: HTMLElement | undefined;
	let place = $state('');
	// How wide the box is, and how tall all it holds, once it shows.
	let width = 0;
	let height = 0;

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}

	// Where the box goes: under its button, or over it when it does not fit under it and there is more room above;
	// its edge on its button's, moved back from the edge of the screen as far as it must, and growing out of the point
	// under its button's edge. Only the part of the screen in view counts, so with a phone's keyboard up it stays
	// above the keyboard; never shorter than 140px, as the Menu's list. Nothing when the button has left the view.
	function placeOf() {
		if (!root) return '';
		const anchor = root.getBoundingClientRect();
		const view = window.visualViewport;
		const [viewTop, viewHeight] = [view?.offsetTop ?? 0, view?.height ?? innerHeight];
		if (anchor.bottom < viewTop || anchor.top > viewTop + viewHeight) return '';
		// The page without its scroll bars, which a fixed box stands inside.
		const screenWidth = document.documentElement.clientWidth || innerWidth;
		const screenHeight = document.documentElement.clientHeight || innerHeight;
		const widest = screenWidth - EDGE * 2;
		const below = viewTop + viewHeight - anchor.bottom - offset - EDGE;
		const above = anchor.top - viewTop - offset - EDGE;
		const isUp = height > below && above > below;
		const y = isUp
			? `bottom: ${Math.round(screenHeight - anchor.top + offset)}px`
			: `top: ${Math.round(anchor.bottom + offset)}px`;
		const boxWidth = Math.min(width, widest);
		const lined = align === 'left' ? anchor.left : anchor.right - boxWidth;
		const left = Math.max(EDGE, Math.min(lined, screenWidth - EDGE - boxWidth));
		const tallest = Math.max(140, Math.floor(isUp ? above : below));
		const edge = align === 'left' ? anchor.left : anchor.right;
		const origin = `${Math.round(Math.max(0, Math.min(edge - left, boxWidth)))}px ${isUp ? 'bottom' : 'top'}`;
		return `left: ${Math.round(left)}px; ${y}; max-width: ${widest}px; max-height: ${tallest}px; transform-origin: ${origin}`;
	}

	// How wide the box is and how tall all it holds.
	function measure() {
		if (!box) return;
		width = box.offsetWidth;
		height = box.scrollHeight;
	}

	function toggle(event: MouseEvent) {
		button.onclick?.(event as never);
		isOpen = !isOpen;
	}

	// The page moved, the phone turned or the keyboard came up under an open box: the box follows its button, measured
	// again (a turned phone can give it another width). It closes once the button is out of view, unless something in
	// it is being typed in.
	function follow() {
		if (!isOpen) return;
		measure();
		const next = placeOf();
		if (next) place = next;
		else if (!root?.contains(document.activeElement) || document.activeElement?.tagName !== 'INPUT')
			isOpen = false;
	}

	// In the top layer, measured where it stands unseen, then placed. It stands unseen again once it has gone, for the
	// next time it opens, from its button or from the place that uses it. Safari 16 and
	// older (2022) has no popovers: there the box stays an ordinary fixed one, kept on top by its z-index (the Menu's
	// "Whoops", 2026-11-18).
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		box = node;
		// Read once, as it opens, not followed: what it reads here never runs this again. Opened from the place that
		// uses it as it first shows, the box is placed before its button's holder is bound, so it finds that itself.
		untrack(() => {
			root ??= node.parentElement as HTMLDivElement;
			measure();
			place = placeOf();
		});
		const onscroll = (event: Event) => {
			if (!node.contains(event.target as Node)) follow();
		};
		document.addEventListener('scroll', onscroll, { capture: true, passive: true });
		window.visualViewport?.addEventListener('resize', follow);
		window.visualViewport?.addEventListener('scroll', follow);
		return () => {
			box = undefined;
			place = '';
			document.removeEventListener('scroll', onscroll, { capture: true });
			window.visualViewport?.removeEventListener('resize', follow);
			window.visualViewport?.removeEventListener('scroll', follow);
		};
	};
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	onresize={follow}
/>

<Component {...props}>
	{#snippet component({ props: given }: { props: ComponentReturn })}
		{@const { class: look = '', ...rest } = given}
		<div
			{...rest}
			class="relative"
			bind:this={root}
		>
			<Button
				{...button}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-label={button['aria-label'] ?? label}
				onclick={toggle}
			/>
			{#if isOpen}
				<div
					popover="manual"
					role="dialog"
					aria-label={label}
					class="fixed z-[120] m-0 overflow-y-auto overscroll-contain rounded-[1.5em] border-0 p-[0.5em] text-left shadow-menu {/\btheme-/.test(
						look
					)
						? ''
						: 'bg-surface text-inherit'} {look}"
					style="inset: auto; {place || UNSEEN}"
					transition:scale={{ start: 0.95, duration: 140 }}
					{@attach lift}
				>
					{@render children()}
				</div>
			{/if}
		</div>
	{/snippet}
</Component>
