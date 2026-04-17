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
		layout?: 'panel-a' | 'panel-b' | 'panel-c';
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
<!-- Panel A -->
{#snippet panelA()}
	<article class="panel-a {classes.article}">
		{@render content()}
	</article>
{/snippet}

<!-- Panel B -->
{#snippet panelB()}
	<article class="panel-b {classes.article}">
		{@render content()}
	</article>
{/snippet}

<!-- Panel C -->
{#snippet panelC()}
	<article class="panel-c {classes.article}">
		{@render content()}
	</article>
{/snippet}

<Accordion
	{...props}
	class="panel rounded-xl border px-4 py-2 {props.class || classes.accordion ? '' : 'bg-neutral-200/50 border-neutral-200'} {classes.accordion ? classes.accordion : ''} {props.class ? props.class : ''}"
>
	<AccordionTitle
		text={label}
		class=" {classes.title}"
	/>
	<AccordionContent class="py-2 {classes.content}">
		{#if layout === 'panel-a'}
			{@render panelA()}
		{:else if layout === 'panel-b'}
			{@render panelB()}
		{:else if layout === 'panel-c'}
			{@render panelC()}
		{:else}
			{@render panelA()}
		{/if}
	</AccordionContent>
</Accordion>