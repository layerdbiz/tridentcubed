<script lang="ts">
	import { LEGAL_DOCUMENTS, type LegalKind } from './legal';

	interface LegalProps {
		kind: LegalKind;
		headingId?: string;
	}

	let { kind, headingId = `${kind}-title` }: LegalProps = $props();
	const document = $derived(LEGAL_DOCUMENTS[kind]);
</script>

<article class="legal grid gap-6 text-left">
	<header class="grid gap-2">
		<h1
			id={headingId}
			tabindex="-1"
			class="text-3xl font-bold tracking-tight outline-none md:text-4xl"
		>
			{document.title}
		</h1>
		<p class="text-sm text-base-600-300">Last updated {document.updated}</p>
	</header>
	{#each document.sections as section (section.heading)}
		<section class="grid gap-2">
			<h2 class="text-lg font-semibold">{section.heading}</h2>
			{#each section.paragraphs as paragraph, index (index)}
				<p class="leading-relaxed text-base-600-300">{paragraph}</p>
			{/each}
		</section>
	{/each}
</article>
