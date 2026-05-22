<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		Button,
		Link,
		mq,
		Icon,
		Divider,
		Content,
		Section,
		Container,
		Card,
		Image,
		Title,
		Text,
		Number,
		Toggle,
		Input,
		Textarea,
		Slider,
		trackEvent,
		navigationState,
		Globe
	} from '@layerd/ui';
	import { getTeamData, getFaqData, getPartnersData, getServicesData, getTestimonialsData, getAboutData, getSectionsData, submitContactData, validateField } from '$lib';
	import {
		getGlobeLocations,
		getGlobePorts
	} from '$lib/globe/globe.remote';

	// ✅ READ REACTIVE STATE BEFORE ANY AWAITS - This prevents reactivity loss!
	// These values are read at the top of the component, before any async boundaries
	let currentHash = $derived(navigationState.currentHash);
	let activeSection = $derived(navigationState.activeSection ?? 'Home'); // Default to 'Home' on initial load
	let stickyActiveSection = $derived(navigationState.stickyActiveSection);

	// ✅ HOIST ALL DATA FETCHING TO TOP - Prevents component reactivity loss warnings
	// By awaiting all data BEFORE any component rendering, we avoid reactivity loss in child components
	const sectionsData = await getSectionsData();
	const partnersData = await getPartnersData();
	const servicesData = await getServicesData();
	const teamData = await getTeamData();
	const faqData = await getFaqData();
	const testimonialsData = await getTestimonialsData();
	const aboutData = await getAboutData();

	// ✅ Globe data uses query functions which only run in the browser (not during prerender)
	// During prerender, these return null. In browser, they fetch dynamically.
	const globeLocationsQuery = browser ? getGlobeLocations() : null;
	const globePortsQuery = browser ? getGlobePorts() : null;
	const globePolygons = '/data/countries.geojson';

	// Derived values that safely handle loading state and null during prerender
	let globeLocations = $derived(globeLocationsQuery?.current ?? []);
	let globePorts = $derived(globePortsQuery?.current ?? []);
	let globeLoading = $derived(!browser || globeLocationsQuery?.loading || globePortsQuery?.loading);

	function getUniqueCount(items: unknown[], key: string) {
		return new Set(
			items
				.filter((item) => typeof item === 'object' && item !== null)
				.map((item) => String((item as Record<string, unknown>)[key] ?? '').trim())
				.filter(Boolean)
		).size;
	}

	let globeStatsData = $derived({
		continents: getUniqueCount(globeLocations, 'continent'),
		locations: getUniqueCount(globeLocations, 'location'),
		ports: getUniqueCount(globePorts, 'port')
	});

	// Hero content fade-in: starts hidden, fades in after hydration + stats data loads
	let heroReady = $state(false);

	// Once the component is mounted (hydrated) and globe stats have loaded, reveal the hero
	$effect(() => {
		if (!globeLoading && browser) {
			// Data is loaded — trigger the hero fade-in on next frame
			requestAnimationFrame(() => {
				heroReady = true;
			});
		}
	});

	// Helper function for cleaner section access (now synchronous since data is already loaded)
	function getSection(name: string) {
		return sectionsData.find((s) => s.section === name);
	}

	function toButtonEventName(label: string) {
		const normalizedLabel = label
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');

		return `click_${normalizedLabel}_button`;
	}

	// Stats - dynamically populated from globe data (using $derived because globeStatsData is now reactive)
	let stats = $derived([
		{ value: 100, label: 'Years' }, // Static value - company years
		{ value: globeStatsData.continents, label: 'Continents' }, // Dynamic from locations
		{ value: globeStatsData.locations, label: 'Locations' }, // Dynamic from locations
		{ value: globeStatsData.ports, label: 'Ports' } // Dynamic from ports
	]);

	// Form clearing logic
	let formElement: HTMLFormElement;
	let isSubmitting = $state(false);
	let isSent = $state(false);

	// Form field values (still needed for form clearing)
	let nameValue = $state('');
	let phoneValue = $state('');
	let emailValue = $state('');
	let messageValue = $state('');

	// Validation error states (for visual feedback)
	let nameError = $state('');
	let phoneError = $state('');
	let emailError = $state('');
	let messageError = $state('');

	// Validation functions (for onblur feedback)
	function validateName() {
		const result = validateField('name', nameValue);
		nameError = result.error || '';
		return result.isValid;
	}

	function validatePhone() {
		const result = validateField('phone', phoneValue);
		phoneError = result.error || '';
		return result.isValid;
	}

	function validateEmail() {
		const result = validateField('email', emailValue);
		emailError = result.error || '';
		return result.isValid;
	}

	function validateMessage() {
		const result = validateField('message', messageValue);
		messageError = result.error || '';
		return result.isValid;
	}

	// Clear form when submission is successful
	$effect(() => {
		const result = submitContactData.result;
		if (result?.success && formElement) {
			formElement.reset();
			// Reset field values
			nameValue = '';
			phoneValue = '';
			emailValue = '';
			messageValue = '';
			// Clear errors
			nameError = '';
			phoneError = '';
			emailError = '';
			messageError = '';
		}
	});

	// Altitude configurations
	let altitudes = $state({
		// Small screens (mobile)
		small: {
			globe: 0.8,
			atmosphere: 0.2,
			hexPolygon: 0.0001,
			polygon: 0.002,
			points: {
				blueDot: {
					base: 0.00012,
					altitude: 0.008
				},
				whiteDot: {
					base: 0.00014,
					altitude: 0.014
				}
			},
			html: 0.05,
			labels: 0.008,
			arcs: {
				start: 0.005,
				end: 0.005,
				autoscale: 0.3
			},
			rings: 0.0002
		},
		// Large screens (desktop)
		large: {
			globe: 0.14,
			atmosphere: 0.08,
			hexPolygon: 0.0001,
			polygon: 0.002,
			points: {
				blueDot: {
					base: 0.0005,
					altitude: 0.0005
				},
				whiteDot: {
					base: 0.0009,
					altitude: 0.00025
				}
			},
			html: 0.005,
			labels: 0.002,
			arcs: {
				start: 0.001,
				end: 0.001,
				autoscale: 0.15
			},
			rings: 0.0002
		}
	});
