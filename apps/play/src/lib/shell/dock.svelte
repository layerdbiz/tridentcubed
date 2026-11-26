<!-- The controls (#342), the starter's dark panel. On a desktop it floats top right over the canvas and the bar's
     Controls button hides it (kept); on a phone it slides in from the right over a dimmed page, which shuts it. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isWide } from './side.svelte';

	type DockProps = { isOpen: boolean; children: Snippet };

	let { isOpen = $bindable(), children }: DockProps = $props();
</script>

{#if isOpen}
	{#if !isWide()}
		<button
			type="button"
			class="scrim"
			aria-label="Close the controls"
			onclick={() => (isOpen = false)}
		></button>
	{/if}
	<aside
		class="dock"
		class:is-wide={isWide()}
		aria-label="Controls"
	>
		{@render children()}
	</aside>
{/if}

<style>
	.dock {
		position: absolute;
		z-index: 30;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(320px, 86vw);
		padding: 12px 14px;
		padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
		background: var(--bar-bg);
		color: var(--bar-fg);
		box-shadow: 0 0 40px rgb(2 6 23 / 0.45);
	}
	.dock.is-wide {
		top: 10px;
		right: 10px;
		bottom: auto;
		width: 300px;
		max-height: calc(100% - 20px);
		border-radius: 16px;
		box-shadow: 0 14px 40px -12px rgb(2 6 23 / 0.6);
	}
	.scrim {
		position: absolute;
		z-index: 29;
		inset: 0;
		border: 0;
		background: rgb(2 6 23 / 0.4);
	}
</style>
