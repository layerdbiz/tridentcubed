<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getSlidesData, type SlideData } from '$lib/slides/slides.remote';
	import { Text } from '@layerd/ui';

	// Get slug from URL parameter (catch-all route returns it as a string)
	const slug = $derived(page.params.slug);

	// Fetch all slides (prerender function uses .current)
	const allSlides = getSlidesData().current ?? [];

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
		<div class="flex min-h-screen flex-col items-center justify-center p-10">
			<!-- Slide view based on "view" field -->
			{#if currentSlide.view === 'bg'}
				<!-- Background image view -->
				<div
					class="relative flex h-screen w-full flex-col items-center justify-center text-white"
					style="background-image: url({currentSlide.src}); background-size: cover; background-position: center;"
				>
					<div class="absolute inset-0 bg-black/40"></div>
					<div class="relative z-10 text-center">
						<Text
							h1={currentSlide.title}
							class="text-9xl uppercase text-white"
						/>
						{#if currentSlide.subtitle}
							<Text
								h2={currentSlide.subtitle}
								class="text-9xl uppercase text-white"
							/>
						{/if}
					</div>
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
				</div>
			{/if}

			<!-- Navigation indicators (subtle) -->
			<div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
				{#each allSlides as slide, i}
					<button
						class="h-2 w-2 rounded-full transition-all {i === currentIndex
							? 'bg-primary-600 w-8'
							: 'bg-neutral-300 hover:bg-neutral-400'}"
						onclick={(e) => {
							e.stopPropagation();
							navigateToSlide(slide);
						}}
						aria-label="Go to slide {i + 1}"
					></button>
				{/each}
			</div>

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
