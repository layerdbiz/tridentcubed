<script lang="ts">
	import '../../app.css';
	import { Logo, Toggle, Link } from '@layerd/ui';
	import { fetchAllEmails } from '$lib/email/email.remote';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children } = $props();

	// Fetch all emails for navigation (await at top level)
	const emailData = await fetchAllEmails();

	// Get current slug from URL parameter
	const currentSlug = $derived(page.params.slug);

	// Create navigation structure
	const categories = $derived([
		{
			label: 'Person',
			href: '/company/emails/capt-cezary-poninski',
			items: emailData.persons.map((p) => ({ slug: p.slug, name: p.name })),
			open: true
		},
		{
			label: 'Group',
			href: '/company/emails/operations',
			items: emailData.groups.map((g) => ({ slug: g.slug, name: g.shortname })),
			open: false
		}
	]);

	// Handle category toggle with navigation
	function handleCategoryToggle(categoryHref: string) {
		// Navigate using SvelteKit's client-side routing
		goto(categoryHref);
	}
</script>

<main class="grid min-h-svh w-full grid-cols-[280px_minmax(600px,_1fr)_100px] gap-10">
	<nav class="bg-neutral-200/40 p-4">
		<Logo
			mode="black"
			name="Company"
			href="/company/emails"
		/>

		<div class="ml-2 mt-8">
			<Toggle
				open
				variant="panel"
				label="Email"
				onToggle={() => handleCategoryToggle('/company/emails')}
				button={{
					icon: 'icon-[mdi--email-outline] transition-transform duration-200',
					iconHover: 'icon-[mdi--email] transition-transform duration-200',
					iconToggle: 'icon-[mdi--email] transition-transform duration-200',
					variant: 'icon text',
					width: 'full',
					padding: 'none',
					appearance: 'ghost',
					class: '!p-0 !font-bold uppercase',
					size: 'sm'
				}}
			>
				{#each categories as category}
					<Toggle
						open={category.open}
						variant="panel"
						label={category.label}
						onToggle={() => handleCategoryToggle(category.href)}
						button={{
							icon: 'text-sm text-base-400 transition-transform duration-200 !pt-5 icon-[mdi--chevron-right]',
							iconHover: 'text-sm text-primary-600 duration-200 !pt-5 icon-[mdi--chevron-right]',
							iconToggle:
								'text-primary-600 text-sm transition-transform duration-200 rotate-90 text-primary !pt-5 icon-[mdi--chevron-right]',
							variant: 'icon text',
							width: 'full',
							padding: 'none',
							appearance: 'ghost',
							class: '!p-0 !font-bold',
							size: 'sm'
						}}
					>
						<div class="ml-7 pb-2">
							{#each category.items as item}
								<Link
									href="/company/emails/{item.slug}"
									text={item.name}
									class="text-sm {currentSlug === item.slug
										? 'font-bold text-black'
										: 'text-neutral-500 hover:text-black'}"
								/>
							{/each}
						</div>
					</Toggle>
				{/each}
			</Toggle>
		</div>
	</nav>

	<div class="container py-10">
		<svelte:boundary>
			{@render children()}
			{#snippet pending()}
				<div class="flex min-h-[50vh] items-center justify-center">
					<p class="text-neutral-500">Loading...</p>
				</div>
			{/snippet}
			{#snippet failed(error, retry)}
				<div class="flex min-h-[50vh] flex-col items-center justify-center gap-4">
					<p class="text-red-600">Error: {error instanceof Error ? error.message : 'Something went wrong'}</p>
					<button onclick={retry} class="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">Retry</button>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>
</main>