</script>

<!-- HERO 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="Home"
	class="z-2 flex! min-h-svh flex-col!"
	container="flex! flex-col items-center justify-start gap-14 !py-0 !pt-10"
>
	<!-- hero content
	------------------------------------------>
	<section
		class="z-1 pointer-events-none relative flex select-none flex-col items-center justify-start gap-4 pt-16 lg:pt-10"
		class:hero-visible={heroReady}
		class:hero-hidden={!heroReady}
	>
		<!-- title -->
		<div class="text-base-50 flex flex-col gap-2 text-center">
			<Text
				observe
				class="bleed order-2 text-balance text-2xl font-black uppercase leading-tight tracking-tight text-white lg:text-[5vw]"
				h1={getSection('Home')?.title ?? 'Hero Title'}
				typewriter={{
					type: 'reveal',
					messages: ['We Dont Ship Cargo', 'We Make Ship Happen'],
					delay: 5500,
					loop: false,
					autoplay: true,
					speed: 20,
					delete: false
				}}
			/>
			<h2 class="text-base-200 order-1 text-[x-small] uppercase tracking-widest lg:text-sm">
				{getSection('Home')?.subtitle ?? 'Hero Subtitle'}
			</h2>

			<!-- stats -->
			<div
				id="stats"
				class="order-3 flex items-center justify-center gap-6 py-2 text-center lg:gap-8 lg:py-4"
				class:opacity-0={globeLoading}
				style="transition: opacity 0.5s ease-in-out;"
			>
				{#each stats as stat}
					<section class="flex flex-col gap-1 md:gap-2">
						<Number
							class="text-base-50 font-mono text-2xl font-bold md:text-4xl"
							data-target={stat.value}>{stat.value}</Number
						>
						<Text
							class="text-base-200 text-[xx-small] uppercase lg:text-xs"
							h4={stat.label}
						/>
					</section>
				{/each}
			</div>
		</div>

		<!-- buttons -->
		<div class="pointer-events-auto flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:gap-6">
			{#snippet shipIcon()}
				<svg
					viewBox="0 0 32 32"
					fill="currentColor"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M5.29355 16.7172V8.05868C5.29355 7.69987 5.42796 7.35576 5.6672 7.10204C5.90645 6.84832 6.23094 6.70579 6.56928 6.70579H12.9479V4H18.0509V6.70579H24.4295C24.7679 6.70579 25.0924 6.84832 25.3316 7.10204C25.5709 7.35576 25.7053 7.69987 25.7053 8.05868V16.7172L27.0907 17.1582C27.4049 17.2582 27.6707 17.4826 27.833 17.7849C27.9952 18.0872 28.0415 18.4442 27.962 18.7817L26.0267 26.9911C24.9833 27.048 23.9426 26.8317 22.9966 26.3613C22.0506 25.8908 21.2283 25.1806 20.6023 24.2934C20.0082 25.1335 19.2377 25.8154 18.352 26.285C17.4663 26.7547 16.4897 26.9992 15.4994 26.9992C14.5092 26.9992 13.5325 26.7547 12.6468 26.285C11.7611 25.8154 10.9906 25.1335 10.3965 24.2934C9.77052 25.1806 8.94825 25.8908 8.00224 26.3613C7.05623 26.8317 6.01556 27.048 4.97207 26.9911L3.03806 18.7817C2.95857 18.4444 3.00461 18.0876 3.16661 17.7853C3.32862 17.483 3.59415 17.2584 3.90811 17.1582L5.29355 16.7172ZM7.84501 15.9055L15.4994 13.4703L19.0128 14.5877L21.3206 15.3224L23.1538 15.9055V9.41157H7.84501V15.9055Z"
					/>
				</svg>
			{/snippet}

			<Button
				size={mq.sm ? 'lg' : 'xl'}
				primary
				variant="icon text"
				icon={shipIcon}
				label="Learn More"
				class="mx-auto w-52! md:min-w-72"
				href="#About"
				onclick={trackEvent({
					name: toButtonEventName('Learn More'),
					location: 'homepage_hero',
					label: 'Learn More',
					href: '#About'
				})}
			/>
			<Button
				size={mq.sm ? 'lg' : 'xl'}
				variant={mq.sm || mq.md ? 'icon text' : 'text icon'}
				icon="icon-[mdi--chevron-right]"
				label="Contact Sales"
				class="light mx-auto w-52! md:min-w-72"
				href="#Contact"
				onclick={trackEvent({
					name: toButtonEventName('Contact Sales'),
					location: 'homepage_hero',
					label: 'Contact Sales',
					href: '#Contact'
				})}
			/>
		</div>
	</section>

	<!-- globe -->
	<Globe
			startLocationId="4"
			data={{
				locations: globeLocations,
				polygons: globePolygons
				// ports: globePorts
			}}
			globe={{
				width: typeof window !== 'undefined' ? window.innerWidth : 1920,
				height: typeof window !== 'undefined' ? window.innerHeight : 1080,
				left: 0,
				top: mq.sm
					? typeof window !== 'undefined'
						? window.innerHeight * 0.95
						: 972
					: typeof window !== 'undefined'
						? window.innerHeight * 2.2
						: 1856,
				altitude: mq.sm ? altitudes.small.globe : altitudes.large.globe,
				latitude: mq.sm ? 36 : 21
			}}
			atmosphere={{
				show: false,
				color: '#155dfc',
				altitude: mq.sm ? altitudes.small.atmosphere : altitudes.large.atmosphere
			}}
			hexPolygon={{
				enabled: true,
				resolution: mq.sm ? 3 : 4,
				margin: 0.15,
				altitude: mq.sm ? altitudes.small.hexPolygon : altitudes.large.hexPolygon,
				color: '#1a1a2e',
				transitionDuration: 0
			}}
			polygon={{
				enabled: false,
				capColor: 'rgba(26,26,46,1)',
				sideColor: 'rgba(21, 93, 252, 0.6)',
				strokeColor: 'rgba(0,0,0,0)',
				altitude: mq.sm ? altitudes.small.polygon : altitudes.large.polygon,
				transitionDuration: 0
			}}
			points={{
				layers: [
					{
						base: mq.sm ? altitudes.small.points.blueDot.base : altitudes.large.points.blueDot.base,
						altitude: mq.sm
							? altitudes.small.points.blueDot.altitude
							: altitudes.large.points.blueDot.altitude,
						color: '#155dfc',
						radius: mq.sm ? 1.2 : 0.3,
						zOffset: 0
					},
					{
						base: mq.sm ? altitudes.small.points.whiteDot.base : altitudes.large.points.whiteDot.base,
						altitude: mq.sm
							? altitudes.small.points.whiteDot.altitude
							: altitudes.large.points.whiteDot.altitude,
						color: '#ffffff',
						radius: mq.sm ? 0.5 : 0.15,
						zOffset: 0.001
					}
				]
			}}
			html={{
				altitude: mq.sm ? altitudes.small.html : altitudes.large.html
			}}
			labels={{
				size: mq.sm ? 0.75 : 0.15,
				dotRadius: mq.sm ? 0.3 : 0.1,
				textColor: '#ffffff',
				dotColor: '#ffffff',
				altitude: mq.sm ? altitudes.small.labels : altitudes.large.labels
			}}
			arcs={{
				color: '#ffffff',
				stroke: mq.sm ? 0.2 : 0.04,
				duration: 2000,
				dashRelativeLength: 0.4,
				dashLength: 0.6,
				dashGap: 2,
				dashInitialGap: 1,
				altitude: null,
				altitudeAutoscale: mq.sm ? altitudes.small.arcs.autoscale : altitudes.large.arcs.autoscale,
				startAltitude: mq.sm ? altitudes.small.arcs.start : altitudes.large.arcs.start,
				endAltitude: mq.sm ? altitudes.small.arcs.end : altitudes.large.arcs.end
			}}
			rings={{
				color: '#ffffff',
				rings: 4,
				radius: mq.sm ? 5 : 2,
				speed: mq.sm ? 4 : 2,
				altitude: mq.sm ? altitudes.small.rings : altitudes.large.rings,
				duration: 700
			}}
			animation={{
				duration: 1000
			}}
			autoplay={{
				enabled: activeSection === 'Home',
				interval: 5000,
				pauseOnInteraction: true,
				startDelay: 3000,
				resumeDelay: 30000
			}}
	/>

	<!-- photo vignette 
	------------------------------------------>
	<Image
		src="/photos/houston-night.webp"
		bg="fixed"
		class="-z-3 pointer-events-none"
		overlay="bg-radial -from-black to-black to-85%"
	/>
	<!-- bottom black radial 
	------------------------------------------>
	<Image
		bg
		class="mask-t-from-0% mask-t-to-50% pointer-events-none origin-bottom overflow-clip"
		overlay="bg-radial from-transparent to-black from-0% to-100% scale-x-125"
	/>
	<Image
		bg
		overlay="bg-black/30"
	/>

	<!-- GRADIENT WRAPPER
	------------------------------------------>
	<div
		class="z-1 scale-y-30 lg:scale-y-60 pointer-events-none absolute inset-0 top-auto isolate size-full origin-bottom opacity-100 blur-xl"
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
	<div
		class="pointer-events-none absolute inset-0 top-auto isolate h-14 bg-linear-to-b from-transparent to-black opacity-100"
	></div>
</Section>

<!-- TRUSTED BY 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="Partners"
	class="bg-dark-dark text-light-dark z-0 flex flex-col overflow-clip pt-20"
	container="!gap-10 p-0!"
	divider="bottom"
	dividerBottom={{ svg: 'text-base-50-950' }}
>
	<Text
		class="text-base-300 text-center"
		h4={getSection('Partners')?.subtitle ?? 'Partners Subtitle'}
		icon={false}
	/>

	<!-- partners -->
	{#if mq.sm}
		<Slider
			class="mask-x-lg bleed overflow-hidden"
			show={3}
			loop={true}
			autoscroll={0.5}
			container=""
			slide="flex-none"
		>
			{#each partnersData as partner (partner.id)}
				<img
					src={partner.img}
					alt={partner.name}
					class="max-h-24 w-auto place-self-center object-contain px-4 invert"
				/>
			{/each}
		</Slider>
	{:else}
		<!-- Desktop: 8 cols x 2 rows grid -->
		<div
			class="mask-x-lg lg:mask-[unset] flex items-center justify-center gap-12 px-10 pb-20 invert"
		>
			{#each partnersData as partner (partner.id)}
				<img
					src={partner.img}
					alt={partner.name}
					class="max-h-28 w-auto place-self-center object-contain"
				/>
			{/each}
		</div>
	{/if}

	<!-- testimonials -->
	<Slider
		class="mask-x-md lg:mask-x-lg bleed overflow-x-clip pb-20"
		variant="autoplay"
		show={3}
		loop={true}
		duration={7000}
	>
		{#each testimonialsData as testimonial (testimonial.id)}
			<Card
				class="dark pl-7 transition-all duration-300 lg:pl-14"
				variant="testimonial"
				title={testimonial.title}
				subtitle={testimonial.subtitle}
				description={testimonial.description}
			/>
		{/each}
	</Slider>
</Section>

<!-- ABOUT 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="About"
	divider
	class="flex flex-col"
>
	<Title
		title={getSection('About')?.title ?? 'About Title'}
		subtitle={getSection('About')?.subtitle ?? 'About Subtitle'}
	/>

	<!-- team 
	------------------------------------------>
	<Slider
		class="bleed-container mask-x-sm lg:mask-[unset] pb-10 lg:cursor-auto"
		variant="autoplay"
		show={4}
		loop={true}
		duration={4000}
		disabled="lg"
	>
		{#each teamData as member (member.id)}
			<Card
				variant="profile"
				title={member.title}
				subtitle={member.subtitle}
				image={member.image}
				icon={member.icon}
			/>
		{/each}
	</Slider>
	<!-- about 
	------------------------------------------>

	{#each aboutData as section (section.id)}
		<Container
			class="flex flex-col items-center justify-between gap-20 lg:flex-row lg:items-start even:lg:flex-row-reverse"
		>
			<Content
				type="text"
				class="w-full"
			>
				<!-- Title -->
				<h2 class="bar-outside">{section.title}</h2>
				<p>{section.description}</p>

				<!-- Subsections -->
				{#each section.subsections as subsection}
					<h3>{subsection.title}</h3>
					<p>{subsection.content}</p>
				{/each}
			</Content>
			<Image
				class="sticky top-32 aspect-video lg:aspect-square"
				src={section.image}
				mask
				overlay="to-black from-20% to-100%"
			/>
		</Container>
	{/each}
</Section>

<!-- SERVICES 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="Services"
	divider="both"
	dividerTop={{
		negative: true
	}}
	dividerBottom={{
		svg: 'text-base-200-700',
		negative: false
	}}
	class="bg-base-200-700 flex flex-col"
>
	<Title
		title={getSection('Services')?.title ?? 'Services Title'}
		subtitle={getSection('Services')?.subtitle ?? 'Services Subtitle'}
	/>
	<div class="services-container grid gap-6">
		{#each servicesData as service (service.id)}
			<Card
				glass
				class="overflow-clip"
				variant="service"
				title={service.title}
				description={service.description}
				image={service.image}
				label={service.label}
			/>
		{/each}
	</div>
</Section>

<!-- CONTACT 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="Contact"
	divider="both"
	dividerTop={{
		svg: 'text-base-200-700',
		negative: false
	}}
	dividerBottom={{
		negative: false
	}}
>
	<Title
		title={getSection('Contact')?.title ?? 'Contact Title'}
		subtitle={getSection('Contact')?.subtitle ?? 'Contact Subtitle'}
	/>

	<Container
		class="relative flex flex-col items-center justify-center gap-32 lg:flex-row lg:items-start"
	>
		<!-- Contact Info 
		---------------------------------------------------->
		<div
			class="contact-info order-2 flex flex-col items-start gap-8 px-8 lg:order-1 lg:mt-2 lg:items-start"
		>
			<!-- Phone -->
			<div>
				<Text
					h3="Phone"
					class="bar-outside relative font-bold uppercase tracking-wider"
				/>
				<Button
					appearance="ghost"
					variant="icon text"
					class="text-base-600-300 text-md rounded-none! p-0!"
					icon="icon-[flagpack--us]"
					label="+1 (409) 543-2725"
					href="tel:+14095432725"
					onclick={trackEvent({
						name: 'click_us_phone_button',
						location: 'homepage_contact_phone',
						label: '+1 (409) 543-2725',
						href: 'tel:+14095432725'
					})}
				/>
				<br />
				<Button
					appearance="ghost"
					variant="icon text"
					class="text-base-600-300 text-md rounded-none! p-0!"
					icon="icon-[flagpack--mx]"
					label="+1 (832) 477-6974"
					href="tel:+18324776974"
					onclick={trackEvent({
						name: 'click_mx_phone_button',
						location: 'homepage_contact_phone',
						label: '+1 (832) 477-6974',
						href: 'tel:+18324776974'
					})}
				/>
			</div>

			<!-- Email -->
			<div>
				<Text
					h3="Email"
					class="bar-outside relative font-bold uppercase tracking-wider"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="operations@tridentcubed.com"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="ops.sa@tridentcubed.com"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="ops.carib@tridentcubed.com"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="ops.eu@tridentcubed.com"
				/>
			</div>

			<!-- Location -->
			<div>
				<Text
					h3="Locations"
					class="bar-outside relative font-bold uppercase tracking-wider"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="800 Town and Country, Ste 500"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="Houston, TX 77024"
				/>
			</div>

			<!-- Hours -->
			<div>
				<Text
					h3="Hours"
					class="bar-outside relative font-bold uppercase tracking-wider"
				/>
				<Text
					class="text-base-600-300 text-md"
					p="Monday - Friday | 7:30am to 6:00pm"
				/>
			</div>
			<!-- Hours -->
			<div>
				<Text
					h3="Social"
					class="bar-outside relative font-bold uppercase tracking-wider"
				/>
				<!-- Web -->
				<div class="-ml-3 flex items-start justify-start">
					<Button
						lg
						variant="icon"
						href="https://www.facebook.com/TridentCubed"
						icon="icon-[mdi--facebook]"
						onclick={trackEvent({
							name: 'click_social_facebook',
							location: 'homepage_contact_social',
							label: 'Facebook',
							href: 'https://www.facebook.com/TridentCubed'
						})}
						ghost
						external
						class="text-primary -mx-2"
					/>
					<Button
						lg
						variant="icon"
						href="https://www.linkedin.com/company/trident-cubed-solutions"
						icon="icon-[mdi--linkedin]"
						onclick={trackEvent({
							name: 'click_social_linkedin',
							location: 'homepage_contact_social',
							label: 'LinkedIn',
							href: 'https://www.linkedin.com/company/trident-cubed-solutions'
						})}
						ghost
						external
						class="text-primary -mx-2"
					/>
					<Button
						lg
						variant="icon"
						href="https://wa.me/15705751179"
						icon="icon-[mdi--whatsapp]"
						onclick={trackEvent({
							name: 'click_social_whatsapp',
							location: 'homepage_contact_social',
							label: 'WhatsApp',
							href: 'https://wa.me/15705751179'
						})}
						ghost
						external
						class="text-primary -mx-2"
					/>
				</div>
			</div>
		</div>

		<!-- Contact Form
		---------------------------------------------------->
		<form
			bind:this={formElement}
			class="grid gap-3 contact-form w-xs sticky order-1 max-w-xs lg:top-32 lg:order-2"
			{...submitContactData.enhance(async ({ submit, form }) => {
				try {
					// HTML5 validation will prevent submission if fields are invalid
					isSubmitting = true;
					// Add 2 second delay to show loading state
					await new Promise((resolve) => setTimeout(resolve, 2000));
					await submit();

					// Show sent state
					isSubmitting = false;
					isSent = true;

					// Revert to idle state after 4 seconds
					setTimeout(() => {
						isSent = false;
					}, 4000);
				} catch (error) {
					console.error('Form submission error:', error);
					isSubmitting = false;
				}
			})}
		>
			<Input
				bind:value={nameValue}
				icon="icon-[mdi--account]"
				variant="icon text"
				label="Name"
				required={true}
				minlength={2}
				maxlength={50}
				error={nameError}
				isValid={!nameError}
				onblur={validateName}
			/>
			<Input
				bind:value={phoneValue}
				type="tel"
				icon="icon-[mdi--phone]"
				variant="icon text"
				label="Phone"
				required={true}
				minlength={7}
				maxlength={25}
				error={phoneError}
				isValid={!phoneError}
				onblur={validatePhone}
			/>
			<Input
				bind:value={emailValue}
				type="email"
				icon="icon-[mdi--email]"
				variant="icon text"
				label="Email"
				required={true}
				maxlength={254}
				error={emailError}
				isValid={!emailError}
				onblur={validateEmail}
			/>
			<Textarea
				bind:value={messageValue}
				icon="icon-[mdi--pencil]"
				variant="icon text"
				label="Message"
				required={true}
				minlength={10}
				maxlength={500}
				error={messageError}
				isValid={!messageError}
				onblur={validateMessage}
			/>
			<Button
				color={isSent ? 'accent' : 'primary'}
				type="submit"
				size="lg"
				label={isSent ? 'Sent!' : isSubmitting ? 'Sending...' : 'Send'}
				icon={isSent ? 'icon-[mdi--check]' : isSubmitting ? 'spinner' : 'icon-[mdi--send]'}
				variant="text icon"
				class="submit-button mt-10 min-w-full rounded-xl"
				onclick={trackEvent({
					name: 'click_send_button',
					location: 'homepage_contact_form',
					label: 'Send'
				})}
				disabled={isSubmitting || isSent}
			/>
			<!-- Success/Error Messages -->
			{#await submitContactData.result}
				<!-- Loading state handled by button -->
			{:then result}
				{#if result?.success}
					<div class="my-10 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
						<Text
							class="text-md text-emerald-600"
							p={result.message}
						/>
					</div>
				{:else if result && !result.success}
					<div class="my-10 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
						<Text
							class="text-md text-rose-600"
							p={result.message}
						/>
					</div>
				{/if}
			{/await}
		</form>
	</Container>
</Section>

<!-- FAQ 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	id="FAQ"
	divider
	dividerBottom={{ svg: 'text-base-950' }}
	class="bg-base-200-700 flex flex-col gap-5"
>
	<Title
		title={getSection('FAQ')?.title ?? 'FAQ Title'}
		subtitle={getSection('FAQ')?.subtitle ?? 'FAQ Subtitle'}
	/>
	<Content class="flex flex-col">
		{#each faqData as faq (faq.id)}
			<Toggle
				variant="panel"
				label={faq.label}
				class="border-base-300-700 border-b last:border-0"
				button={{
					icon: 'icon-[mdi--chevron-right] transition-transform duration-200 rotate-0 text-2xl',
					iconToggle:
						'icon-[mdi--chevron-right] text-primary transition-transform duration-200 rotate-90 text-2xl',
					variant: 'text icon',
					width: 'full',
					padding: 'none',
					appearance: 'ghost',
					class: '!font-black hover:[&_.btn-icon]:text-primary'
				}}
			>
				<p>{faq.content}</p>
			</Toggle>
		{/each}
	</Content>
</Section>

<!-- CTA 
::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
<Section
	class="dark flex flex-col py-0 text-center lg:items-start lg:justify-start lg:text-left"
	container="!gap-6 !pt-0 lg:!gap-6 flex w-full flex-col items-center lg:grid lg:grid-flow-col lg:grid-rows-2"
>
	<Text
		class="text-balance text-4xl md:text-pretty md:text-6xl"
		h1={getSection('CTA')?.title ?? 'CTA Title'}
	/>
	<Text
		class="text-pretty md:max-w-xl md:text-balance"
		p={getSection('CTA')?.subtitle ?? 'CTA Subtitle'}
	/>
	<Button
		size="xl"
		primary
		variant="text"
		label="Contact Sales"
		class="row-span-2 min-w-72 place-self-end self-center"
		href="#Contact"
		onclick={trackEvent({
			name: toButtonEventName('Contact Sales'),
			location: 'homepage_cta',
			label: 'Contact Sales',
			href: '#Contact'
		})}
	/>
</Section>

<style lang="postcss">
	@reference "#ui.css";

	:global {
		.services-container {
			grid-template-columns: repeat(auto-fit, minmax(30ch, 1fr));
		}

		/* Slider active state styling */
		.embla__slide {
			.card-testimonial {
				@apply scale-60 opacity-25 transition-all duration-300;
			}
		}

		.embla__slide.active {
			/* Active/snapped slide */
			.card-testimonial {
				@apply scale-100 opacity-100;
			}
		}

		/* Form validation styling */
		.contact-form:invalid .submit-button {
			@apply pointer-events-none cursor-not-allowed opacity-100;
		}

		.contact-form:valid .submit-button {
			@apply pointer-events-auto cursor-pointer opacity-100;
		}

		/* Hero content starts hidden, fades in when heroReady triggers hero-visible */
		.hero-hidden {
			opacity: 0;
			transform: translateY(10px);
		}

		.hero-visible {
			animation: heroFadeIn 0.8s ease-in-out forwards;
		}

		@keyframes heroFadeIn {
			from {
				opacity: 0;
				transform: translateY(10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}
</style>
