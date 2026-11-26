<script lang="ts">
	// PROTOTYPE (#161): a customer's square icon, app-icon style (Justin's note 6): the company's own artwork on white,
	// never cropped or recoloured, drawn by the library's avatar (#379). A customer with no icon shows its code in a
	// round circle on sky blue (#355, Justin, 2026-11-26; before that the Customers icon on grey); a project's
	// Personnel company that is not a customer shows it white on black (`tone`). `fallback` names an icon to show
	// instead, a project's folder: projects keep their icon. `isBare` drops the ring and shadow (the report footer,
	// Justin's run 8 note 20).
	import { Avatar } from '@layerd/ui';
	import type { InitialsToneType } from './initials';
	import { clientOf } from './look.data';
	import { logoOf } from './marks';

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
		tone?: Extract<InitialsToneType, 'customer' | 'company'>;
	} = $props();

	const logo = $derived(logoOf(name, { fallback, tone }));
</script>

<Avatar
	{...logo}
	{size}
	shape={logo.shape ?? shape}
	ring={isBare ? '' : 'shadow-sm ring-1 ring-slate-900/[0.06]'}
	{isMuted}
	class={isMuted ? 'opacity-50' : ''}
	title={clientOf(name).name}
/>
