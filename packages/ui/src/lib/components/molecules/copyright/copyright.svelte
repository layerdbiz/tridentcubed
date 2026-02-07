<script lang="ts">
	/**
	 * @tags ui
	 * @layout horizontal
	 */
	import { Text, type TextProps } from '@layerd/ui';
	import { SvelteDate } from 'svelte/reactivity';

	type BusinessType =
		| 'llc'
		| 'inc'
		| 'ltd'
		| 'llp'
		| 'pllc'
		| 's-corp'
		| 'nonprofit corporation'
		| 'sole proprietorship'
		| 'partnership';

	export interface CopyrightProps extends Omit<TextProps, 'type'> {
		name?: string;
		year?: string | number;
		type?: BusinessType | string;
		separator?: string;
		description?: string;
	}

	let {
		name = 'Company Name',
		year = undefined,
		type = undefined,
		separator = undefined,
		description = undefined,
		children = undefined,
		...props
	}: CopyrightProps = $props();

	const currentDate = new SvelteDate();
	const currentYear = $derived(currentDate.getFullYear());
	const startYear = $derived(year ? parseInt(year.toString()) : currentYear);
	const yearRange = $derived(
		startYear < currentYear ? `${startYear} — ${currentYear}` : `${currentYear}`
	);

	const businessTypes: Record<BusinessType, string> = {
		llc: 'LLC',
		inc: 'Inc.',
		ltd: 'Ltd.',
		llp: 'LLP',
		pllc: 'PLLC',
		's-corp': 'S-Corp',
		'nonprofit corporation': 'Nonprofit Corporation',
		'sole proprietorship': 'Sole Proprietorship',
		partnership: 'Partnership'
	};

	const formattedType = $derived(type ? businessTypes[type as BusinessType] || type : null);
	const companyName = $derived(formattedType ? `${name}, ${formattedType}` : name);
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Text
	{...props}
	class="copyright flex items-center justify-center py-4 text-center {props.class || ''}"
>
	{#if children}
		© {yearRange} {@render children()}
	{:else}
		© {yearRange}
		{companyName}
		{#if separator && description}
			{separator} {description}{/if}
	{/if}
</Text>
