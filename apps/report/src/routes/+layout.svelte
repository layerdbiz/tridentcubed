<script lang="ts">
	import '../app.css';
	import { Logo, Toggle, Link } from '@layerd/ui';
	import { getChapterNavigationData, getSlidesData } from '$lib/slides/slides.remote';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children, data } = $props();

	// Get slides data from load function
	const chaptersData = data.chapters ?? [];
	const slidesData = data.slides ?? [];

	// Get current slug from URL parameter (catch-all route returns full path)
	const currentSlug = $derived(page.params.slug);

	// Create navigation structure from chapters
	const chapters = $derived(
		chaptersData.map((chapter, index) => ({
			label: chapter.chapter,
			href: `/${chapter.sections[0]?.slug || ''}`,
			items: chapter.sections.map((section) => ({
				slug: section.slug,
				name: section.title || section.section
			})),
			open: index === 0 // First chapter open by default
		}))
	);

	// Handle chapter toggle with navigation
	function handleChapterToggle(chapterHref: string) {
		// Navigate using SvelteKit's client-side routing
		goto(chapterHref);
	}
</script>

<main class="fixed grid h-svh max-h-svh w-full">
	<nav class="hidden bg-neutral-200/40 p-4">
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

	{@render children()}
</main>
