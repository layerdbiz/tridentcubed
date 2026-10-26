<script lang="ts">
	// PROTOTYPE (#161): a customer's square icon, app-icon style (Justin's note 6): the company's own artwork on white,
	// never cropped or recoloured. A customer with no icon gets its initial in white on a colour picked from its name,
	// so it stays the same everywhere (2026-10-26 19:22). `isBare` drops the ring and shadow (the report footer,
	// Justin's run 8 note 20).
	import { clientOf } from './look.data';

	let {
		name,
		size = 40,
		isMuted = false,
		isBare = false,
		shape = 'rounded'
	}: {
		name: string;
		size?: number;
		isMuted?: boolean;
		isBare?: boolean;
		shape?: 'rounded' | 'circle';
	} = $props();

	const client = $derived(clientOf(name));
	const COLOURS = [
		'bg-slate-950',
		'bg-primary',
		'bg-teal-600',
		'bg-violet-600',
		'bg-rose-600',
		'bg-amber-600',
		'bg-sky-700',
		'bg-emerald-700'
	];
	const colour = $derived(
		COLOURS[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % COLOURS.length]
	);
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden {client.icon
		? 'bg-white'
		: colour} {isBare ? '' : 'shadow-sm ring-1 ring-slate-900/[0.06]'} {shape === 'circle'
		? 'rounded-full'
		: 'rounded-[24%]'} {isMuted ? 'opacity-50 grayscale' : ''}"
	style="width: {size}px; height: {size}px"
	title={client.name}
	role="img"
	aria-label="{client.name} logo"
>
	{#if client.icon}
		<img
			src={client.icon}
			alt=""
			draggable="false"
			class="size-full object-contain"
		/>
	{:else}
		<span
			class="font-semibold text-white"
			style="font-size: {size * 0.44}px">{client.name.slice(0, 1).toUpperCase()}</span
		>
	{/if}
</span>
