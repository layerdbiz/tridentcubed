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
		type ComponentProps
	} from '@layerd/ui';
	import Rooted from './rooted.svelte';

	let { value = $bindable(), checked = $bindable(false), ...props }: ComponentProps = $props();

	const isLight = $derived(isLightRequest(props as Record<string, unknown>));

	// On the full path a drawn element's input and change go to the bound value, in place of any the caller gave;
	// the light path keeps that, so the two behave alike.
	function ignore(): void {}
</script>

{#snippet content(text: string = 'Component')}
	{#if props.children}
		{@render props.children()}
	{:else if props.label !== undefined && props.label !== null && props.label !== ''}
		{props.label}
	{:else}
		{text}
	{/if}
{/snippet}

{#snippet layout()}
	{#if props.children}
		{@render props.children()}
	{:else if props.label}
		{props.label}
	{/if}
{/snippet}

{#if isLight && props.component}
	{@render props.component({
		props: toLightRootProps(props as Record<PropertyKey, unknown>),
		layout,
		content,
		observe: undefined
	})}
{:else if isLight}
	<svelte:element
		this={normalizeComponentTag(props.tag)}
		{...toLightRootProps(props as Record<PropertyKey, unknown>)}
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
