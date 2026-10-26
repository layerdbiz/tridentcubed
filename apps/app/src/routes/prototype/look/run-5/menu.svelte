<script
	module
	lang="ts"
>
	export type OptionType = {
		id: string;
		label: string;
		icon?: string;
		dot?: string;
		count?: number;
		// A delete in a ⋮ menu reads red.
		isDanger?: boolean;
	};
</script>

<script lang="ts">
	// PROTOTYPE (#161): a small dropdown menu (view and status pickers, each photo's ⋮ menu, and the Point, Transport
	// type and Transport mode drop-downs, which need dots and icons a native select cannot show). Closes on a pick,
	// outside tap or Escape. `isWide` fills its row. The list opens in the browser's top layer (a popover), placed
	// under its button, or over it when there is no room below, so no scrolling or rounded box around the button cuts
	// it off (the ⋮ of each project in the dashboard's lists, 2026-10-26).
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { scale } from 'svelte/transition';

	let {
		options,
		value,
		label,
		onpick,
		trigger,
		align = 'right',
		isWide = false
	}: {
		options: OptionType[];
		value: string;
		label: string;
		onpick: (id: string) => void;
		trigger: Snippet<[OptionType | undefined, boolean]>;
		align?: 'left' | 'right';
		isWide?: boolean;
	} = $props();

	let isOpen = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let place = $state('');
	const current = $derived(options.find((option) => option.id === value));

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}

	function toggle() {
		if (isOpen || !root) return (isOpen = false);
		const box = root.getBoundingClientRect();
		const tall = options.length * 40 + 16;
		const isUp = innerHeight - box.bottom < tall + 16 && box.top > tall + 16;
		const x = align === 'right' ? `right: ${innerWidth - box.right}px` : `left: ${box.left}px`;
		const y = isUp ? `bottom: ${innerHeight - box.top + 8}px` : `top: ${box.bottom + 8}px`;
		place = `${x}; ${y}; min-width: ${isWide ? box.width : 192}px`;
		isOpen = true;
	}

	// In the top layer, and closed by any scroll, which would leave it behind.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover();
		const close = () => (isOpen = false);
		document.addEventListener('scroll', close, { capture: true, passive: true });
		return () => document.removeEventListener('scroll', close, { capture: true });
	};
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
	onresize={() => (isOpen = false)}
/>

<div
	class="relative {isWide ? 'w-full' : ''}"
	bind:this={root}
>
	<button
		type="button"
		class="flex items-center {isWide ? 'w-full' : ''}"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-label={label}
		onclick={toggle}>{@render trigger(current, isOpen)}</button
	>
	{#if isOpen}
		<div
			popover="manual"
			class="fixed m-0 overflow-visible rounded-2xl border-0 bg-white p-1.5 text-left shadow-[0_2px_6px_rgb(15_23_42/0.06),0_20px_44px_-12px_rgb(15_23_42/0.28)]"
			style="inset: auto; {place}"
			role="listbox"
			aria-label={label}
			transition:scale={{ start: 0.95, duration: 140 }}
			{@attach lift}
		>
			{#each options as option (option.id)}
				<button
					type="button"
					role="option"
					aria-selected={option.id === value}
					class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition {option.isDanger
						? 'font-medium text-danger hover:bg-danger/10'
						: option.id === value
							? 'bg-primary/[0.08] font-medium text-slate-900'
							: 'text-slate-600 hover:bg-slate-900/[0.04]'}"
					onclick={() => {
						onpick(option.id);
						isOpen = false;
					}}
				>
					{#if option.icon}<span
							class="{option.icon} size-[18px] {option.isDanger ? '' : 'text-slate-500'}"
						></span>{/if}
					{#if option.dot}<span class="size-2.5 rounded-full {option.dot}"></span>{/if}
					<span class="flex-1">{option.label}</span>
					{#if option.count !== undefined}<span class="text-xs text-slate-400 tabular-nums"
							>{option.count}</span
						>{/if}
					{#if option.id === value}<span class="icon-[mdi--check] size-4 text-primary"></span>{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
