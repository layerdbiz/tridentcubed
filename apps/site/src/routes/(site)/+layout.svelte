<script>
	import '../../app.css';
	import { page } from '$app/state';
	import {
		Metadata,
		Theme,
		Header,
		Footer,
		Copyright,
		Section,
		Container,
		Nav,
		Button,
		Logo,
		Toggle,
		Link,
		Image,
		scroll,
		mq,
		navigationState
	} from '@layerd/ui';
	let { children } = $props();
	let navOpen = $state(false);

	// Use page.url for dynamic URLs (works in browser)
	// During prerender, these will be placeholders but that's expected
	const canonicalUrl = page.url.href;
	const siteOrigin = page.url.origin;

	// ✅ READ REACTIVE STATE BEFORE ANY AWAITS - This prevents reactivity loss!
	let currentHash = $derived(navigationState.currentHash);
	let activeSection = $derived(navigationState.activeSection);
	let stickyActiveSection = $derived(navigationState.stickyActiveSection);

	let headerElement = $state();

	// Navigation links configuration
	const links = [
		{ href: '#Home', label: 'Home' },
		{ href: '#About', label: 'About' },
		{
			href: '#Services',
			label: 'Services',
			type: 'dropdown',
			children: [
				{ href: '#Earth', label: 'Earth' },
				{ href: '#Wind', label: 'Wind' },
				{ href: '#Fire', label: 'Fire' },
				{ href: '#Water', label: 'Water' }
			]
		},
		{ href: '#Contact', label: 'Contact' },
		{ href: '#FAQ', label: 'FAQ' }
	];
</script>

<svelte:head>
	<!-- Google tag (gtag.js) -->
	<script
		async
		src="https://www.googletagmanager.com/gtag/js?id=G-RZC3M03LR7"
	></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			dataLayer.push(arguments);
		}
		gtag('js', new Date());

		gtag('config', 'G-RZC3M03LR7');
	</script>

	<!-- SEO -->
	<title>Trident Cubed | Marine Surveying & Engineering Services</title>
	<meta
		name="description"
		content="Trident Cubed provides global marine surveying, engineering, and port captain services. Based in Houston with 96+ years combined expertise, we operate across 2,000+ ports worldwide."
	/>
	<meta
		name="keywords"
		content="marine surveying, port captain, marine engineering, cargo inspections, logistics, marine warranty surveyors, Houston maritime services, global port operations"
	/>
	<meta
		property="og:title"
		content="Trident Cubed | Marine Surveying & Engineering Services"
	/>
	<meta
		property="og:description"
		content="Trident Cubed delivers trusted expertise in marine surveys, engineering planning, and port captain supervision. Comprehensive services across 2,000+ ports worldwide."
	/>
	<meta
		property="og:type"
		content="website"
	/>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1, user-scalable=no"
	/>
	<link
		rel="icon"
		href="/favicon.svg"
	/>
	<meta
		property="og:url"
		content={canonicalUrl}
	/>
	<meta
		property="og:image"
		content="{siteOrigin}/og.webp"
	/>
	<meta
		property="og:image:width"
		content="1200"
	/>
	<meta
		property="og:image:height"
		content="630"
	/>
	<meta
		property="og:image:alt"
		content="Trident Cubed | Marine Surveying & Engineering Services"
	/>
	<!-- Preload critical background image -->
	<link
		rel="preload"
		as="image"
		href="/photos/houston-night.webp"
		fetchpriority="high"
	/>
</svelte:head>

<!-- <Metadata /> -->
<!-- Hidden image to keep background cached in memory -->
<img
	src="/photos/houston-night.webp"
	alt=""
	aria-hidden="true"
	loading="eager"
	fetchpriority="high"
	style="position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; z-index: -9999;"
/>

<Header
	fixed
	appearance={navOpen ? 'glass' : scroll.top ? 'ghost' : 'glass'}
	invert
	class="rounded-4xl relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-1 gap-4 p-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:p-2 {navOpen
		? 'grid-rows-[auto_auto]'
		: ''}"
