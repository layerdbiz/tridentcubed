<script lang="ts">
	// The base component (ADR 0001): every library component starts from it (Justin, 2026-11-26), and it turns the
	// styling props into theme classes. A component that asks for no layout and none of the base props (debug,
	// observe, scroll, persist, total, a bound value) takes the light path: it is drawn straight from here, the same
	// element with the same attributes and content Root would give it, so a piece that repeats in every list row
	// costs little more than a plain element. Anything else takes the full path, `rooted.svelte`, where Root lays it
	// out and the base props work.
	import {
		isLightRequest,
		normalizeComponentTag,
		toLightRootProps,
		toPlainProps,
		type ComponentProps
	} from '@layerd/ui';
	import type { Snippet } from 'svelte';
	import Rooted from './rooted.svelte';

	let { value = $bindable(), checked = $bindable(false), ...props }: ComponentProps = $props();

	// What was handed, read once into a plain object: the light path asks of it twice, and reading the props proxies
	// again cost more than drawing the element in a long list (#381, measured). The full path takes the props as
	// they came.
	const handed = $derived(toPlainProps(props));
	const isLight = $derived(isLightRequest(handed));

	// On the full path a drawn element's input and change go to the bound value, in place of any the caller gave;
	// the light path keeps that, so the two behave alike.
	function ignore(): void {}
</script>

{#snippet content(text: string = 'Component')}
	{#if handed.children}
		{@render (handed.children as Snippet)()}
	{:else if handed.label !== undefined && handed.label !== null && handed.label !== ''}
		{handed.label}
	{:else}
		{text}
	{/if}
{/snippet}

{#snippet layout()}
	{#if handed.children}
		{@render (handed.children as Snippet)()}
	{:else if handed.label}
		{handed.label}
	{/if}
{/snippet}

{#if isLight && handed.component}
	{@render (handed.component as NonNullable<ComponentProps['component']>)({
		props: toLightRootProps(handed),
		layout,
		content,
		observe: undefined
	})}
{:else if isLight}
	<svelte:element
		this={normalizeComponentTag(handed.tag as ComponentProps['tag'])}
		{...toLightRootProps(handed)}
		oninput={ignore}
		onchange={ignore}
	>
		{@render layout()}
	</svelte:element>
{:else}
	<Rooted
		{...props}
		bind:value
		bind:checked
	/>
{/if}
