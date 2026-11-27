<script lang="ts">
	// Email Signature (#354; Justin, 2026-11-27: "We do need to use the canvas though, because we're actually
	// creating something that we need to preview"): the signature on the report preview's canvas, one white page
	// that is dragged and zoomed like a report's (viewport.svelte.ts), with the same zoom bar. The signature is drawn
	// in a frame of its own, so the app's styles never touch it and what shows is what Outlook gets. The bar's last
	// button is Copy, in Download's place: it copies the signature, styling and all, for Outlook's signature box.
	// Code shows the signature's HTML on the page in its place, and Copy then copies that (a default: Justin is not
	// sure yet what Code is for).
	import { untrack } from 'svelte';
	import { Button } from '@layerd/ui';
	import type { LookState } from './look.state.svelte';
	import { Viewport } from './viewport.svelte';
	import ZoomBar from './zoom-bar.svelte';

	let {
		look,
		html,
		left = 0,
		top = 0,
		isLeft = false
	}: {
		look: LookState;
		// The signature as the library's Email writes it.
		html: string;
		// Room taken over the canvas: the Edit column at the left (desktop), the header on top (phone).
		left?: number;
		top?: number;
		// Beside the Edit column the page starts next to it, as the report's do.
		isLeft?: boolean;
	} = $props();

	// The signature is drawn as wide as a mail app's message, on a page with room round it.
	const WIDTH = 600;
	const PAD = 32;
	const PAGE = WIDTH + PAD * 2;
	const PAGE_LOOK =
		'shadow-[0_1px_3px_rgb(15_23_42/0.08),0_24px_48px_-24px_rgb(15_23_42/0.25)] ring-1 ring-slate-900/[0.04]';

	const viewport = new Viewport();
	$effect.pre(() => {
		viewport.left = left;
		viewport.top = top;
		viewport.isLeft = isLeft;
	});

	let frame = $state<HTMLIFrameElement>();
	// How tall the signature is once drawn, and the page round it.
	let drawn = $state(0);
	let height = $state(0);
	let isCode = $state(false);
	let isCopied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	// The frame's own page: nothing round the signature, as in a message.
	const page = $derived(
		`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif}</style></head><body>${html}</body></html>`
	);

	// A frame's page is loaded once its pictures are, so it is measured then.
	function measure() {
		const document = frame?.contentDocument;
		if (!document?.body) return;
		drawn = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
	}

	// A frame hidden under the code is not laid out, so it is measured again as it comes back.
	$effect(() => {
		if (!isCode) untrack(measure);
	});

	// The signature fills the canvas, centred, when it is first shown and whenever it changes size: a banner picked,
	// the window resized. Its code, much longer, runs across the canvas from the top, to be read. Otherwise the page
	// stays where it was put.
	function fit(isAnimated = true) {
		if (isCode) viewport.fitWidth({ x: 0, y: 0, width: PAGE, height }, isAnimated);
		else viewport.fitAll(isAnimated);
	}

	let shape = '';
	$effect(() => {
		viewport.content = { width: PAGE, height: Math.max(1, height) };
		const next = `${viewport.width}x${viewport.height}:${height}:${left}:${top}:${isCode}`;
		if (!viewport.width || !height) return;
		untrack(() => {
			if (next === shape) return;
			const isFirst = !shape;
			shape = next;
			fit(!isFirst);
		});
	});

	// Copies what the page shows: the drawn signature as it looks, which Outlook keeps when it is pasted, or the code
	// as text. The signature goes as HTML with its words as plain text beside it, so it pastes styled where it can
	// and as words anywhere else; none of the app's styles go with it.
	async function copyDrawn() {
		const words = frame?.contentDocument?.body.innerText.trim() ?? '';
		if (typeof ClipboardItem === 'function' && navigator.clipboard?.write) {
			await navigator.clipboard.write([
				new ClipboardItem({
					'text/html': new Blob([html], { type: 'text/html' }),
					'text/plain': new Blob([words], { type: 'text/plain' })
				})
			]);
			return;
		}
		selectAndCopy();
	}

	// An older browser copies a selection of the signature's own frame instead.
	function selectAndCopy() {
		const document = frame?.contentDocument;
		const view = frame?.contentWindow;
		const signature = document?.querySelector('.email-signature') ?? document?.body;
		const selection = view?.getSelection();
		if (!document || !signature || !selection) throw new Error('The signature is not drawn yet.');
		view?.focus();
		const range = document.createRange();
		range.selectNodeContents(signature);
		selection.removeAllRanges();
		selection.addRange(range);
		const isDone = document.execCommand('copy');
		selection.removeAllRanges();
		if (!isDone) throw new Error('The browser did not copy.');
	}

	async function copy() {
		try {
			if (isCode) await navigator.clipboard.writeText(html);
			else await copyDrawn();
			look.say(isCode ? 'Code copied' : 'Signature copied: paste it into Outlook');
			isCopied = true;
			clearTimeout(copiedTimer);
			copiedTimer = setTimeout(() => (isCopied = false), 2000);
		} catch {
			look.say('That did not copy. Try again.');
		}
	}

	const action = $derived({
		label: isCopied ? 'Copied' : isCode ? 'Copy the code' : 'Copy the signature',
		icon: isCopied ? 'icon-[mdi--check]' : 'icon-[mdi--content-copy]',
		onclick: copy
	});
</script>

<div class="relative h-full overflow-hidden bg-slate-100">
	<div
		class="absolute inset-0 touch-none select-none [-webkit-touch-callout:none] {viewport.isMoving
			? 'cursor-grabbing'
			: 'cursor-grab'}"
		bind:clientWidth={viewport.width}
		bind:clientHeight={viewport.height}
		{@attach viewport.gestures}
	>
		<div
			class="absolute top-0 left-0 origin-top-left {viewport.isAnimating
				? 'transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
				: ''} {viewport.isLayered ? 'will-change-transform' : ''}"
			style="transform: {viewport.transform}; width: {PAGE}px"
		>
			<article
				class="overflow-hidden {isCode ? 'bg-slate-950' : 'bg-white'} {PAGE_LOOK}"
				style="padding: {PAD}px"
				bind:offsetHeight={height}
				aria-label={isCode ? 'The signature’s code' : 'The signature'}
			>
				<!-- Drawn whichever is shown, so Copy always has it; the drags go to the canvas, not into the frame. -->
				<iframe
					bind:this={frame}
					class="pointer-events-none block w-full border-0 bg-white {isCode ? 'hidden' : ''}"
					style="height: {drawn || 240}px"
					title="Email Signature"
					tabindex="-1"
					srcdoc={page}
					onload={measure}
				></iframe>
				{#if isCode}
					<pre
						class="m-0 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-slate-100">{html.trim()}</pre>
				{/if}
			</article>
		</div>
	</div>

	<div
		class="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-10 md:top-1/2 md:right-5 md:bottom-auto md:-translate-y-1/2"
	>
		<ZoomBar
			{viewport}
			onfit={() => fit()}
			{action}
		>
			<Button
				appearance={isCode ? 'heavy' : 'ghost'}
				invert
				sm
				icon="icon-[mdi--code-tags]"
				aria-label={isCode ? 'Show the signature' : 'Show the code'}
				aria-pressed={isCode}
				title={isCode ? 'Show the signature' : 'Show the code'}
				onclick={() => (isCode = !isCode)}
			/>
		</ZoomBar>
	</div>
</div>
