<script lang="ts">
	import { LEGAL_DOCUMENTS, toLegalParts, type LegalKind } from './legal';

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
				<p class="leading-relaxed text-base-600-300">
					{#each toLegalParts(paragraph) as part, partIndex (partIndex)}
						{#if part.href}
							<a
								href={part.href}
								class="whitespace-nowrap text-primary-600-300 underline underline-offset-4"
								>{part.text}</a
							>
						{:else}
							{part.text}
						{/if}
					{/each}
				</p>
			{/each}
		</section>
	{/each}
</article>
