<script lang="ts">
	import { Email, Preview } from '@layerd/ui';
	import type { EmailSignatureData } from '@layerd/ui';
	import { page } from '$app/state';
	import { fetchAllEmails, fetchSocials, fetchBanners } from '#lib/email/email.remote.js';

	// Get slug from URL parameter
	const slug = $derived(page.params.slug);

	// Fetch all emails, socials, and banners (await at top level)
	const allEmails = await fetchAllEmails();
	const socials = await fetchSocials();
	const banners = await fetchBanners();

	// Find the matching email signature based on slug
	const emailData = $derived.by((): EmailSignatureData | null => {
		// Search in persons first
		const person = allEmails.persons.find((p) => p.slug === slug);
		if (person) {
			// Find matching banner if person has banner field
			const matchedBanner = person.banner
				? banners.find((b) => b.banner === person.banner)
				: undefined;

			return {
				id: person.id,
				type: person.type,
				name: person.name,
				title: person.title,
				phone: person.phone,
				email: person.email,
				group: person.group,
				href: person.href,
				src: person.src,
				slug: person.slug,
				socialLinks: socials,
				banner: matchedBanner
					? {
							href: matchedBanner.href,
							src: matchedBanner.src,
							alt: matchedBanner.banner
						}
					: undefined
			};
		}

		// Search in groups
		const group = allEmails.groups.find((g) => g.slug === slug);
		if (group) {
			// Find matching banner if group has banner field
			const matchedBanner = group.banner
				? banners.find((b) => b.banner === group.banner)
				: undefined;

			return {
				id: group.id,
				type: group.type,
				name: group.name,
				title: group.title,
				phone: group.phone,
				email: group.email,
				group: '', // Groups don't have secondary emails
				href: group.href,
				src: group.src,
				slug: group.slug,
				socialLinks: socials,
				banner: matchedBanner
					? {
							href: matchedBanner.href,
							src: matchedBanner.src,
							alt: matchedBanner.banner
						}
					: undefined
			};
		}

		return null;
	});

	// Component reference for accessing getHTML()
	let emailComponent: { getHTML: () => string } | undefined = $state();
</script>

<div class="container">
	{#if emailData}
		<!-- Hidden email component just to get the HTML -->
		<div style="display: none;">
			<Email
				data={emailData}
				onMount={(instance) => (emailComponent = instance)}
			/>
		</div>

		<!-- Preview component that displays the HTML -->
		<Preview componentRef={emailComponent} />
	{:else}
		<div class="py-20 text-center">
			<h1 class="mb-4 text-2xl font-bold text-neutral-600">Email Signature Not Found</h1>
			<p class="text-neutral-500">
				The email signature for <code class="text-primary-600">"{slug}"</code> could not be found.
			</p>
		</div>
	{/if}
</div>
