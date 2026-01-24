<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { SlideData } from '$lib/slides/slides.remote';
	import { Text, Image, Logo, Tree, Table, Toggle, Link } from '@layerd/ui';
	import { treeData, orgChartData } from '@layerd/ui/components/molecules/chart/data/data.js';

	let { data } = $props();

	// Get slug from URL parameter (catch-all route returns it as a string)
	const slug = $derived(page.params.slug);
	const currentSlug = $derived(slug);

	// Get all slides from load function
	const allSlides = data.slides ?? [];

	// Get unique types with their first slide (for outline view)
	const uniqueTypes = $derived.by(() => {
		const typeMap = new Map<string, SlideData>();
		allSlides.forEach((slide) => {
			// Skip Cover and Outline types
			if (slide.type === 'Cover' || slide.type === 'Outline') return;
			// Only add the first slide of each type
			if (!typeMap.has(slide.type)) {
				typeMap.set(slide.type, slide);
			}
		});
		return Array.from(typeMap.values());
	});

	// Create chapters structure for navigation
	interface Chapter {
		label: string;
		href: string;
		open: boolean;
		items: SlideData[];
	}

	let chaptersState = $state<Record<string, boolean>>({});

	const chapters = $derived.by((): Chapter[] => {
		const chapterMap = new Map<string, SlideData[]>();

		allSlides.forEach((slide) => {
			if (slide.type === 'Cover' || slide.type === 'Outline') return;

			if (!chapterMap.has(slide.type)) {
				chapterMap.set(slide.type, []);
			}
			chapterMap.get(slide.type)!.push(slide);
		});

		return Array.from(chapterMap.entries()).map(([type, items]) => {
			const href = items[0]?.slug || '';
			return {
				label: type,
				href,
				open: chaptersState[href] ?? false,
				items
			};
		});
	});

	// Handle chapter toggle
	function handleChapterToggle(href: string) {
		chaptersState[href] = !chaptersState[href];
	}

	// Find the current slide based on slug
	const currentSlide = $derived.by((): SlideData | null => {
		// The slug from catch-all route is already a string like "1-intro/cover"
		const found = allSlides.find((s) => s.slug === slug);
		console.log('Found slide:', found ? found.name : 'NOT FOUND');
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

<main class="fixed grid h-svh w-full">
	<nav class="hidden w-64 bg-neutral-200 p-4">
		<Logo
			mode="black"
			name="Company"
			href="/"
		/>

		<div class="ml-2 mt-8">
			<Toggle
				open
				variant="panel"
				label="Slides"
				onToggle={() => handleChapterToggle('/')}
				button={{
					icon: 'icon-[mdi--presentation] transition-transform duration-200',
					iconHover: 'icon-[mdi--presentation-play] transition-transform duration-200',
					iconToggle: 'icon-[mdi--presentation-play] transition-transform duration-200',
					variant: 'icon text',
					width: 'full',
					padding: 'none',
					appearance: 'ghost',
					class: '!p-0 !font-bold uppercase',
					size: 'sm'
				}}
			>
				{#each chapters as chapter}
					<Toggle
						open={chapter.open}
						variant="panel"
						label={chapter.label}
						onToggle={() => handleChapterToggle(chapter.href)}
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
							{#each chapter.items as item}
								<Link
									href="/{item.slug}"
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
	{#if currentSlide}
		<div class="flex flex-col items-center justify-center">
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
					class="lg:scale-85 pointer-events-none fixed scale-150 md:scale-100"
				/>
				<div class="relative z-10 flex flex-col items-center justify-center gap-6 text-center">
					<Logo class="size-48" />
					<Text
						h1={currentSlide.name}
						class="text-5xl uppercase text-white md:text-7xl lg:text-8xl"
					/>
					{#if currentSlide.description}
						<Text
							h2={currentSlide.description}
							class="md:text-md text-xs font-normal uppercase tracking-widest text-white lg:text-2xl"
						/>
					{/if}
				</div>

				<!-- OUTLINE
			:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
			{:else if currentSlide.view === 'outline'}
				<div class="flex flex-col justify-center gap-8">
					<Text h1={currentSlide.name} />
					<ol
						class="grid list-none grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8"
						style="counter-reset: outline-counter;"
					>
						{#each uniqueTypes as typeSlide}
							<li
								class="flex items-center gap-4"
								style="counter-increment: outline-counter;"
							>
								<span
									class="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-lg font-black text-white"
									style="content: counter(outline-counter);"
								>
									{uniqueTypes.indexOf(typeSlide) + 1}
								</span>
								<a
									href="/{typeSlide.slug}"
									class="text-primary-600 hover:text-primary-700 text-2xl font-semibold"
								>
									{typeSlide.type}
								</a>
							</li>
						{/each}
					</ol>
				</div>

				<!-- OVERVIEW
			:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
			{:else if currentSlide.view === 'overview'}
				<!-- Overview/outline view -->
				<div class="bg-accent">
					<Text
						h2={currentSlide.type}
						class="text-xl font-semibold uppercase text-neutral-500"
					/>
					<Text
						h1={currentSlide.name}
						class="leading-container-desktop"
					/>
					{#if currentSlide.description}
						<p class="text-2xl text-neutral-600">{currentSlide.description}</p>
					{/if}
				</div>

				<!-- DEFAULT
			:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
			{:else}
				<!-- Default view -->
				<div class="h-full w-full p-8">
					<h2 class="mb-4 text-xl font-semibold text-neutral-500">
						{currentSlide.type}
					</h2>
					<h1 class="mb-4 text-4xl font-bold">{currentSlide.name}</h1>
					{#if currentSlide.description}
						<p class="mb-8 text-xl text-neutral-600">{currentSlide.description}</p>
					{/if}

					{#if currentSlide.sheetData && currentSlide.sheetData.length > 0}
						<!-- Display table for slides with sheet data -->
						<Table
							columns={[
								{ key: 'id', label: 'ID', align: 'left', width: '80px' },
								{ key: 'name', label: 'Name', align: 'left' }
							]}
							data={currentSlide.sheetData}
							hoverable={true}
						/>
					{:else}
						<!-- Fallback content when no sheet data -->
						<Tree data={orgChartData} />

						<Table
							columns={[
								{ key: 'id', label: 'ID', align: 'left', width: '80px' },
								{ key: 'name', label: 'Name', align: 'left' },
								{ key: 'parent', label: 'Reports To', align: 'center', width: '120px' },
								{ key: 'src', label: 'Profile', align: 'left' }
							]}
							data={orgChartData}
							hoverable={true}
						/>
					{/if}
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
</main>
