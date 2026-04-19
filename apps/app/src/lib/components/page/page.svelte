<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Component, type ComponentProps, Grid, Item } from '@layerd/ui';

	export interface PageProps extends ComponentProps {
		children?: Snippet;
		layout?: string;
		name?: string;
		open?: boolean;
	}

	let {
		children = undefined,
		label = 'Page',
		layout = 'default',
		...props
	}: PageProps = $props();

	const defaultClass = $state('page aspect-[8.5/11] origin-top-left w-204 h-264 overflow-hidden outline-4 p-4');
</script>

<Component
	{...props}
	class="page {props.class}"
>
	{#snippet component({ props })}

		<!-- Content
		::::::::::::::::::::::::::::::::::::::::::::: -->
		{#snippet content()}
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		{/snippet}

		<!-- Layouts
		::::::::::::::::::::::::::::::::::::::::::::: -->
		<!-- Default -->
		{#snippet pageDefault()}
		<Grid items="A1:C3" {...props} class="gap-10! {defaultClass} {props.class}">
			<Item row="1in" range="a1:c1" class="bg-blue-200">
				header
			</Item>
			<Item row="1fr" range="a2:c2" class="bg-gray-200">
				{@render content()}
			</Item>
			<Item row="1in" range="a3:c3" class="bg-red-200">
				footer
			</Item>
		</Grid>
		{/snippet}

		<!-- Cover -->
		{#snippet pageCover()}
		<Grid items="a1:c2" {...props} class="gap-10! {defaultClass} {props.class}">
			<Item range="a1:c1" class="bg-blue-200">
				top
			</Item>
			<Item range="a2:c2" class="bg-gray-200">
				bottom
			</Item>
		</Grid>
		{/snippet}

		{#if layout === 'default'}
			{@render pageDefault()}
		{:else if layout === 'cover'}
			{@render pageCover()}
		{:else if children}
			{@render children()}
		{:else}
			{@render pageDefault()}
		{/if}
	{/snippet}
</Component>