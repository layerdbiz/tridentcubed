<!--
	"Ready to become a partner?" band that closes the home page and the
	legal pages, so their dark footer follows on naturally.
-->
<script lang="ts">
	import { Section, Text, Button, trackEvent } from '@layerd/ui';
	import { getSectionsData } from '#lib';

	interface CtaProps {
		/** Where Contact Sales goes; off the home page it needs the leading slash */
		href?: string;
		/** Analytics location of the Contact Sales click */
		location?: string;
	}

	let { href = '#Contact', location = 'homepage_cta' }: CtaProps = $props();

	const sectionsData = await getSectionsData();
	const section = sectionsData.find((s) => s.section === 'CTA');
</script>

<Section
	class="dark flex flex-col py-0 text-center lg:items-start lg:justify-start lg:text-left"
	container="!gap-6 !pt-0 lg:!gap-6 flex w-full flex-col items-center lg:grid lg:grid-flow-col lg:grid-rows-2"
>
	<Text
		class="text-4xl text-balance md:text-6xl md:text-pretty"
		h1={section?.title ?? 'CTA Title'}
	/>
	<Text
		class="text-pretty md:max-w-xl md:text-balance"
		p={section?.subtitle ?? 'CTA Subtitle'}
	/>
	<Button
		size="xl"
		primary
		variant="text"
		label="Contact Sales"
		class="row-span-2 min-w-72 place-self-end self-center"
		{href}
		onclick={trackEvent({
			name: 'click_contact_sales_button',
			location,
			label: 'Contact Sales',
			href
		})}
	/>
</Section>
