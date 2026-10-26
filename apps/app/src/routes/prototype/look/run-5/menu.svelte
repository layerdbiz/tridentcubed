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
	// outside tap or Escape. `isWide` fills its row.
	import type { Snippet } from 'svelte';
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
	const current = $derived(options.find((option) => option.id === value));

	function onpointerdown(event: PointerEvent) {
		if (isOpen && root && !root.contains(event.target as Node)) isOpen = false;
	}
</script>

<svelte:window
	{onpointerdown}
	onkeydown={(event) => event.key === 'Escape' && (isOpen = false)}
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
		onclick={() => (isOpen = !isOpen)}>{@render trigger(current, isOpen)}</button
	>
	{#if isOpen}
		<div
			class="absolute top-full z-50 mt-2 min-w-48 origin-top rounded-2xl bg-white p-1.5 shadow-[0_2px_6px_rgb(15_23_42/0.06),0_20px_44px_-12px_rgb(15_23_42/0.28)] {align ===
			'right'
				? 'right-0'
				: 'left-0'}"
			role="listbox"
			aria-label={label}
			transition:scale={{ start: 0.95, duration: 140 }}
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
