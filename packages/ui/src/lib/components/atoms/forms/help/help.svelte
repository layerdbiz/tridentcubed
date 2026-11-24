<script lang="ts">
	/**
	 * @tags forms, help, popover, sheet
	 * @layout horizontal
	 */
	// The ? that opens an input's Help text (glossary), settled on "Prototype inputs with help and generated values"
	// (#284). A mouse gets a pop-up by the ? on hover, kept on a click; a finger gets a sheet from the bottom, above the
	// keyboard when one is up. Neither the ? nor what it opens ever takes the focus, so the input being typed in keeps
	// its caret and the phone keeps its keyboard, and nothing on the screen moves.
	import type { Attachment } from 'svelte/attachments';
	import { fade, fly, scale } from 'svelte/transition';
	import { Component, type ComponentProps, type ComponentReturn } from '@layerd/ui';

	export interface HelpProps extends ComponentProps {
		/** The input's label: the ? is named for it and the help opens under it. */
		label: string;
		/** The Help text. */
		text: string;
	}

	let { label, text, ...props }: HelpProps = $props();

	const POP_WIDTH = 272;

	let button = $state<HTMLButtonElement | null>(null);
	let pop = $state<HTMLDivElement | null>(null);
	let mode = $state<'pop' | 'sheet'>();
	let isPinned = $state(false);
	let at = $state({ x: 0, y: 0, isAbove: false });
	let lift = $state(0);
	// The input being typed in when the ? was pressed, given its focus back should a browser move it anyway.
	let typingIn: HTMLElement | null = null;

	function hasMouse(): boolean {
		return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	}

	// The pop-up opens under the ?, or over it when the window has no room below.
	function placePop(): void {
		if (!button) return;
		const box = button.getBoundingClientRect();
		const x = Math.min(window.innerWidth - POP_WIDTH - 8, Math.max(8, box.left - 14));
		const isAbove = box.bottom + 170 > window.innerHeight && box.top > 170;
		at = { x, y: isAbove ? box.top - 10 : box.bottom + 10, isAbove };
	}

	// What a phone's keyboard covers of the window's foot: the sheet rises by that much.
	function placeSheet(): void {
		const seen = window.visualViewport;
		lift = seen ? Math.max(0, Math.round(window.innerHeight - seen.offsetTop - seen.height)) : 0;
	}

	function open(next: 'pop' | 'sheet', isKept: boolean): void {
		if (next === 'pop') placePop();
		else placeSheet();
		mode = next;
		isPinned = isKept;
	}

	function close(): void {
		mode = undefined;
		isPinned = false;
	}

	function press(): void {
		const active = document.activeElement;
		const field = button?.closest('fieldset');
		typingIn = active instanceof HTMLElement && field?.contains(active) ? active : null;
	}

	function ask(): void {
		if (mode && (isPinned || mode === 'sheet')) close();
		else open(hasMouse() ? 'pop' : 'sheet', true);
		if (typingIn?.isConnected && document.activeElement !== typingIn)
			typingIn.focus({ preventScroll: true });
		typingIn = null;
	}

	function point(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && !isPinned) open('pop', false);
	}

	function leave(event: PointerEvent): void {
		if (event.pointerType === 'mouse' && !isPinned && mode === 'pop') close();
	}

	// A kept pop-up shuts on a click anywhere else.
	function clickAway(event: MouseEvent): void {
		if (mode !== 'pop' || !isPinned || !(event.target instanceof Node)) return;
		if (!button?.contains(event.target) && !pop?.contains(event.target)) close();
	}

	// Into the browser's top layer, so no panel, bar or scrolling box covers or clips it. Safari 16 has no popovers:
	// there it stays a fixed box, kept on top by its z-index.
	const toTop: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
	};

	$effect(() => {
		if (mode !== 'sheet') return;
		const seen = window.visualViewport;
		seen?.addEventListener('resize', placeSheet);
		seen?.addEventListener('scroll', placeSheet);
		return () => {
			seen?.removeEventListener('resize', placeSheet);
			seen?.removeEventListener('scroll', placeSheet);
		};
	});
</script>

