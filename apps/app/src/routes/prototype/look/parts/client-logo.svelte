<script lang="ts">
	// PROTOTYPE (#161): a customer's square icon, app-icon style (Justin's note 6): the company's own artwork on white,
	// never cropped or recoloured. A customer with no icon shows the Customers icon on grey (Justin, 2026-11-11:
	// "just use the icon in place of that"); `fallback` names another icon, a project's folder. `isBare` drops the ring and shadow (the report footer,
	// Justin's run 8 note 20).
	import { clientOf, PAGE_ICONS } from './look.data';

	let {
		name,
		size = 40,
		isMuted = false,
		isBare = false,
		shape = 'rounded',
		fallback = PAGE_ICONS.customers
	}: {
		name: string;
		size?: number;
		isMuted?: boolean;
		isBare?: boolean;
		shape?: 'rounded' | 'circle';
		fallback?: string;
	} = $props();

	const client = $derived(clientOf(name));
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden {client.icon
		? 'bg-white'
		: 'bg-slate-200'} {isBare ? '' : 'shadow-sm ring-1 ring-slate-900/[0.06]'} {shape === 'circle'
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
			class="{fallback} text-slate-400"
			style="width: {size * 0.56}px; height: {size * 0.56}px"
		></span>
	{/if}
</span>
