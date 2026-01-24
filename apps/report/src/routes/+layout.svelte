<script lang="ts">
	import '../app.css';
	import { Template, Logo, Toggle, Link } from '@layerd/ui';
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
			label: chapter.type,
			href: `/${chapter.sections[0]?.slug || ''}`,
			items: chapter.sections.map((section) => ({
				slug: section.slug,
				name: section.name
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

<!-- <Template /> -->

{@render children()}
