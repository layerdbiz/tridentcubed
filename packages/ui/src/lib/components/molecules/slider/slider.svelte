<script lang="ts">
	/**
	 * @tags slider, carousel, embla
	 * @layout horizontal
	 */
	import { Component, type ComponentProps } from '@layerd/ui';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import Autoplay from 'embla-carousel-autoplay';
	import AutoScroll from 'embla-carousel-auto-scroll';
	import ClassNames from 'embla-carousel-class-names';
	import type { EmblaOptionsType } from 'embla-carousel';

	export interface SliderProps extends Omit<ComponentProps, 'disabled'> {
		variant?: 'base' | 'autoplay' | 'fade';
		show?: number;
		loop?: boolean;
		autoplay?: boolean;
		autoscroll?: boolean | number;
		duration?: number;
		slides?: any[];
		disabled?: 'sm' | 'md' | 'lg' | 'xl';
		container?: string;
		slide?: string;
	}

	let {
		variant = 'base',
		show = 1,
		loop = false,
		autoplay = false,
		autoscroll = false,
		duration = 5000,
		slides = [],
		disabled,
		container = '',
		slide = '',
		children = undefined,
		...props
	}: SliderProps = $props();

	// Calculate autoscroll values
	const isAutoscroll = $derived(autoscroll !== false && autoscroll !== 0);
	const autoscrollSpeed = $derived(() => {
		if (autoscroll === false || autoscroll === 0) return 0;
		if (autoscroll === true) return 2; // Use default from documentation
		return Number(autoscroll); // Custom speed
	});

	// Tailwind breakpoint mapping
	const breakpoints = {
		sm: '640px',
		md: '768px',
		lg: '1024px',
		xl: '1280px'
	};

	// Generate breakpoints config based on disabled prop
	const responsiveBreakpoints = $derived(() => {
		const config: Record<string, any> = {
			'(max-width: 768px)': {
				slidesToScroll: 1,
				align: 'center',
				// Adjust container behavior for mobile peek effect
				containScroll: false
			}
		};

		// Add disabled breakpoint if specified
		if (disabled && breakpoints[disabled]) {
			config[`(min-width: ${breakpoints[disabled]})`] = {
				active: false
			};
		}

		return config;
	});

	// Embla options
	let options: EmblaOptionsType = $derived({
		loop: loop || isAutoscroll, // Auto-enable loop for autoscroll
		align: 'center',
		slidesToScroll: 1,
		// Simplify options for autoscroll
		...(isAutoscroll
			? {
					containScroll: false,
					watchDrag: false
				}
			: {
					containScroll: 'trimSnaps'
				}),
		// Use dynamic responsive breakpoints
		breakpoints: responsiveBreakpoints()
	});

	// Embla plugins
	let plugins = $derived(() => {
		const pluginList: any[] = [
			ClassNames({
				snapped: 'active',
				inView: 'inview'
			})
		];

		if (autoplay || variant === 'autoplay') {
			pluginList.push(Autoplay({ delay: duration }));
		}

		if (isAutoscroll) {
			pluginList.push(
				AutoScroll({
					speed: autoscrollSpeed(),
					startDelay: 1000, // Use default from documentation
					stopOnInteraction: false
				})
			);
		}

		return pluginList;
	});

	// Embla configuration
	let emblaConfig = $derived({
		options,
		plugins: plugins()
	});

	// API reference
	let emblaApi: any = $state(null);
	let containerRef: HTMLDivElement | null = $state(null);
	let isInitialized = $state(false);
	let currentIntersectionState: boolean | null = null; // Not reactive, just for tracking

	function onInit(event: any) {
		emblaApi = event.detail;
		isInitialized = true;

		// Debug AutoScroll plugin specifically
		if (isAutoscroll && emblaApi) {
			const autoScrollPlugin = emblaApi.plugins().autoScroll;
			if (!autoScrollPlugin) {
				console.error('AutoScroll plugin not found in emblaApi.plugins()');
			}
		}
	}

	// Control autoplay/autoscroll based on intersection (passed from Component observe)
	function handleIntersectionChange(isIntersecting: boolean) {
		// Only act if state actually changed
		if (currentIntersectionState === isIntersecting) return;
		currentIntersectionState = isIntersecting;

		if (!emblaApi || !isInitialized) return;

		// Get the appropriate plugin
		if (autoplay || variant === 'autoplay') {
			const autoplayPlugin = emblaApi.plugins()?.autoplay;
			if (autoplayPlugin) {
				if (isIntersecting) {
					autoplayPlugin.play();
				} else {
					autoplayPlugin.stop();
				}
			}
		}

		if (isAutoscroll) {
			const autoScrollPlugin = emblaApi.plugins()?.autoScroll;
			if (autoScrollPlugin) {
				if (isIntersecting) {
					autoScrollPlugin.play();
				} else {
					autoScrollPlugin.stop();
				}
			}
		}
	}

	// Reactive effect to wrap children when content changes
	$effect(() => {
		if (containerRef) {
			// Use a MutationObserver to detect when children are added
			const observer = new MutationObserver((mutations) => {
				let shouldUpdate = false;

				mutations.forEach((mutation) => {
					if (mutation.type === 'childList') {
						// Check if non-loading content was added
						mutation.addedNodes.forEach((node) => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								const element = node as Element;
								const text = element.textContent?.toLowerCase() || '';
								// Skip loading states and placeholder content
								if (
									!element.classList.contains('animate-pulse') &&
									!text.includes('loading') &&
									text.trim() !== ''
								) {
									shouldUpdate = true;
								}
							}
						});

						// Also check if loading content was removed (transition from loading to real content)
						mutation.removedNodes.forEach((node) => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								const element = node as Element;
								const text = element.textContent?.toLowerCase() || '';
								if (element.classList.contains('animate-pulse') || text.includes('loading')) {
									shouldUpdate = true;
								}
							}
						});
					}
				});

				if (shouldUpdate) {
					// Delay to ensure DOM is settled after async data transition
					setTimeout(() => {
						wrapChildrenInSlides();
					}, 100);
				}
			});

			observer.observe(containerRef, {
				childList: true,
				subtree: true // Watch deeper for content changes
			});

			// Initial check for existing content
			const hasRealContent = Array.from(containerRef.children).some((child) => {
				const text = child.textContent?.toLowerCase() || '';
				return (
					!child.classList.contains('animate-pulse') &&
					!text.includes('loading') &&
					text.trim() !== ''
				);
			});

			if (hasRealContent) {
				// Delay initial wrapping to ensure Embla is ready
				setTimeout(() => {
					wrapChildrenInSlides();
				}, 50);
			}

			return () => observer.disconnect();
		}
	});

	// Handle window resize to update slide classes
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);

	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleResize = () => {
				windowWidth = window.innerWidth;
				if (containerRef && emblaApi) {
					emblaApi.reInit();
				}
			};

			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	});

	// Calculate slide classes reactively based on screen size and show count
	// Cache the result to prevent unnecessary recalculations
	let cachedSlideClasses = '';
	const slideClasses = $derived.by(() => {
		const result = (() => {
			if (show === 1) {
				// Single slide mode
				return 'w-full max-w-sm mx-auto flex-none';
			} else if (windowWidth < 768) {
				// Mobile: Different behavior based on autoscroll
				if (isAutoscroll) {
					// For autoscroll sliders (like partners), respect the show count
					const mobileWidthClass =
						{
							2: 'w-1/2',
							3: 'w-1/3',
							4: 'w-1/4',
							5: 'w-1/5',
							6: 'w-1/6'
						}[show] || `w-1/${show}`;

					return `flex-none ${mobileWidthClass} min-w-0`;
				} else {
					// For regular sliders (testimonials, profiles), use peek effect
					return 'flex-none w-[75%] min-w-0';
				}
			} else {
				// Desktop: use predefined widths based on show count
				const widthClass =
					{
						2: 'w-1/2',
						3: 'w-1/3',
						4: 'w-1/4',
						5: 'w-1/5',
						6: 'w-1/6'
					}[show] || `w-1/${show}`;

				return `flex-none ${widthClass} min-w-0`;
			}
		})();

		// Cache to prevent unnecessary recalculations
		if (result !== cachedSlideClasses) {
			cachedSlideClasses = result;
		}

		return result;
	});

	function wrapChildrenInSlides() {
		if (!containerRef || !isInitialized) return;

		// Get all direct children of the container that are NOT already embla__slide wrappers
		const children = Array.from(containerRef.children).filter(
			(child) => !child.classList.contains('embla__slide')
		);

		// If no unwrapped children, nothing to do
		if (children.length === 0) return;

		// Skip if children are loading placeholders
		const hasLoadingContent = children.some((child) => {
			const text = child.textContent?.toLowerCase() || '';
			return (
				child.classList.contains('animate-pulse') || text.includes('loading') || text.trim() === ''
			);
		});

		if (hasLoadingContent) return;

		// Remove any existing empty embla__slide wrappers
		const existingSlides = containerRef.querySelectorAll('.embla__slide');
		existingSlides.forEach((slide) => {
			if (slide.children.length === 0) {
				slide.remove();
			}
		});

		// Wrap each unwrapped child in embla__slide
		children.forEach((child) => {
			// Create slide wrapper
			const slideWrapper = document.createElement('div');
			slideWrapper.className = `embla__slide ${slideClasses} ${slide}`.trim();

			// Insert wrapper before child and move child into wrapper
			containerRef!.insertBefore(slideWrapper, child);
			slideWrapper.appendChild(child);
		});

		// Reinitialize Embla to recognize the new slide structure
		if (emblaApi && containerRef) {
			// Use a small delay to ensure DOM updates are complete
			setTimeout(() => {
				emblaApi.reInit();
			}, 10);
		}
	}
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	observe
	{...props}
	class="slider embla select-none overflow-hidden {isAutoscroll ? '' : 'cursor-grab'} {props.class}"
>
	{#snippet component({
		props: componentProps,
		observe: observeInstance
	}: {
		props: any;
		observe?: import('@layerd/ui').ObserveClass;
	})}
		{@const isIntersecting = observeInstance?.isIntersecting ?? true}
		{@const _ = handleIntersectionChange(isIntersecting)}
		<div
			{...componentProps}
			use:emblaCarouselSvelte={emblaConfig}
			onemblaInit={onInit}
		>
			<div
				class="slider-container embla__container flex {container}"
				bind:this={containerRef}
			>
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	:global(.embla__slide) {
		/* Ensure slides maintain proper flex behavior */
		flex-shrink: 0;
		/* Allow slides to maintain consistent width across all viewports */
		min-width: 0;
		/* Ensure proper centering of content */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.embla__slide > *) {
		/* Ensure child content fills the slide properly */
		width: 100%;
		max-width: 100%;
	}
</style>
