<!-- One prototype in a frame (#342): its name above it, the screen size it was given, and the theme and container
     the controls set, written straight into the prototype's page (it shares play's address). On the canvas, two
     fingers or Ctrl+wheel on the prototype zoom the canvas (#361); filling the page, the prototype keeps its own. -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Canvas } from './canvas.svelte';
	import { forwardGestures } from './pinch';
	import type { FrameType, SettingsType } from './settings';

	type FrameProps = {
		frame: FrameType;
		settings: SettingsType;
		canvas: Canvas | null;
		hasLabel: boolean;
	};

	let { frame, settings, canvas, hasLabel }: FrameProps = $props();

	let iframe: HTMLIFrameElement | undefined = $state();
	let stopGestures = () => {};

	const size = $derived(frame.width && frame.height ? `${frame.width} × ${frame.height}` : '');

	function onload() {
		dress();
		stopGestures();
		if (iframe && canvas) stopGestures = forwardGestures(iframe, canvas);
	}

	/** The theme for both conventions: the starter's data-theme and the UI library's color-scheme. */
	function dress() {
		const doc = toDocument();
		if (!doc) return;

		const root = doc.documentElement;
		root.dataset.theme = frame.theme;
		root.style.colorScheme = frame.theme;

		const id = 'play-container';
		doc.getElementById(id)?.remove();
		if (!settings.isContainerOn) return;

		// A prototype marks the box its container queries measure with data-container; without one, it is the body.
		const target = doc.querySelector('[data-container]') ? '[data-container]' : 'body';
		const style = doc.createElement('style');
		style.id = id;
		style.textContent = `${target} { container-type: inline-size; width: ${settings.container}px !important; max-width: 100%; margin-inline: auto !important; outline: 1px dashed #db2777; outline-offset: -1px; }`;
		doc.head.append(style);
	}

	function toDocument(): Document | null {
		try {
			return iframe?.contentDocument ?? null;
		} catch {
			return null;
		}
	}

	$effect(() => {
		// Re-dress when the container controls move; the frame itself is remade for a new theme or screen.
		void settings.isContainerOn;
		void settings.container;
		dress();
	});

	onDestroy(() => stopGestures());
</script>

<figure
	class="frame"
	class:is-fill={frame.width === null}
	style:--width={frame.width ? `${frame.width}px` : null}
	style:--height={frame.height ? `${frame.height}px` : null}
>
	{#if hasLabel}
		<figcaption>
			<span class="name">{frame.name}</span>
			{#if size}<span class="size">{size}</span>{/if}
			<a
				href={frame.url}
				target="_blank"
				rel="noopener"
				aria-label="Open {frame.name} on its own">Open ↗</a
			>
		</figcaption>
	{/if}
	<div
		class="screen"
		class:is-dark={frame.theme === 'dark'}
	>
		<iframe
			bind:this={iframe}
			src={frame.url}
			title={frame.name}
			{onload}
			style:color-scheme={frame.theme}
		></iframe>
	</div>
</figure>

<style>
	.frame {
		display: flex;
		flex: none;
		flex-direction: column;
		margin: 0;
	}
	.frame.is-fill {
		flex: 1;
		min-width: 0;
		min-height: 0;
	}
	figcaption {
		display: flex;
		align-items: baseline;
		gap: 8px;
		/* As wide as the frame and never wider: a label that grew the canvas as it zoomed out would shrink the fit
		   again, without end. */
		width: 0;
		min-width: 100%;
		overflow: hidden;
		/* Labels keep their size on screen at any zoom (the canvas sets --scale). */
		font-size: calc(13px / var(--scale, 1));
		padding-bottom: calc(8px / var(--scale, 1));
		white-space: nowrap;
	}
	.is-fill figcaption {
		padding: 6px 10px;
		font-size: 12px;
	}
	.name {
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		font-weight: 700;
		text-overflow: ellipsis;
	}
	.size {
		flex: 0 100 auto;
		min-width: 0;
		overflow: hidden;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	a {
		flex: none;
		margin-left: auto;
		color: var(--accent);
		font-weight: 600;
		text-decoration: none;
	}
	.screen {
		width: var(--width);
		height: var(--height);
		overflow: hidden;
		border-radius: 14px;
		background: #fff;
		box-shadow: var(--frame-shadow);
	}
	.screen.is-dark {
		background: #0a101c;
	}
	.is-fill .screen {
		flex: 1;
		width: auto;
		height: auto;
		border-radius: 0;
		box-shadow: none;
	}
	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}
</style>
