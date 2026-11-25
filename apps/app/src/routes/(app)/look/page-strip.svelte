<script lang="ts">
	// Presentation's strip (#324; Justin, 2026-11-25): the report's pages small, in a row under the page shown, centred
	// when they all fit, their ends fading out; the page shown is lit and kept in the middle, and a tap goes to a page.
	// Each small page is a copy of the page drawn on the canvas, taken again whenever the pages change.
	let {
		canvas,
		pages,
		at,
		isWide,
		ongo,
		height = $bindable(0)
	}: {
		canvas: HTMLElement | undefined;
		// The report's pages, only to know when to copy them again.
		pages: readonly unknown[];
		at: number;
		isWide: boolean;
		ongo: (index: number) => void;
		height?: number;
	} = $props();

	const W = 595;
	const H = 842;
	const tall = $derived(isWide ? 74 : 54);
	let list: HTMLDivElement | undefined = $state();
	const slots: HTMLDivElement[] = $state([]);

	function copyOf(page: Element, scale: number) {
		const copy = page.cloneNode(true) as HTMLElement;
		copy.removeAttribute('data-page');
		copy.className =
			'pointer-events-none absolute top-0 left-0 overflow-hidden bg-white text-slate-800';
		copy.style.cssText = `width: ${W}px; height: ${H}px; transform: scale(${scale}); transform-origin: 0 0`;
		return copy;
	}

	$effect(() => {
		const count = pages.length;
		const scale = tall / H;
		const drawn = canvas;
		// After the canvas has drawn the pages as they are now.
		const frame = requestAnimationFrame(() => {
			const shown = drawn?.querySelectorAll('article[data-page]') ?? [];
			for (let index = 0; index < count; index++) {
				const page = shown[index];
				if (page && slots[index]) slots[index].replaceChildren(copyOf(page, scale));
			}
		});
		return () => cancelAnimationFrame(frame);
	});

	// The page shown kept in the middle of the strip.
	$effect(() => {
		const lit = slots[at]?.parentElement;
		if (!list || !lit) return;
		list.scrollTo({
			left: lit.offsetLeft - (list.clientWidth - lit.offsetWidth) / 2,
			behavior: 'smooth'
		});
	});

	const FADE =
		'[mask-image:linear-gradient(to_right,transparent,#000_64px,#000_calc(100%-64px),transparent)]';
</script>

<div
	class="absolute inset-x-0 bottom-0 z-[3] h-[calc(76px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:h-24"
	data-no-pan
	bind:clientHeight={height}
>
	<div
		bind:this={list}
		class="flex h-full touch-pan-x [scrollbar-width:none] items-center gap-2 overflow-x-auto overscroll-x-contain py-0 pr-[76px] pl-4 md:px-4 {FADE} [&::-webkit-scrollbar]:hidden"
		role="tablist"
		aria-label="Pages"
	>
		{#each pages as _, index (index)}
			<button
				type="button"
				class="relative shrink-0 overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgb(15_23_42/0.15)] outline-2 outline-offset-2 transition-[outline-color] duration-150 first:ml-auto last:mr-auto {index ===
				at
					? 'outline-primary'
					: 'outline-transparent'}"
				style="height: {tall}px; width: {(tall * W) / H}px"
				role="tab"
				aria-selected={index === at}
				aria-label="Page {index + 1}"
				onclick={() => ongo(index)}
			>
				<div bind:this={slots[index]}></div>
			</button>
		{/each}
	</div>
</div>
