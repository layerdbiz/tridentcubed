<!-- The shell's menu (#342): a tree of the folders and files on play, built from them, so a new folder or file shows
     here with nothing to add. Every folder starts open; a press on one shuts it, and the box at the top finds a name.
     Drawn with the UI library's pieces only: its Button, Input and theme. -->
<script lang="ts">
	import { Button, Component, Input } from '@layerd/ui';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { readViews } from './current.svelte';
	import { SECTIONS } from './entries';
	import { shutSide } from './side.svelte';
	import { toFound, toTree, type TreeType } from './tree';

	const FILE = 'icon-[mdi--file-outline]';
	const sections = SECTIONS.map((section) => ({ ...section, tree: toTree(section.entries) }));

	let query = $state('');
	/** The folders the viewer shut; every other one is open. */
	const shut = new SvelteSet<string>();

	const isFinding = $derived(query.trim() !== '');
	const shown = $derived(
		sections.map((section) => ({ ...section, tree: toFound(section.tree, query) }))
	);

	function isHere(href: string): boolean {
		const [path, hash] = href.split('#');
		if (page.url.pathname !== path) return false;
		return !hash || readViews().join('.') === hash.replace(/^v=/, '');
	}

	function isOpen(node: TreeType): boolean {
		return isFinding || !shut.has(node.key);
	}

	function toAll(node: TreeType): string {
		return `${node.href}#v=${node.files.map((file) => file.href.split('#v=')[1]).join('.')}`;
	}
</script>

{#snippet link(label: string, href: string, icon: string)}
	{@const here = isHere(href)}
	<Button
		{href}
		{label}
		{icon}
		sm
		width="full"
		align="start"
		ghost={!here}
		lite={here}
		primary={here}
		aria-current={here ? 'page' : undefined}
		onclick={shutSide}
	/>
{/snippet}

{#snippet node(item: TreeType)}
	{#if item.children.length || item.files.length}
		{@const open = isOpen(item)}
		<Button
			sm
			width="full"
			align="start"
			ghost
			label={item.label}
			icon="icon-[mdi--folder-outline]"
			iconToggle="icon-[mdi--folder-open-outline]"
			iconEnd="icon-[mdi--chevron-right]"
			iconEndToggle="icon-[mdi--chevron-down]"
			toggled={open}
			aria-expanded={open}
			class="font-semibold"
			onToggle={(isNowOpen) => (isNowOpen ? shut.delete(item.key) : shut.add(item.key))}
		/>
		{#if open}
			<div class="ms-[1.15em] border-s border-base-200-800 ps-[0.35em]">
				{#if item.href && !item.files.length}
					{@render link(item.label, item.href, FILE)}
				{/if}
				{#each item.files as file (file.key)}
					{@render link(file.label, file.href, FILE)}
				{/each}
				{#if item.files.length > 1}
					{@render link(
						`All ${item.files.length} side by side`,
						toAll(item),
						'icon-[mdi--view-grid-outline]'
					)}
				{/if}
				{#each item.children as child (child.key)}
					{@render node(child)}
				{/each}
			</div>
		{/if}
	{:else if item.href}
		{@render link(item.label, item.href, FILE)}
	{/if}
{/snippet}

<Component
	tag="nav"
	aria-label="Everything on play"
	class="theme-base flex h-full w-[272px] flex-col border-e border-base-200-800"
>
	<div
		class="flex shrink-0 flex-col gap-2 p-2"
		style:padding-top="max(0.5rem, env(safe-area-inset-top, 0px))"
	>
		<Button
			ghost
			href="/"
			label="Trident Cubed Play"
			icon="icon-[mdi--play-box-multiple-outline]"
			width="full"
			align="start"
			class="font-semibold"
			onclick={shutSide}
		/>
		<Input
			sm
			type="search"
			label="Find a prototype or component"
			icon="icon-[mdi--magnify]"
			bind:value={query}
		/>
	</div>
	<div
		class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2"
		style:padding-bottom="max(1.5rem, env(safe-area-inset-bottom, 0px))"
	>
		{#each shown as section (section.kind)}
			<section class="pb-3">
				<h2
					class="m-0 px-[0.75em] pt-2 pb-1 text-[11px] font-bold tracking-[0.08em] text-base-500-400 uppercase"
				>
					{section.label}
				</h2>
				{#each section.tree as item (item.key)}
					{@render node(item)}
				{:else}
					<p class="m-0 px-[0.75em] text-sm text-base-500-400">
						{isFinding ? 'Nothing found' : 'None yet'}
					</p>
				{/each}
			</section>
		{/each}
	</div>
</Component>