>
	<Logo
		name="Trident Cubed"
		class="size-11 shrink-0 items-start text-lg lg:col-start-1 lg:row-start-1 lg:size-11"
	/>
	<Nav bind:navOpen>
		<!--     
		{#each links as link}
			{#if link.type === 'dropdown'}
				<Toggle
					align="bottom"
					type={mq.sm ? 'panel' : 'menu'}
					trigger={mq.sm ? 'click' : 'hover'}
					class="link flex items-center"
					triggerClass=""
					contentClass="!pt-4"
					href={link.href}
					navId={link.href.slice(1)}
					icon="chevron-right"
					label={link.label}
					unstyled
				>
					<div
						class="grid items-center gap-2 p-4 md:rounded-2xl md:bg-white md:text-black md:ring-2 md:ring-black"
					>
						{#each link.children as childLink}
							<Link href={childLink.href}>{childLink.label}</Link>
						{/each}
					</div>
				</Toggle>
			{:else}
				<Link href={link.href}>{link.label}</Link>
			{/if}
		{/each} -->
		{#each links as link}
			<Link
				href={link.href}
				{currentHash}
				{activeSection}
				{stickyActiveSection}>{link.label}</Link
			>
		{/each}

		<Theme
			ghost
			invert
			class="justify-self-start lg:justify-self-center"
		/>
		<Button
			size="sm"
			primary
			href="tel:+14095432725"
			variant="icon text"
			icon="icon-[mdi--phone]"
			label="Call Us"
			class="w-full lg:w-14"
		/>
	</Nav>
</Header>

<main class="container flex flex-col">
	<svelte:boundary>
		{@render children()}

		{#snippet pending()}
			<Section
				id="Home"
				class="z-2 flex min-h-svh flex-col items-center"
			>
				<!-- photo vignette 
				------------------------------------------>
				<Image
					src="/photos/houston-night.webp"
					bg="fixed"
					overlay="bg-radial -from-black to-black to-85%"
				/>
				<!-- bottom black radial 
				------------------------------------------>
				<Image
					bg
					class="mask-t-from-0% mask-t-to-50% origin-bottom overflow-hidden"
					overlay="bg-radial from-transparent to-black from-0% to-100% scale-x-125"
				/>
				<Image
					bg
					overlay="bg-black/30"
				/>
				<!-- GRADIENT WRAPPER
				------------------------------------------>
				<div
					class="-z-1 scale-y-60 pointer-events-none absolute inset-0 top-auto isolate size-full origin-bottom blur-xl"
				>
					<!-- top blue radial -->
					<Image
						bg
						class="mask-t-from-0% mask-t-to-70% absolute top-0 size-full overflow-hidden"
						overlay="bg-radial from-transparent to-primary from-20% to-100% "
					/>

					<!-- bottom blue radial -->
					<Image
						bg
						class="mask-b-from-0% mask-b-to-70% top-full size-full overflow-hidden"
						overlay="bg-radial from-transparent to-primary from-20% to-100% "
					/>
				</div>
			</Section>
		{/snippet}

		{#snippet failed(error, retry)}
			<div class="flex min-h-svh items-center justify-center">
				<div class="flex flex-col items-center gap-4 text-center">
					<p class="text-rose-600">
						Error loading content: {error instanceof Error
							? error.message
							: 'An unexpected error occurred'}
					</p>
					<button
						onclick={retry}
						class="bg-primary hover:bg-primary/80 rounded px-4 py-2 text-white"
					>
						Retry
					</button>
				</div>
			</div>
		{/snippet}
	</svelte:boundary>
</main>

<Footer class="dark relative overflow-clip py-10">
	<Container class="mt-6 flex translate-y-6 flex-col items-center md:flex-row md:justify-between">
		<div class="flex flex-col items-center justify-center gap-4 md:flex-row md:items-center">
			<Logo class="size-11" />
			<Copyright
				year="2020"
				name="Trident Cubed Solutions"
				type="llc"
				class="text-primary-50 !py-0 text-sm"
			/>
		</div>
		<div class="mt-2 flex lg:mt-0">
			<Button
				lg
				variant="icon"
				href="https://www.facebook.com/TridentCubed"
				icon="icon-[mdi--facebook]"
				ghost
				external
				class="text-primary-50 hover:text-primary-200 -mx-2"
			/>
			<Button
				lg
				variant="icon"
				href="https://www.linkedin.com/company/trident-cubed-solutions"
				icon="icon-[mdi--linkedin]"
				ghost
				external
				class="text-primary-50 hover:text-primary-200 -mx-2"
			/>
			<Button
				lg
				variant="icon"
				href="https://wa.me/15705751179"
				icon="icon-[mdi--whatsapp]"
				ghost
				external
				class="text-primary-50 hover:text-primary-200 -mx-2"
			/>
		</div>
	</Container>

	<!-- blue radial gradient -->
	<Image
		bg
		class="mask-t-from-0% mask-t-to-100% absolute bottom-0 mx-auto size-full"
		overlay="bg-radial from-primary to-transparent from-0% to-80% bg-black scale-y-200 translate-y-1/2"
	/>
</Footer>

<style lang="postcss">
	@reference '@layerd/ui/ui.css';

	:global {
		.nav .link:not(.logo),
		.nav .link.toggle:not(.link.toggle-trigger) {
			@apply md:!flex md:h-[calc(100%+1rem)];
		}
	}
</style>
