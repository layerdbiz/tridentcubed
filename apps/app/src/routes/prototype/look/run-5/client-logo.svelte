<script lang="ts">
	// PROTOTYPE (#161): a client's square icon, app-icon style (Justin's note 6): the company's own artwork on white,
	// never cropped or recoloured. A client with no icon gets its initial. `isBare` drops the ring and shadow (the report
	// footer, Justin's run 8 note 20).
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
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white {isBare
		? ''
		: 'shadow-sm ring-1 ring-slate-900/[0.06]'} {shape === 'circle'
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
			class="font-semibold text-slate-500"
			style="font-size: {size * 0.42}px">{client.name.slice(0, 1)}</span
		>
	{/if}
</span>
