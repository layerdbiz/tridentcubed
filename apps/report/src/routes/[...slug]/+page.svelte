<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { SlideData } from '$lib/slides/slides.remote';
	import { Text, Image, Logo, Tree } from '@layerd/ui';

	let { data } = $props();

	// Get slug from URL parameter (catch-all route returns it as a string)
	const slug = $derived(page.params.slug);

	// Get all slides from load function
	const allSlides = data.slides ?? [];

	// Debug logging
	$effect(() => {
		console.log('Current slug from params:', slug);
		console.log(
			'Available slides:',
			allSlides.map((s) => s.slug)
		);
	});

	// Find the current slide based on slug
	const currentSlide = $derived.by((): SlideData | null => {
		// The slug from catch-all route is already a string like "1-intro/cover"
		const found = allSlides.find((s) => s.slug === slug);
		console.log('Found slide:', found ? found.title : 'NOT FOUND');
		return found || null;
	});

	// Find current slide index for navigation
	const currentIndex = $derived(
		currentSlide ? allSlides.findIndex((s) => s.slug === currentSlide.slug) : -1
	);

	// Navigation helpers
	const prevSlide = $derived(currentIndex > 0 ? allSlides[currentIndex - 1] : null);
	const nextSlide = $derived(
		currentIndex < allSlides.length - 1 ? allSlides[currentIndex + 1] : null
	);

	// Navigate to next/prev slide
	function navigateToSlide(slide: SlideData | null) {
		if (slide) {
			goto(`/${slide.slug}`);
		}
	}

	// Handle click navigation (left 50% = prev, right 50% = next)
	function handleClickNavigation(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const halfWidth = rect.width / 2;

		if (clickX < halfWidth) {
			// Clicked left half - go to previous slide
			navigateToSlide(prevSlide);
		} else {
			// Clicked right half - go to next slide
			navigateToSlide(nextSlide);
		}
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			navigateToSlide(prevSlide);
		} else if (event.key === 'ArrowRight' || event.key === ' ') {
			event.preventDefault(); // Prevent space from scrolling
			navigateToSlide(nextSlide);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative h-svh max-h-svh min-h-svh cursor-pointer"
	onclick={handleClickNavigation}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClickNavigation(e as any);
		}
	}}
	role="button"
	tabindex="0"
>
	{#if currentSlide}
		<div class="flex min-h-screen flex-col items-center justify-center">
			<!-- COVER
			:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
			{#if currentSlide.view === 'bg'}
				<!-- bottom black radial 
				------------------------------------------>
				<Image
					bg="fixed"
					overlay="bg-gradient-to-br from-primary-700 via-black to-primary-700 from-0% via-50%"
				/>
				<!-- globe
				------------------------------------------>
				<img
					src="/photos/globe.png"
					alt="Going Global"
					class="pointer-events-none fixed scale-150 md:scale-100 lg:scale-100"
				/>
				<div class="relative z-10 flex flex-col items-center justify-center gap-6 text-center">
					<Logo class="size-48" />
					<Text
						h1={currentSlide.title}
						class="text-5xl uppercase text-white md:text-7xl lg:text-8xl"
					/>
					{#if currentSlide.subtitle}
						<Text
							h2={currentSlide.subtitle}
							class="md:text-md text-xs font-normal uppercase tracking-widest text-white lg:text-2xl"
						/>
					{/if}
				</div>
			{:else if currentSlide.view === 'overview'}
				<!-- Overview/outline view -->
				<div class="text-center">
					<h2 class="mb-4 text-2xl font-semibold text-neutral-500">{currentSlide.chapter}</h2>
					<h1 class="mb-8 text-5xl font-bold">{currentSlide.title}</h1>
					{#if currentSlide.subtitle}
						<p class="text-2xl text-neutral-600">{currentSlide.subtitle}</p>
					{/if}
				</div>
			{:else}
				<!-- Default view -->
				<div class="max-w-4xl">
					<div class="mb-6 text-center">
						<h2 class="mb-4 text-xl font-semibold text-neutral-500">
							{currentSlide.chapter} / {currentSlide.section}
						</h2>
						<h1 class="mb-4 text-4xl font-bold">{currentSlide.title}</h1>
						{#if currentSlide.subtitle}
							<p class="text-xl text-neutral-600">{currentSlide.subtitle}</p>
						{/if}
					</div>
					{#if currentSlide.src}
						<img
							src={currentSlide.src}
							alt={currentSlide.title}
							class="w-full rounded-lg shadow-lg"
						/>
					{/if}
					<Tree />
				</div>
			{/if}

			<!-- Progress indicator -->
			<div class="absolute bottom-4 right-4 text-sm text-neutral-500">
				{currentIndex + 1} / {allSlides.length}
			</div>
		</div>
	{:else}
		<div class="flex min-h-screen items-center justify-center">
			<div class="text-center">
				<h1 class="mb-4 text-2xl font-bold text-neutral-600">Slide Not Found</h1>
				<p class="text-neutral-500">
					The slide with slug <code class="text-primary-600">"{slug}"</code> could not be found.
				</p>
			</div>
		</div>
	{/if}
</div>
