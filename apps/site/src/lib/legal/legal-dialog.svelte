<!--
	Footer legal links open here over the current page (#55) through shallow
	routing: the URL becomes /terms or /privacy, Back closes the dialog and a
	reload lands on the full route.
-->
<script lang="ts">
	import { page } from '$app/state';
	import Legal from './legal.svelte';
	import { isLegalKind } from './legal';

	let dialog = $state<HTMLDialogElement>();
	const kind = $derived(isLegalKind(page.state.legal) ? page.state.legal : null);

	$effect(() => {
		if (!dialog) return;
		if (kind && !dialog.open) {
			dialog.showModal();
			dialog.querySelector<HTMLElement>('h1')?.focus();
		} else if (!kind && dialog.open) {
			dialog.close();
		}
	});

	function close() {
		history.back();
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="legal-dialog-title"
	class="legal-dialog light m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-3xl border-4 border-primary-600 bg-white p-0 text-base-950 shadow-2xl"
	oncancel={(event) => {
		event.preventDefault();
		close();
	}}
	onclick={(event) => {
		if (event.target === dialog) close();
	}}
>
	{#if kind}
		<div class="sticky top-0 z-10 flex justify-end p-4">
			<button
				type="button"
				class="grid size-11 place-items-center rounded-full bg-base-100/90 backdrop-blur hover:bg-base-200"
				aria-label="Close"
				onclick={close}
			>
				<span
					class="icon-[mdi--close] size-6"
					aria-hidden="true"
				></span>
			</button>
		</div>
		<div class="-mt-6 px-6 pb-10 md:-mt-8 md:px-12 md:pb-12">
			<Legal
				{kind}
				headingId="legal-dialog-title"
			/>
		</div>
	{/if}
</dialog>

<style lang="postcss">
	:global(html:has(dialog.legal-dialog[open])) {
		overflow: hidden;
	}

	.legal-dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(4px);
	}
</style>