<svelte:window
	onkeydown={(event) => event.key === 'Escape' && mode && close()}
	onclick={clickAway}
	onscroll={() => mode === 'pop' && !isPinned && close()}
/>

<Component {...props}>
	{#snippet component({ props }: { props: ComponentReturn })}
		<button
			{...props}
			bind:this={button}
			type="button"
			class={`${props.class ?? ''} help`.trim()}
			aria-label="What goes in {label}?"
			aria-expanded={Boolean(mode)}
			onmousedown={(event) => event.preventDefault()}
			onpointerdown={press}
			onpointerenter={point}
			onpointerleave={leave}
			onclick={ask}><span class="help-icon icon-[mdi--help-circle]"></span></button
		>
	{/snippet}
</Component>

{#if mode === 'pop'}
	<div
		bind:this={pop}
		popover="manual"
		role="tooltip"
		class="help-pop"
		class:is-above={at.isAbove}
		style="left: {at.x}px; top: {at.y}px; width: {POP_WIDTH}px"
		{@attach toTop}
		transition:scale={{ start: 0.96, duration: 140 }}
	>
		<b>{label}</b>{text}
	</div>
{:else if mode === 'sheet'}
	<div
		popover="manual"
		class="help-layer"
		role="presentation"
		onmousedown={(event) => event.preventDefault()}
		{@attach toTop}
	>
		<button
			type="button"
			class="help-scrim"
			aria-label="Close"
			tabindex="-1"
			onclick={close}
			transition:fade={{ duration: 180 }}
		></button>
		<div
			class="help-sheet"
			role="dialog"
			aria-label={label}
			style="bottom: {lift}px"
			transition:fly={{ y: 320, duration: 260 }}
		>
			<span class="help-grab"></span>
			<b>{label}</b>
			<p>{text}</p>
		</div>
	</div>
{/if}

<style lang="postcss">
	@reference "#ui.css";

	/* The ? itself: a filled question mark with a touch area bigger than it. Its colour follows the field's icons
	   (forms.css). App-like taps: no browser flash, no wait for a double tap, no focus ring from a tap. */
	.help {
		@apply pointer-events-auto relative inline-grid shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0;
		@apply size-[1.3em] transition-[color,opacity,width,margin] duration-150;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		touch-action: manipulation;
	}

	.help::before {
		@apply absolute -inset-3 content-[''];
	}

	.help:focus:not(:focus-visible) {
		@apply outline-0;
	}

	.help-icon {
		@apply block size-full;
	}

	/* What it opens is drawn outside the label, so none of the label's type carries over. */
	.help-pop,
	.help-layer {
		@apply pointer-events-auto m-0 border-0 p-0 text-left font-normal tracking-normal whitespace-normal select-text;
		font-size: 1rem;
		line-height: 1.5;
		-webkit-tap-highlight-color: transparent;
	}

	.help-pop {
		@apply pointer-events-none fixed inset-auto z-[120] h-fit rounded-2xl bg-base-900 px-3.5 py-3 text-xs text-white/90 shadow-xl;
		transform-origin: top left;
	}

	.help-pop.is-above {
		transform: translateY(-100%);
		transform-origin: bottom left;
	}

	.help-pop b {
		@apply mb-0.5 block text-sm font-semibold text-white;
	}

	.help-layer {
		@apply fixed inset-0 z-[120] size-full max-h-none max-w-none overflow-visible bg-transparent;
	}

	.help-scrim {
		@apply absolute inset-0 cursor-default border-0 bg-base-950/30 p-0;
		-webkit-tap-highlight-color: transparent;
	}

	.help-sheet {
		@apply absolute inset-x-0 rounded-t-[28px] bg-white px-5 pt-3 shadow-[0_-12px_40px_rgb(15_23_42/0.18)];
		@apply transition-[bottom] duration-200;
		padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
	}

	.help-grab {
		@apply mx-auto mb-4 block h-1.5 w-10 rounded-full bg-base-200;
	}

	.help-sheet b {
		@apply mb-1.5 block text-lg font-semibold text-base-900;
	}

	.help-sheet p {
		@apply m-0 text-[15px] leading-relaxed text-base-600;
	}
</style>
