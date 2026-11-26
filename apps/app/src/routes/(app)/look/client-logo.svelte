<script lang="ts">
	// PROTOTYPE (#161): a customer's square icon, app-icon style (Justin's note 6): the company's own artwork on white,
	// never cropped or recoloured. A customer with no icon shows its code in a round circle on sky blue (#355, Justin,
	// 2026-11-26; before that the Customers icon on grey); a company added on the spot on a project shows it white on
	// black (`tone`). `fallback` names an icon to show instead, a project's folder: projects keep their icon. `isBare`
	// drops the ring and shadow (the report footer, Justin's run 8 note 20).
	import { toCrossOrigin } from '#lib/files/files.schema.js';
	import { codeOf, toInitialsPicture } from './initials';
	import { clientOf, PAGE_ICONS } from './look.data';

	let {
		name,
		size = 40,
		isMuted = false,
		isBare = false,
		shape = 'rounded',
		fallback,
		tone = 'customer'
	}: {
		name: string;
		size?: number;
		isMuted?: boolean;
		isBare?: boolean;
		shape?: 'rounded' | 'circle';
		fallback?: string;
		tone?: 'customer' | 'company';
	} = $props();

	const client = $derived(clientOf(name));
	// No customer picked yet shows the Customers icon, not a code made of nothing.
	const code = $derived(
		client.icon || fallback || !name.trim()
			? ''
			: toInitialsPicture(codeOf(client.name, client.code), tone)
	);
</script>

<span
	class="relative inline-flex shrink-0 items-center justify-center overflow-hidden {client.icon
		? 'bg-white'
		: 'bg-slate-200'} {isBare ? '' : 'shadow-sm ring-1 ring-slate-900/[0.06]'} {shape ===
		'circle' || code
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
			crossorigin={toCrossOrigin(client.icon)}
			alt=""
			draggable="false"
			class="size-full object-contain"
		/>
	{:else if code}
		<img
			src={code}
			alt=""
			draggable="false"
			class="size-full"
		/>
	{:else}
		<span
			class="{fallback ?? PAGE_ICONS.customers} text-slate-400"
			style="width: {size * 0.56}px; height: {size * 0.56}px"
		></span>
	{/if}
</span>
