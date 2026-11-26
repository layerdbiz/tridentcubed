<!-- The play shell (#342): the sidebar and the page beside it. On a phone the sidebar pops up over the page. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import './shell.css';
	import Sidebar from './sidebar.svelte';
	import { isSideShown, isWide, shutSide } from './side.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div
	class="shell"
	class:is-wide={isWide()}
	class:is-side-shown={isSideShown()}
>
	<div class="side">
		<Sidebar />
	</div>
	{#if !isWide() && isSideShown()}
		<button
			type="button"
			class="scrim"
			aria-label="Close the list"
			onclick={shutSide}
		></button>
	{/if}
	<div class="page">{@render children()}</div>
</div>

<style>
	.shell {
		position: fixed;
		inset: 0;
		display: flex;
		overflow: hidden;
	}
	.side {
		position: absolute;
		z-index: 40;
		top: 0;
		bottom: 0;
		left: 0;
		transform: translateX(-100%);
		transition: transform 0.2s ease;
	}
	.is-side-shown .side {
		transform: none;
		box-shadow: 0 0 40px rgb(2 6 23 / 0.35);
	}
	.is-wide .side {
		position: relative;
		flex: none;
		transform: none;
		box-shadow: none;
		transition: none;
	}
	.is-wide:not(.is-side-shown) .side {
		display: none;
	}
	.scrim {
		position: absolute;
		z-index: 39;
		inset: 0;
		border: 0;
		background: rgb(2 6 23 / 0.4);
	}
	.page {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
	}
</style>
