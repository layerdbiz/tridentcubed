<!-- One prototype on one device (#342), drawn at the device's real size: an iPhone 16, an iPad Air, a MacBook Air,
     a monitor or a browser window. The body is drawn round the screen, the screen holds the bar the device keeps for
     itself (status bar, notch and browser bar), and the page under it is the prototype, live. Its name sits above it,
     the same size on screen at the fitted zoom; a press on the name zooms to this device. Every colour is the UI
     library's theme. -->
<script lang="ts">
	import { Button, Icon } from '@layerd/ui';
	import type { Canvas } from './canvas.svelte';
	import { toLaptopBase, toLid, toPanel, toStand, type BodyType, type BoxType } from './devices';
	import Page from './page.svelte';
	import type { FrameType } from './settings';

	type DeviceProps = {
		frame: FrameType;
		body: BodyType;
		/** Where it lies on the canvas, its name's line included. */
		place: BoxType;
		/** The name line's height on the canvas, and the scale the devices were fitted at. */
		label: number;
		fit: number;
		/** The address the browser bar shows. */
		address: string;
		container: number | null;
		canvas: Canvas;
		onfocus: () => void;
	};

	let { frame, body, place, label, fit, address, container, canvas, onfocus }: DeviceProps =
		$props();

	// The name keeps its size on screen as the canvas zooms in, inside the line kept for it at the fitted zoom.
	const fontSize = $derived((label * 0.44 * fit) / Math.max(fit, canvas.scale));

	const isDark = $derived(frame.theme === 'dark');
	const size = $derived(`${frame.width} × ${frame.height}`);
	const pageSize = $derived(`${body.page.width} × ${body.page.height}`);
	/** The device's own bars, in the prototype's theme as a real device draws them. */
	const barLook = $derived(isDark ? 'bg-base-950 text-base-50' : 'bg-base-50 text-base-950');
	const browserLook = $derived(isDark ? 'bg-base-800 text-base-200' : 'bg-base-100 text-base-700');
	const pillLook = $derived(isDark ? 'bg-base-900 text-base-300' : 'bg-base-50 text-base-600');
	const homeLook = $derived(isDark ? 'bg-base-50' : 'bg-base-950');

	const lid = $derived(toLid(body.screen.width, body.screen.height));
	const laptopBase = $derived(toLaptopBase(lid.width));
	const panel = $derived(toPanel(body.screen.width, body.screen.height));
	const stand = $derived(toStand(panel));
	const left = $derived((place.width - body.width) / 2);
</script>

{#snippet status()}
	<div
		class="absolute inset-x-0 top-0 flex items-center justify-between px-[30px] text-[17px] font-semibold {barLook}"
		style:height="{body.bar.height}px"
	>
		<span class="w-[92px] text-center tracking-tight">9:41</span>
		<span class="flex w-[92px] items-center justify-center gap-[6px]">
			{@render signal()}
			<Icon
				icon="icon-[mdi--wifi]"
				class="size-[18px]"
			/>
			{@render battery()}
		</span>
	</div>
	<div
		class="absolute top-[11px] left-1/2 h-[37px] w-[125px] -translate-x-1/2 rounded-full bg-base-950"
	></div>
{/snippet}

{#snippet tablet()}
	<div
		class="absolute inset-x-0 top-0 flex items-center justify-between px-[22px] text-[13px] font-semibold {barLook}"
		style:height="{body.bar.height}px"
	>
		<span>9:41 <span class="ms-[6px]">Thu 26 Nov</span></span>
		<span class="flex items-center gap-[6px]">
			<Icon
				icon="icon-[mdi--wifi]"
				class="size-[15px]"
			/>
			<span>100%</span>
			{@render battery()}
		</span>
	</div>
{/snippet}

{#snippet signal()}
	<span class="flex h-[11px] items-end gap-[1.5px]">
		{#each [4, 6, 8.5, 11] as height (height)}
			<span
				class="w-[3px] rounded-[1px] bg-current"
				style:height="{height}px"
			></span>
		{/each}
	</span>
{/snippet}

{#snippet battery()}
	<span class="flex items-center gap-[1px]">
		<span class="flex h-[12px] w-[25px] rounded-[4px] border border-current/40 p-[1.5px]">
			<span class="h-full w-full rounded-[2px] bg-current"></span>
		</span>
		<span class="h-[4px] w-[1.5px] rounded-r-full bg-current/40"></span>
	</span>
{/snippet}

{#snippet browser(top: number)}
	<div
		class="absolute inset-x-0 flex items-center gap-[14px] px-[14px] text-[13px] {browserLook}"
		style:top="{top}px"
		style:height="{body.bar.height - top}px"
	>
		<span class="flex gap-[8px]">
			<span class="size-[12px] rounded-full bg-danger"></span>
			<span class="size-[12px] rounded-full bg-warning"></span>
			<span class="size-[12px] rounded-full bg-success"></span>
		</span>
		<span class="flex gap-[6px] opacity-60">
			<Icon
				icon="icon-[mdi--chevron-left]"
				class="size-[20px]"
			/>
			<Icon
				icon="icon-[mdi--chevron-right]"
				class="size-[20px]"
			/>
		</span>
		<span
			class="mx-auto flex h-[28px] w-full max-w-[560px] min-w-0 items-center justify-center gap-[6px] rounded-full px-[14px] {pillLook}"
		>
			<Icon
				icon="icon-[mdi--lock]"
				class="size-[13px] shrink-0 opacity-70"
			/>
			<span class="truncate">{address}</span>
		</span>
		<span class="w-[86px]"></span>
	</div>
{/snippet}

{#snippet notch()}
	<div
		class="absolute inset-x-0 top-0 flex items-center justify-between px-[16px] text-[13px] font-medium {barLook}"
		style:height="37px"
	>
		<span class="flex gap-[18px] opacity-80">
			<b>Browser</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span
				>Help</span
			>
		</span>
		<span class="flex items-center gap-[12px] opacity-80">
			<Icon
				icon="icon-[mdi--wifi]"
				class="size-[16px]"
			/>
			{@render battery()}
			<span>Thu 26 Nov 9:41</span>
		</span>
	</div>
	<div
		class="absolute top-0 left-1/2 flex h-[32px] w-[190px] -translate-x-1/2 items-center justify-center rounded-b-[10px] bg-base-950"
	>
		<span class="size-[7px] rounded-full bg-base-800 ring-2 ring-base-900"></span>
	</div>
	{@render browser(37)}
{/snippet}

<figure
	class="device absolute m-0"
	style:left="{place.x}px"
	style:top="{place.y}px"
	style:width="{place.width}px"
	style:height="{place.height}px"
>
	<figcaption
		class="flex items-end gap-[0.5em] overflow-hidden pb-[0.3em] whitespace-nowrap text-base-600-300"
		style:height="{label}px"
		style:font-size="{fontSize}px"
	>
		<Button
			ghost
			label={frame.model}
			title="Zoom to this {frame.model}"
			class="shrink-0 px-[0.4em]! py-[0.25em]! font-semibold text-base-950-50"
			onclick={onfocus}
		/>
		{#if frame.name}<span class="name min-w-0 truncate pb-[0.25em] font-semibold">{frame.name}</span
			>{/if}
		<span
			class="size shrink-0 pb-[0.25em] tabular-nums"
			title="The page gets {pageSize}">{size}</span
		>
		<Button
			ghost
			href={frame.url}
			external
			variant="icon"
			icon="icon-[mdi--open-in-new]"
			label="Open on its own"
			aria-label="Open {frame.name || 'this prototype'} on its own"
			title="Open on its own"
			class="ms-auto shrink-0 p-[0.25em]!"
		/>
	</figcaption>

	<div
		class="body relative"
		style:left="{left}px"
		style:width="{body.width}px"
		style:height="{body.height}px"
	>
		{#if body.kind === 'phone'}
			<!-- The action button and volume on the left, the side button and Camera Control on the right. -->
			{#each [[120, 34], [190, 62], [268, 62]] as [top, height] (top)}
				<span
					class="absolute left-0 w-[6px] rounded-l-[3px] bg-base-500"
					style:top="{top}px"
					style:height="{height}px"
				></span>
			{/each}
			{#each [[230, 100], [560, 64]] as [top, height] (top)}
				<span
					class="absolute right-0 w-[6px] rounded-r-[3px] bg-base-500"
					style:top="{top}px"
					style:height="{height}px"
				></span>
			{/each}
			<div
				class="absolute inset-y-0 rounded-[66px] bg-base-400 p-[3px] shadow-2xl"
				style:left="{body.screen.x - 19}px"
				style:right="{body.screen.x - 19}px"
			>
				<div class="size-full rounded-[63px] bg-base-950"></div>
			</div>
		{:else if body.kind === 'tablet'}
			<span class="absolute top-0 right-[64px] h-[6px] w-[64px] rounded-t-[3px] bg-base-500"></span>
			<span class="absolute top-0 right-[150px] h-[6px] w-[48px] rounded-t-[3px] bg-base-500"
			></span>
			<span class="absolute top-0 right-[204px] h-[6px] w-[48px] rounded-t-[3px] bg-base-500"
			></span>
			<div
				class="absolute inset-0 top-[3px] right-[3px] rounded-[58px] bg-base-300 p-[3px] shadow-2xl"
			>
				<div class="relative size-full rounded-[55px] bg-base-950">
					<span
						class="absolute top-1/2 right-[16px] size-[8px] -translate-y-1/2 rounded-full bg-base-800 ring-2 ring-base-900"
					></span>
				</div>
			</div>
		{:else if body.kind === 'laptop'}
			<div
				class="absolute top-0 rounded-t-[22px] rounded-b-[8px] bg-base-400 p-[2px]"
				style:left="{(body.width - lid.width) / 2}px"
				style:width="{lid.width}px"
				style:height="{lid.height}px"
			>
				<div class="size-full rounded-t-[20px] rounded-b-[6px] bg-base-950"></div>
			</div>
			<div
				class="absolute inset-x-0 bottom-0 rounded-t-[3px] rounded-b-[4%_100%] border-t-2 border-base-500 bg-linear-to-b from-base-200 to-base-400 shadow-2xl"
				style:height="{laptopBase.height}px"
			>
				<span
					class="absolute top-0 left-1/2 h-[40%] -translate-x-1/2 rounded-b-[10px] bg-base-400"
					style:width="{laptopBase.scoop}px"
				></span>
			</div>
		{:else if body.kind === 'desktop'}
			<div
				class="absolute left-1/2 -translate-x-1/2 bg-linear-to-b from-base-500 to-base-400"
				style:top="{panel.height - 8}px"
				style:width="{stand.neckWidth}px"
				style:height="{stand.neck + 8}px"
			></div>
			<div
				class="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[12px] rounded-b-[4px] bg-linear-to-b from-base-400 to-base-500 shadow-2xl"
				style:width="{stand.footWidth}px"
				style:height="{stand.foot}px"
			></div>
			<div
				class="absolute top-0 left-0 rounded-[10px] bg-base-900 p-[2px] shadow-2xl"
				style:width="{panel.width}px"
				style:height="{panel.height}px"
			>
				<div class="relative size-full rounded-[8px] bg-base-950">
					<span class="absolute right-[24px] bottom-[14px] size-[5px] rounded-full bg-base-600"
					></span>
				</div>
			</div>
		{:else}
			<div
				class="absolute inset-0 rounded-[12px] shadow-2xl {isDark ? 'bg-base-700' : 'bg-base-300'}"
			></div>
		{/if}

		<div
			class="screen absolute overflow-hidden {isDark ? 'bg-base-950' : 'bg-base-50'}"
			style:left="{body.screen.x}px"
			style:top="{body.screen.y}px"
			style:width="{body.screen.width}px"
			style:height="{body.screen.height}px"
			style:border-radius={body.kind === 'laptop'
				? `${body.screen.radius}px ${body.screen.radius}px 0 0`
				: `${body.screen.radius}px`}
		>
			<div
				class="absolute"
				style:left="{body.page.x}px"
				style:top="{body.page.y}px"
				style:width="{body.page.width}px"
				style:height="{body.page.height}px"
			>
				<Page
					url={frame.url}
					title="{frame.name || 'Prototype'} on {frame.model}"
					theme={frame.theme}
					{container}
					{canvas}
				/>
			</div>

			{#if body.bar.kind === 'status'}
				{@render status()}
			{:else if body.bar.kind === 'tablet'}
				{@render tablet()}
			{:else if body.bar.kind === 'notch'}
				{@render notch()}
			{:else}
				{@render browser(0)}
			{/if}

			{#if body.kind === 'phone' || body.kind === 'tablet'}
				<span
					class="pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] -translate-x-1/2 rounded-full {homeLook}"
					style:width={body.kind === 'phone' ? '134px' : '320px'}
				></span>
			{/if}
		</div>
	</div>
</figure>

<style>
	/* The name line shows what fits: the size goes first when the device is narrow on the canvas. */
	figcaption {
		container-type: inline-size;
	}
	@container (max-width: 26em) {
		.size {
			display: none;
		}
	}
</style>
