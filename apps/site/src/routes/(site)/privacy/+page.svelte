<script lang="ts">
	import { Legal, LEGAL_DOCUMENTS } from '#lib';

	const { title } = LEGAL_DOCUMENTS.privacy;
</script>

<svelte:head>
	<title>{title} | Trident Cubed</title>
</svelte:head>

<div class="mx-auto w-full max-w-3xl px-4 pt-36 pb-24">
	<Legal kind="privacy" />
</div>
