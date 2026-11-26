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
		// The library Button it hangs from: its look, or any other Button prop, set from outside; or a function of
		// whether the box is open that gives them.
		button?: Partial<ButtonProps> | ((isOpen: boolean) => Partial<ButtonProps>);
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

	let root: HTMLDivElement | undefined = $state();
	let place = $state('');
	// How wide the box is, and how tall all it holds, once it shows; 0 until then.
	let width = 0;
	let tall = 0;

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}

	// Where the box goes: under its button, or over it when it does not fit under it and there is more room above;
	// its edge on its button's, moved back from the edge of the screen as far as it must. Only the part of the screen
	// in view counts, so with a phone's keyboard up it stays above the keyboard. Nothing when the button has left the
	// view.
	function placeOf() {
		if (!root) return '';
		const box = root.getBoundingClientRect();
		const view = window.visualViewport;
		const [viewTop, viewHeight] = [view?.offsetTop ?? 0, view?.height ?? innerHeight];
		if (box.bottom < viewTop || box.top > viewTop + viewHeight) return '';
		const below = viewTop + viewHeight - box.bottom - offset - EDGE;
		const above = box.top - viewTop - offset - EDGE;
		const isUp = tall > below && above > below;
		const y = isUp
			? `bottom: ${Math.round(innerHeight - box.top + offset)}px`
			: `top: ${Math.round(box.bottom + offset)}px`;
		// The page's width without its scroll bar, which a fixed box stands inside.
		const screenWidth = document.documentElement.clientWidth || innerWidth;
		const most = screenWidth - EDGE * 2;
		const across = Math.min(width, most);
		const wanted = align === 'left' ? box.left : box.right - across;
		const left = Math.max(EDGE, Math.min(wanted, screenWidth - EDGE - across));
		const origin = `${isUp ? 'bottom' : 'top'} ${align}`;
		return `left: ${Math.round(left)}px; ${y}; max-width: ${most}px; max-height: ${Math.max(0, Math.floor(isUp ? above : below))}px; transform-origin: ${origin}`;
	}

	function toggle(event: MouseEvent) {
		own.onclick?.(event as never);
		if (isOpen) return (isOpen = false);
		width = 0;
		tall = 0;
		place = placeOf();
		isOpen = true;
	}

	// The page moved, the phone turned or the keyboard came up under an open box: the box follows its button. It
	// closes once the button is out of view, unless something in it is being typed in.
	function follow() {
		if (!isOpen) return;
		const next = placeOf();
		if (next) place = next;
		else if (!root?.contains(document.activeElement) || document.activeElement?.tagName !== 'INPUT')
			isOpen = false;
	}

	// In the top layer, then placed again once its width and the height of all it holds are known. Safari 16 and
	// older (2022) has no popovers: there the box stays an ordinary fixed one, kept on top by its z-index (the Menu's
	// "Whoops", 2026-11-18).
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		// Read once, as it opens, not followed: what it reads here never runs this again.
		untrack(() => {
			width = node.offsetWidth;
			tall = node.scrollHeight;
			place = placeOf() || place;
		});
		const onscroll = (event: Event) => {
			if (!node.contains(event.target as Node)) follow();
		};
		document.addEventListener('scroll', onscroll, { capture: true, passive: true });
		window.visualViewport?.addEventListener('resize', follow);
		window.visualViewport?.addEventListener('scroll', follow);
		return () => {
			document.removeEventListener('scroll', onscroll, { capture: true });
			window.visualViewport?.removeEventListener('resize', follow);
			window.visualViewport?.removeEventListener('scroll', follow);
		};
	};

	const own = $derived(typeof button === 'function' ? button(isOpen) : button);
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
				{...own}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-label={own['aria-label'] ?? label}
				onclick={toggle}
			/>
			{#if isOpen}
				<div
					popover="manual"
					role="dialog"
					aria-label={label}
					class="fixed z-[120] m-0 overflow-y-auto overscroll-contain rounded-3xl border-0 p-2 text-left shadow-menu {/\btheme-/.test(
						look
					)
						? ''
						: 'bg-surface text-inherit'} {look}"
					style="inset: auto; {place}"
					transition:scale={{ start: 0.95, duration: 140 }}
					{@attach lift}
				>
					{@render children()}
				</div>
			{/if}
		</div>
	{/snippet}
</Component>
