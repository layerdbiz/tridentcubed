<!-- One prototype's page (#342): the HTML file in a frame, with the theme and container the controls set written
     straight into it (it shares play's address). On the canvas, two fingers or Ctrl+wheel on the prototype zoom the
     canvas (#361); filling the page, the prototype keeps its own. -->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Canvas } from './canvas.svelte';
	import { forwardGestures } from './pinch';
	import type { ThemeType } from './settings';

	type PageProps = {
		url: string;
		title: string;
		theme: ThemeType;
		/** The width the prototype's container is held to, for container queries; null leaves it alone. */
		container: number | null;
		canvas: Canvas | null;
	};

	let { url, title, theme, container, canvas }: PageProps = $props();

	let iframe: HTMLIFrameElement | undefined = $state();
	let stopGestures = () => {};

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
		root.dataset.theme = theme;
		root.style.colorScheme = theme;

		const id = 'play-container';
		doc.getElementById(id)?.remove();
		if (container === null) return;

		// A prototype marks the box its container queries measure with data-container; without one, it is the body.
		const target = doc.querySelector('[data-container]') ? '[data-container]' : 'body';
		const style = doc.createElement('style');
		style.id = id;
		style.textContent = `${target} { container-type: inline-size; width: ${container}px !important; max-width: 100%; margin-inline: auto !important; outline: 1px dashed; outline-offset: -1px; }`;
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
		// Dressed again when the container control moves; a new theme or screen remakes the page.
		void container;
		dress();
	});

	onDestroy(() => stopGestures());
</script>

<iframe
	bind:this={iframe}
	src={url}
	{title}
	{onload}
	class="block size-full border-0"
	style:color-scheme={theme}
></iframe>
