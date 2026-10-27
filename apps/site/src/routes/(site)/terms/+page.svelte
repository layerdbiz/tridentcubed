<script lang="ts">
	import { Section } from '@layerd/ui';
	import { Cta, Legal, LEGAL_DOCUMENTS } from '#lib';

	const { title } = LEGAL_DOCUMENTS.terms;
</script>

<svelte:head>
	<title>{title} | Trident Cubed</title>
</svelte:head>

<Section
	divider="bottom"
	dividerBottom={{ svg: 'text-base-950' }}
	container="mx-auto w-full max-w-3xl !pt-36"
>
	<Legal kind="terms" />
</Section>

<Cta
	href="/#Contact"
	location="legal_page_cta"
/>
