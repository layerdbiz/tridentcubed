<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Accordion, AccordionContent, AccordionTitle, type ComponentProps } from '@layerd/ui';

	export interface PanelProps extends ComponentProps {
		children?: Snippet;
		classes?: {
			accordion?: string;
			title?: string;
			content?: string;
			article?: string;
		};
		layout?: 'default' | 'list' | 'photo' | 'timelog' | 'page';
		name?: string;
		open?: boolean;
	}

	let {
		children = undefined,
		classes = {},
		label = 'Panel',
		layout = undefined,
		...props
	}: PanelProps = $props();
</script>

{#snippet content()}
	{#if children}
		{@render children()}
	{:else}
		Content
	{/if}
{/snippet}

<!-- Layouts
::::::::::::::::::::::::::::::::::::::::::::: -->
<!-- Default -->
{#snippet panelDefault()}
	<article class="panel-default {classes.article}">
		default
		{@render content()}
	</article>
{/snippet}

<!-- List -->
{#snippet panelList()}
	<article class="panel-list {classes.article}">
		list
		{@render content()}
	</article>
{/snippet}

<!-- Photo -->
{#snippet panelPhoto()}
	<article class="panel-photo {classes.article}">
		photo
		{@render content()}
	</article>
{/snippet}

<!-- Timelog -->
{#snippet panelTimelog()}
	<article class="panel-timelog {classes.article}">
		timelog
		{@render content()}
	</article>
{/snippet}

<!-- Page -->
{#snippet panelPage()}
	<article class="panel-page {classes.article}">
		page
		{@render content()}
	</article>
{/snippet}

<Accordion
	{...props}
	class="panel rounded-xl border py-2 {props.class || classes.accordion ? '' : 'bg-neutral-200/40 border-neutral-200'} {classes.accordion ? classes.accordion : ''} {props.class ? props.class : ''}"
>
	<AccordionTitle	class="px-4 py-2 font-medium {classes.title}">{label}</AccordionTitle>
	<AccordionContent class="py-2 pt-4 px-4 border-neutral-200 border-t {classes.content}">
		{#if layout === 'default'}
			{@render panelDefault()}
		{:else if layout === 'list'}
			{@render panelList()}
		{:else if layout === 'photo'}
			{@render panelPhoto()}
		{:else if layout === 'timelog'}
			{@render panelTimelog()}
		{:else if layout === 'page'}
			{@render panelPage()}
		{:else}
			{@render panelDefault()}
		{/if}
	</AccordionContent>
</Accordion>