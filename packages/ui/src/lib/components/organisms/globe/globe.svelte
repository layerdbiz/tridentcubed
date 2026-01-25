<!--
@component Globe
@tags organism, 3d, visualization, interactive, map, globe

Interactive 3D globe visualization component with support for locations, arcs, rings, labels, and more.
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Image, mq, navigationState } from '@layerd/ui';
	import { untrack } from 'svelte';
	import * as THREE from 'three';
	import {
		type GlobeProps,
		type Location,
		type Port,
		createDefaultConfig,
		mergeConfigs
	} from '@layerd/ui';

	let {
		startLocationId,
		class: className = '',
		autoplay, // Extract autoplay separately to ensure reactivity
		// All other props are collected into restProps to be merged into the config
		...restProps
	}: GlobeProps = $props();

	// Dynamic import type for Globe - will be loaded client-side only
	type GlobeInstance = any;
	type GlobeConstructor = any;

	// Globe constructor - loaded dynamically in onMount
	let Globe: GlobeConstructor | null = $state(null);

	// ============================================================================
	// State Management (Svelte 5 Runes)
	// ============================================================================

	let globeContainer: HTMLDivElement | undefined = $state();
	let globeInstance: GlobeInstance | null = $state(null);
	let previousLocation: Location | null = $state(null);
	let displayPreviousLocation: Location | null = $state(null); // Visual previous location for point transitions
	let windowWidth = $state(1920);
	let windowHeight = $state(1080);
	let processedLocations = $state<Location[]>([]);
	let processedPorts = $state<Port[]>([]);
	let activeArcs = $state<any[]>([]); // Track all active arcs
	let arcCleanupTimeouts = $state<Map<string, ReturnType<typeof setTimeout>>>(new Map()); // Track cleanup timeouts per arc
	let activeRings = $state<any[]>([]); // Track all active rings

	// Track media query breakpoints for recreation
	let lastMqSm = $state(mq.sm);
	let lastMqMd = $state(mq.md);
	let lastMqLg = $state(mq.lg);
	let lastMqXl = $state(mq.xl);

	// Store marker elements for class toggling
	let markerElements = $state<Map<string, HTMLElement>>(new Map());

	// Track if current navigation was from a user click (for immediate activation)
	let wasClickNavigation = $state(false);

	// Loading state flags for FOUC prevention
	let polygonData: any = $state(null); // Store polygon data, null = not loaded yet
	let globeInitialized = $state(false);

	// WebGL error prevention - track initialization attempts to prevent infinite retry loops
	let initializationAttempts = $state(0);
	const MAX_INITIALIZATION_ATTEMPTS = 3;
	let webGLFailed = $state(false); // Permanently disable globe if WebGL fails repeatedly

	// Derived state - globe is ready to display when initialized
	const isGlobeReady = $derived(globeInitialized);

	// Create a reactive, merged configuration
	// Include the autoplay prop explicitly since it's extracted separately
	const mergedConfig = $derived(
		mergeConfigs(
			createDefaultConfig(windowWidth, windowHeight),
			restProps.config, // The main config object prop
			restProps, // Individual objects like `data`, `arcs`, etc.
			{ autoplay } // Ensure autoplay prop is merged last (highest precedence)
		)
	);

	// ============================================================================
	// Data Loading
	// ============================================================================

	// Get locations and ports from data config or direct props
	const effectiveLocations = $derived(processedLocations);

	// Derive current index based on processedLocations and startLocationId
	// This automatically updates when locations are loaded
	let currentIndex = $state(-1);

	$effect(() => {
		if (processedLocations.length > 0 && currentIndex === -1) {
			if (startLocationId !== undefined) {
				const foundIndex = processedLocations.findIndex(
					(loc) => String(loc.id) === String(startLocationId)
				);
				currentIndex = foundIndex !== -1 ? foundIndex : 0;
			} else {
				currentIndex = 0;
			}
		}
	});

	// Current location and ports
	const currentLocation = $derived(effectiveLocations[currentIndex] || null);

	// Get ports for current location
	const currentPorts = $derived(
		currentLocation
			? processedPorts.filter((port) => port.location === currentLocation.location)
			: []
	);

	// Derive which locations to show on the globe (for smooth arc animations)
	const locationsToShow = $derived.by(() => {
		const prevLoc = displayPreviousLocation;
		const loc = currentLocation;
		const isFirstLocation = !prevLoc;
		const cfg = mergedConfig;
		const arcDuration = cfg.arcs?.duration ?? 2000;
		const delay = isFirstLocation ? 0 : arcDuration;

		// Show both points during arc animation for visual continuity
		if (!isFirstLocation && prevLoc && delay > 0) {
			return [prevLoc, loc];
		}
		return loc ? [loc] : [];
	});

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Load SVG and convert it to a canvas texture for WebGL
	 * This properly wraps the SVG around the sphere surface as an overlay
	 */
	async function loadSVGAsCanvasTexture(url: string): Promise<THREE.Texture> {
		return new Promise((resolve, reject) => {
			// Create an HTMLImageElement (native browser Image, not Svelte component)
			const img = document.createElement('img');

			img.onload = () => {
				// Create a MAXIMUM RESOLUTION canvas for ultimate SVG crispness
				// Use 16K resolution (16384x8192) for professional-grade quality
				const canvas = document.createElement('canvas');
				canvas.width = 16384; // 16K width for maximum detail
				canvas.height = 8192; // 16K height - exact 2:1 equirectangular ratio

				const ctx = canvas.getContext('2d', {
					alpha: true,
					willReadFrequently: false,
					desynchronized: true // Better performance for large canvases
				});
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				// DISABLE smoothing for pixel-perfect crisp SVG lines
				ctx.imageSmoothingEnabled = false;

				// Clear to transparent (in case SVG doesn't have background)
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				// Draw the SVG onto the canvas at maximum resolution
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				console.log(`✅ Canvas created at 16K: ${canvas.width}x${canvas.height}`);

				// Create THREE.js texture from canvas
				const texture = new THREE.CanvasTexture(canvas);
				texture.needsUpdate = true;

				// Set texture wrapping for seamless globe coverage
				texture.wrapS = THREE.RepeatWrapping; // Horizontal wrapping (longitude)
				texture.wrapT = THREE.ClampToEdgeWrapping; // Vertical clamping (latitude - no wrap at poles)

				// CRITICAL: Use nearest-neighbor filtering for pixel-perfect sharpness
				texture.minFilter = THREE.NearestFilter; // Sharp pixels when zoomed out
				texture.magFilter = THREE.NearestFilter; // Sharp pixels when zoomed in
				texture.anisotropy = 16; // Maximum anisotropic filtering
				texture.generateMipmaps = false; // No mipmaps to avoid blur

				resolve(texture);
			};

			img.onerror = (error) => {
				console.error('❌ Failed to load SVG image from:', url, error);
				reject(new Error(`Failed to load SVG image: ${url}`));
			};

			// Load the SVG

			img.src = url;
		});
	}

	// Attachment function for globe container
	function attachGlobeContainer(element: HTMLElement) {
		globeContainer = element as HTMLDivElement;
		return () => {
			globeContainer = undefined;
		};
	}

	// Create attachment for marker elements
	function createMarkerAttachment(lat: number, lng: number) {
		const key = `${lat},${lng}`;
		return (element: HTMLElement) => {
			markerElements.set(key, element);
			return () => {
				markerElements.delete(key);
			};
		};
	}

	// ============================================================================
	// Location Navigation Functions
	// ============================================================================

	/**
	 * Change the active location by index
	 * Handles wrapping for out-of-bounds indices
	 */
	function changeLocation(newIndex: number) {
		const total = effectiveLocations.length;
		if (total === 0) return;
		currentIndex = (newIndex + total) % total;
	}

	/**
	 * Set the active location by index (alias for changeLocation)
	 */
	function setActiveLocation(index: number) {
		changeLocation(index);
	}

	/**
	 * Move to the next location
	 */
	function nextLocation() {
		changeLocation(currentIndex + 1);
	}

	/**
	 * Move to the previous location
	 */
	function prevLocation() {
		changeLocation(currentIndex - 1);
	}

	/**
	 * Find and activate a location by matching the location object
	 */
	function goToLocation(location: Location) {
		const idx = effectiveLocations.findIndex(
			(loc) =>
				parseFloat(String(loc.lat)) === parseFloat(String(location.lat)) &&
				parseFloat(String(loc.lng)) === parseFloat(String(location.lng))
		);
		if (idx >= 0) {
			changeLocation(idx);
		}
	}

	/**
	 * Add a ripple ring at a specific location
	 * Called when arc endpoint reaches its destination
	 */
	function addRingAtLocation(location: Location) {
		if (!globeInstance) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		const ringsConfig = cfg.rings;
		const arcsConfig = cfg.arcs;

		if (!ringsConfig) return;

		// Create unique ring ID for tracking
		const ringId = `${location.lat},${location.lng}-${Date.now()}`;

		// Create new ring data
		const newRing = {
			id: ringId,
			lat: parseFloat(String(location.lat)),
			lng: parseFloat(String(location.lng))
		};

		// Add new ring to active rings array
		activeRings = [...activeRings, newRing];

		// Get ring configuration
		const radius = ringsConfig.radius ?? 2;
		const speed = ringsConfig.speed ?? 2;
		const stroke = ringsConfig.stroke;
		const numRings = ringsConfig.rings ?? 3;
		const arcDuration = arcsConfig?.duration ?? 2000;
		const arcDashLength = arcsConfig?.dashLength ?? 0.6;

		// Calculate ring duration based on arc dash length if not explicitly set
		const ringDuration = ringsConfig.duration ?? arcDuration * arcDashLength;

		// Calculate repeat period to show multiple rings
		const repeatPeriod = ringsConfig.repeat ?? ringDuration / numRings;

		// Configure ring visualization with all active rings
		const ringColor =
			typeof ringsConfig.color === 'function'
				? ringsConfig.color
				: (t: number) => {
						const baseColor = ringsConfig.color ?? '#ffffff';
						// Parse color and apply fade (only if baseColor is a string)
						if (typeof baseColor === 'string' && baseColor.startsWith('#')) {
							// Convert hex to rgb and apply opacity fade
							const r = parseInt(baseColor.slice(1, 3), 16);
							const g = parseInt(baseColor.slice(3, 5), 16);
							const b = parseInt(baseColor.slice(5, 7), 16);
							return `rgba(${r},${g},${b},${1 - t})`;
						}
						return typeof baseColor === 'string' ? baseColor : '#ffffff';
					};

		globeInstance
			.ringsData(activeRings)
			.ringColor(() => ringColor)
			.ringMaxRadius(radius)
			.ringPropagationSpeed(speed)
			.ringRepeatPeriod(repeatPeriod)
			.ringAltitude(ringsConfig.altitude ?? 0.003);

		// Remove ring after animation completes
		setTimeout(() => {
			// Remove this ring from active rings
			activeRings = activeRings.filter((ring) => ring.id !== ringId);

			// Update globe with remaining rings
			if (globeInstance) {
				globeInstance.ringsData(activeRings);
			}
		}, ringDuration);
	}

	/**
	 * Animate arc between two locations
	 */
	function animateArcTransition(fromLocation: Location, toLocation: Location) {
		if (!globeInstance) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		const arcsConfig = cfg.arcs;

		if (!arcsConfig) return;

		// Create unique arc ID for tracking
		const arcId = `${fromLocation.lat},${fromLocation.lng}-${toLocation.lat},${toLocation.lng}-${Date.now()}`;

		// Create new arc data
		const newArc = {
			id: arcId,
			startLat: parseFloat(String(fromLocation.lat)),
			startLng: parseFloat(String(fromLocation.lng)),
			endLat: parseFloat(String(toLocation.lat)),
			endLng: parseFloat(String(toLocation.lng))
		};

		// Get dash configuration
		const dashLength = arcsConfig.dashLength ?? 0.6;
		const dashGap = arcsConfig.dashGap ?? 2;
		const dashInitialGap = arcsConfig.dashInitialGap ?? 1;
		const duration = arcsConfig.duration ?? 2000;

		// Calculate total dash cycle length (dash + gap)
		const totalDashCycle = dashLength + dashGap;

		// The time it takes for the full dash pattern (including gap) to traverse the arc
		const fullAnimationTime = duration * (1 + dashGap / totalDashCycle);

		// Add new arc to active arcs array
		activeArcs = [...activeArcs, newArc];

		// Configure arc visualization with all active arcs
		globeInstance
			.arcsData(activeArcs)
			.arcColor(() => arcsConfig.color ?? '#ffffff')
			.arcStroke(() => arcsConfig.stroke ?? 0.5)
			.arcDashLength(dashLength)
			.arcDashGap(dashGap)
			.arcDashInitialGap(dashInitialGap)
			.arcDashAnimateTime(duration)
			.arcAltitude(arcsConfig.altitude !== undefined ? arcsConfig.altitude : null)
			.arcAltitudeAutoScale(arcsConfig.altitudeAutoscale ?? 0.5)
			.arcStartAltitude(() => arcsConfig.startAltitude ?? 0.003)
			.arcEndAltitude(() => arcsConfig.endAltitude ?? 0.003);

		// Trigger ring animation when arc endpoint reaches destination
		// This happens after the dash completes its journey (at 'duration' time, not fullAnimationTime)
		setTimeout(() => {
			addRingAtLocation(toLocation);
		}, duration);

		// Schedule cleanup for this specific arc after the full animation completes
		const cleanupTimeout = setTimeout(() => {
			// Remove this arc from active arcs
			activeArcs = activeArcs.filter((arc) => arc.id !== arcId);

			// Update globe with remaining arcs
			if (globeInstance) {
				globeInstance.arcsData(activeArcs);
			}

			// Clean up timeout reference
			arcCleanupTimeouts.delete(arcId);
		}, fullAnimationTime);

		// Store timeout reference for potential cleanup
		arcCleanupTimeouts.set(arcId, cleanupTimeout);
	}

	/**
	 * Auto-play state and control
	 */
	let autoPlayInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isAutoPlaying = $state(false);
	let resumeTimeout: ReturnType<typeof setTimeout> | null = $state(null);
	let autoplayInitTimeout: ReturnType<typeof setTimeout> | null = $state(null);
	let isFirstAutoplayCycle = $state(true); // Track if this is the first cycle
	let isPausedByInteraction = $state(false); // Track if user manually paused via interaction

	/**
	 * Start auto-playing through locations
	 * @param intervalMs - Time in milliseconds between location changes (default: 3000ms)
	 * @param startDelayMs - Delay before first location change (optional, only used on first cycle)
	 */
	function startAutoPlay(intervalMs: number = 3000, startDelayMs?: number) {
		if (isAutoPlaying) {
			return; // Already playing
		}

		isAutoPlaying = true;

		// If this is the first cycle and startDelay is provided, wait before first change
		if (isFirstAutoplayCycle && startDelayMs && startDelayMs > 0) {
			isFirstAutoplayCycle = false; // Mark that we've started

			// Wait startDelayMs before the first location change
			resumeTimeout = setTimeout(() => {
				nextLocation();

				// Now start the regular interval for subsequent changes
				autoPlayInterval = setInterval(() => {
					nextLocation();
				}, intervalMs);
			}, startDelayMs);
		} else {
			// No start delay - start regular interval immediately
			isFirstAutoplayCycle = false;
			autoPlayInterval = setInterval(() => {
				nextLocation();
			}, intervalMs);
		}
	}

	/**
	 * Stop auto-playing
	 */
	function stopAutoPlay() {
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
			autoPlayInterval = null;
		}
		if (resumeTimeout) {
			clearTimeout(resumeTimeout);
			resumeTimeout = null;
		}
		isAutoPlaying = false;
	}

	/**
	 * Pause auto-play temporarily (for pauseOnInteraction)
	 */
	function pauseAutoPlay() {
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
			autoPlayInterval = null;
		}
		if (resumeTimeout) {
			clearTimeout(resumeTimeout);
			resumeTimeout = null;
		}
		isAutoPlaying = false;
		isPausedByInteraction = true; // Mark as paused by user interaction
	}

	/**
	 * Schedule resuming auto-play after a delay
	 */
	function scheduleResumeAutoPlay(intervalMs: number, resumeDelayMs: number) {
		if (resumeTimeout) {
			clearTimeout(resumeTimeout);
		}
		resumeTimeout = setTimeout(() => {
			isPausedByInteraction = false; // Clear the pause flag before resuming

			startAutoPlay(intervalMs);
		}, resumeDelayMs);
	}

	/**
	 * Toggle auto-play on/off
	 */
	function toggleAutoPlay(intervalMs: number = 3000) {
		if (isAutoPlaying) {
			stopAutoPlay();
		} else {
			startAutoPlay(intervalMs);
		}
	}

	// Initialize globe visibility after fade-in animation
	$effect(() => {
		// Wait for globe instance to exist
		if (!globeInstance) return;

		// Check if already initialized (use untrack to not create dependency)
		if (untrack(() => globeInitialized)) return;

		// Wait for fade-in animation to complete (800ms) before marking as initialized
		const fadeInDuration = 800;

		autoplayInitTimeout = setTimeout(() => {
			globeInitialized = true;
			autoplayInitTimeout = null;
		}, fadeInDuration);

		return () => {
			if (autoplayInitTimeout) {
				clearTimeout(autoplayInitTimeout);
				autoplayInitTimeout = null;
			}
		};
	});

	// Track autoplay enabled state separately to ensure reactivity
	const autoplayEnabled = $derived(autoplay?.enabled ?? false);

	// Track if globe should be animating
	let shouldAnimate = $state(true);

	// Control globe render loop based on viewport visibility
	$effect(() => {
		if (!globeInstance || !globeInitialized) return;

		const isInViewport = navigationState.activeSection === 'Home';

		if (!isInViewport) {
			// Pause rendering completely when out of viewport

			globeInstance.pauseAnimation();
		} else {
			// Resume rendering when back in viewport

			globeInstance.resumeAnimation();
		}
	});

	// Handle autoplay state changes based on viewport and config
	$effect(() => {
		// Wait for globe to be initialized before handling autoplay
		if (!globeInstance || !globeInitialized) {
			return;
		}

		const hasLocations = effectiveLocations.length > 0;
		const isInViewport = navigationState.activeSection === 'Home';
		// Use untrack to read pausedByUser to avoid infinite loop
		const pausedByUser = untrack(() => isPausedByInteraction);

		// Only enable autoplay when both: autoplayEnabled prop is true AND globe is in viewport AND not paused by user
		if (autoplayEnabled && hasLocations && autoplay && isInViewport && !pausedByUser) {
			const interval = autoplay.interval ?? 3000;
			const startDelay = autoplay.startDelay ?? 0;

			// Only start if not already playing
			if (!untrack(() => isAutoPlaying)) {
				// On first start, use startDelay; on subsequent starts (after scrolling back), start immediately
				const delay = untrack(() => isFirstAutoplayCycle) ? startDelay : 0;

				untrack(() => startAutoPlay(interval, delay));
			} else {
			}
		} else if (!pausedByUser) {
			// Only stop autoplay automatically when disabled, no locations, or out of viewport
			// Do NOT stop if paused by user interaction (let the resume timer handle it)
			untrack(() => stopAutoPlay());
		} else {
		}

		return () => {
			untrack(() => stopAutoPlay());
		};
	});

	// ============================================================================
	// Keyboard Navigation
	// ============================================================================
	function handleKeyboard(event: KeyboardEvent) {
		// Use untrack to read config without creating dependencies
		const autoplayConfig = untrack(() => mergedConfig.autoplay);

		if (event.key === 'ArrowLeft') {
			prevLocation();
			event.preventDefault();

			// Handle pause on interaction

			if (autoplayConfig?.pauseOnInteraction && isAutoPlaying) {
				pauseAutoPlay();
				if (autoplayConfig.resumeDelay) {
					scheduleResumeAutoPlay(autoplayConfig.interval ?? 3000, autoplayConfig.resumeDelay);
				}
			}
		} else if (event.key === 'ArrowRight') {
			nextLocation();
			event.preventDefault();

			// Handle pause on interaction

			if (autoplayConfig?.pauseOnInteraction && isAutoPlaying) {
				pauseAutoPlay();
				if (autoplayConfig.resumeDelay) {
					scheduleResumeAutoPlay(autoplayConfig.interval ?? 3000, autoplayConfig.resumeDelay);
				}
			}
		}
	}

	// ============================================================================
	// Effects (Svelte 5 $effect)
	// ============================================================================

	// Update globe rings and view when current location changes
	$effect(() => {
		const globe = globeInstance;
		const location = currentLocation;
		const prevLoc = previousLocation;
		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);

		if (!globe || !location) return;

		// First time initialization
		if (!prevLoc) {
			// Use untrack to avoid triggering effect when setting previousLocation
			untrack(() => {
				previousLocation = location;
				displayPreviousLocation = location; // Initialize displayPreviousLocation too
			});

			// Update globe view
			globe.pointOfView(
				{
					lat: parseFloat(String(location.lat)) - (cfg.globe?.latitude ?? 0),
					lng: parseFloat(String(location.lng)),
					altitude: cfg.globe?.altitude ?? 0.25
				},
				cfg.animation?.duration ?? 1000
			);

			return;
		}

		// Location change
		// Compare by actual values, not proxy references
		const locationChanged =
			prevLoc.location !== location.location ||
			prevLoc.lat !== location.lat ||
			prevLoc.lng !== location.lng;

		if (locationChanged) {
			// Capture the OLD previous location for visual transitions
			const visualPrevLoc = prevLoc;

			// Update previousLocation immediately for arc/marker logic
			untrack(() => {
				previousLocation = location;
			});

			// Animate arc from previous to current location
			animateArcTransition(visualPrevLoc, location);

			// Update globe view
			globe.pointOfView(
				{
					lat: parseFloat(String(location.lat)) - (cfg.globe?.latitude ?? 0),
					lng: parseFloat(String(location.lng)),
					altitude: cfg.globe?.altitude ?? 0.25
				},
				cfg.animation?.duration ?? 1000
			);

			// Update displayPreviousLocation AFTER arc completes for smooth point transitions
			const arcDuration = cfg.arcs?.duration ?? 2000;
			setTimeout(() => {
				untrack(() => {
					displayPreviousLocation = location;
				});
			}, arcDuration);
		}
	});

	// Update markers when current location changes
	$effect(() => {
		const loc = currentLocation;
		const prevLoc = previousLocation;
		if (!loc) return;

		const currentLat = parseFloat(String(loc.lat));
		const currentLng = parseFloat(String(loc.lng));

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		const arcDuration = cfg.arcs?.duration ?? 2000;

		// Determine delay: no delay for first location (no arc), otherwise wait for arc to arrive
		const isFirstLocation = !prevLoc;

		// IMMEDIATELY remove active class from all markers
		markerElements.forEach((markerEl, key) => {
			const marker = markerEl.querySelector('.svg-marker');
			const markerWrapper = markerEl.closest('.globe-marker');
			const label = markerWrapper?.querySelector('.location-label') as HTMLElement;
			const windBlast = markerWrapper?.querySelector('.wind-blast') as HTMLElement;
			if (!marker) return;

			const [lat, lng] = key.split(',').map(Number);
			const isThisLocationActive = lat === currentLat && lng === currentLng;

			// Remove active class immediately from all non-active markers
			if (!isThisLocationActive) {
				marker.classList.remove('active');
				if (label) {
					label.classList.remove('opacity-100', 'translate-y-0');
					label.classList.add('opacity-0', 'translate-y-full');
				}
				if (windBlast) {
					windBlast.classList.remove('active');
				}
			}
		});

		// Add active class to new location with appropriate delay
		const delay = isFirstLocation || wasClickNavigation ? 0 : arcDuration;

		setTimeout(() => {
			markerElements.forEach((markerEl, key) => {
				const marker = markerEl.querySelector('.svg-marker');
				const markerWrapper = markerEl.closest('.globe-marker');
				const label = markerWrapper?.querySelector('.location-label') as HTMLElement;
				const windBlast = markerWrapper?.querySelector('.wind-blast') as HTMLElement;
				if (!marker) return;

				const [lat, lng] = key.split(',').map(Number);
				const isActive = lat === currentLat && lng === currentLng;

				// Add active class only if this is the active location
				if (isActive) {
					marker.classList.add('active');
					if (label) {
						label.classList.remove('opacity-0', 'translate-y-full');
						label.classList.add('opacity-100', 'translate-y-0');
					}
					if (windBlast) {
						windBlast.classList.add('active');
					}
				}
			}); // Reset the click navigation flag after use
			untrack(() => {
				wasClickNavigation = false;
			});
		}, delay);
	});

	// Render all labels once when globe initializes, then control visibility via opacity
	let labelsInitialized = $state(false);
	let labelOpacityMap = $state<Map<string, number>>(new Map());

	// Initialize all labels once when globe is ready
	$effect(() => {
		const globe = globeInstance;
		if (!globe || labelsInitialized) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		const labelsConfig = cfg.labels;

		if (!labelsConfig) {
			return;
		}

		// Get all unique ports from all locations
		const allPorts = new Set<string>();
		const portsByKey = new Map<string, Port>();

		effectiveLocations.forEach((location) => {
			const portsForLocation = processedPorts.filter((p: Port) => p.location === location.location);
			portsForLocation.forEach((port: Port) => {
				const key = `${port.lat},${port.lng}`;
				if (!allPorts.has(key)) {
					allPorts.add(key);
					portsByKey.set(key, port);
				}
			});
		});

		// Create label data for all ports (starting with opacity 0)
		const allLabelData = Array.from(portsByKey.values()).map((port) => ({
			lat: parseFloat(String(port.lat)),
			lng: parseFloat(String(port.lng)),
			city: port.city,
			port: port.port,
			orientation: 'bottom',
			opacity: 0 // Start invisible
		}));

		// Initialize opacity map (all labels start at 0)
		const initialOpacityMap = new Map<string, number>();
		allLabelData.forEach((label) => {
			const key = `${label.lat},${label.lng}`;
			initialOpacityMap.set(key, 0);
		});
		labelOpacityMap = initialOpacityMap;

		// Set all labels at once (they'll be invisible initially)
		globe.labelsData(allLabelData);
		labelsInitialized = true;
	});

	// Update label visibility when current location changes
	$effect(() => {
		const globe = globeInstance;
		const ports = currentPorts;
		const loc = currentLocation;
		const prevLoc = previousLocation;

		if (!globe || !loc || !labelsInitialized) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		const labelsConfig = cfg.labels;
		const arcDuration = cfg.arcs?.duration ?? 2000;
		const ringDuration = cfg.rings?.duration ?? 700;

		if (!labelsConfig) {
			return;
		}

		// Determine delay: no delay for first location (no arc), otherwise wait for arc to arrive
		const isFirstLocation = !prevLoc;

		// IMMEDIATELY fade out all labels with smooth animation
		const scene = globe.scene();
		const fadeDuration = 300; // 300ms smooth fade

		scene.traverse((object: any) => {
			if (object.userData && object.userData.__data && object.userData.__data.city) {
				const labelData = object.userData.__data;
				const key = `${labelData.lat},${labelData.lng}`;

				// Smooth fade out using animation frame
				if (object.material && object.material.opacity > 0) {
					const startOpacity = object.material.opacity;
					const startTime = Date.now();

					const animate = () => {
						const elapsed = Date.now() - startTime;
						const progress = Math.min(elapsed / fadeDuration, 1);
						const currentOpacity = startOpacity * (1 - progress);

						if (object.material) {
							object.material.opacity = currentOpacity;
							object.material.transparent = true;
							object.material.needsUpdate = true;
						}

						if (progress < 1) {
							requestAnimationFrame(animate);
						} else {
							labelOpacityMap.set(key, 0);
						}
					};

					requestAnimationFrame(animate);
				} else if (object.material) {
					object.material.opacity = 0;
					object.material.transparent = true;
					object.material.needsUpdate = true;
					labelOpacityMap.set(key, 0);
				}
			}
		});

		// Calculate delay for fading in labels at current location
		const baseDelay = isFirstLocation || wasClickNavigation ? 0 : arcDuration;
		const ringBuffer = isFirstLocation || wasClickNavigation ? 0 : ringDuration + 1000;
		const labelDelay = baseDelay + ringBuffer;

		if (ports.length > 0) {
			setTimeout(() => {
				const scene = globe.scene();

				// Fade in labels for current location with smooth animation
				scene.traverse((object: any) => {
					if (object.userData && object.userData.__data && object.userData.__data.city) {
						const labelData = object.userData.__data;
						const key = `${labelData.lat},${labelData.lng}`;

						// Check if this label belongs to current location's ports
						const shouldShow = ports.some((port) => {
							const portKey = `${parseFloat(String(port.lat))},${parseFloat(String(port.lng))}`;
							return portKey === key;
						});

						if (shouldShow && object.material) {
							const startOpacity = object.material.opacity || 0;
							const startTime = Date.now();

							const animate = () => {
								const elapsed = Date.now() - startTime;
								const progress = Math.min(elapsed / fadeDuration, 1);
								const currentOpacity = startOpacity + (1 - startOpacity) * progress;

								if (object.material) {
									object.material.opacity = currentOpacity;
									object.material.transparent = true;
									object.material.needsUpdate = true;
								}

								if (progress < 1) {
									requestAnimationFrame(animate);
								} else {
									labelOpacityMap.set(key, 1);
								}
							};

							requestAnimationFrame(animate);
						}
					}
				});
			}, labelDelay);
		}
	});

	// Update points when active location changes
	$effect(() => {
		const globe = globeInstance;
		if (!globe) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);

		// POINTS LAYER RENDERING
		// Support both single layer (backward compatible) and multiple layers
		const pointLayers = cfg.points?.layers || [
			{
				altitude: cfg.points?.altitude ?? 0.003,
				base: cfg.points?.base ?? cfg.points?.base ?? 0,
				color: cfg.points?.color ?? '#0066ff',
				radius: cfg.points?.radius ?? 0.25,
				zOffset: 0
			}
		];

		// Check if any layer needs base or if we have multiple layers
		const needsCustomObjects =
			pointLayers.some((layer) => {
				const baseAlt = layer.base ?? layer.base ?? 0;
				return baseAlt > 0;
			}) || pointLayers.length > 1;

		// Use the derived locationsToShow value
		if (needsCustomObjects) {
			// Use 3D Objects Layer for elevated points or multi-layer points
			const layeredLocations = locationsToShow.flatMap((location: Location) =>
				pointLayers.map((layer, layerIndex) => ({
					...location,
					__layerIndex: layerIndex,
					__layerConfig: layer
				}))
			);

			globe.objectsData(layeredLocations);
		} else {
			// Use standard Points Layer
			globe.pointsData(locationsToShow);
		}
	});

	// Recreate globe when media query breakpoint changes
	$effect(() => {
		if (!globeInstance) return;

		// Track all media query breakpoints - use untrack to prevent infinite loops
		const currentMqSm = untrack(() => mq.sm);
		const currentMqMd = untrack(() => mq.md);
		const currentMqLg = untrack(() => mq.lg);
		const currentMqXl = untrack(() => mq.xl);

		// Check if any breakpoint changed
		const breakpointChanged =
			currentMqSm !== lastMqSm ||
			currentMqMd !== lastMqMd ||
			currentMqLg !== lastMqLg ||
			currentMqXl !== lastMqXl;

		if (breakpointChanged) {
			// Don't recreate if WebGL has permanently failed
			if (webGLFailed) {
				// Just update tracking variables without recreating
				lastMqSm = currentMqSm;
				lastMqMd = currentMqMd;
				lastMqLg = currentMqLg;
				lastMqXl = currentMqXl;
				return;
			}

			// Defer recreation to avoid blocking
			queueMicrotask(() => {
				if (!globeInstance) return;

				// Save current camera position before destruction
				const currentPov = globeInstance.pointOfView();

				// Destroy current globe instance
				globeInstance._destructor();
				globeInstance = null;

				// Clear marker elements
				markerElements.clear();

				// Clear all arc cleanup timeouts and active arcs
				arcCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
				arcCleanupTimeouts.clear();
				activeArcs = [];

				// Clear all rings
				activeRings = [];

				// Reset labels initialization flag so labels will be recreated
				labelsInitialized = false;
				labelOpacityMap = new Map();

				// Reset loading flags so fade-in happens again
				globeInitialized = false;
				polygonData = null; // Force re-fetch of polygon data

				// Update tracking variables
				lastMqSm = currentMqSm;
				lastMqMd = currentMqMd;
				lastMqLg = currentMqLg;
				lastMqXl = currentMqXl;

				// Reset previousLocation so the location-centering effect runs again
				previousLocation = null;
				displayPreviousLocation = null;

				// Reset initialization flag to allow re-initialization
				// Note: Do NOT reset initializationAttempts here - we want to track total attempts
				initializationStarted = false;

				// Initialization effect will automatically recreate with new props
			});
		}
	});

	// Handle window resize - update globe dimensions
	$effect(() => {
		// Track window dimensions
		windowWidth;
		windowHeight;

		if (!globeInstance) return;

		// Use untrack to read config without creating dependency
		const cfg = untrack(() => mergedConfig);
		globeInstance
			.width(windowWidth)
			.height(windowHeight)
			.globeOffset([cfg.globe?.left ?? 0, cfg.globe?.top ?? 0]);
		// Note: Do NOT update pointOfView here - let the location change effect handle that
	});

	// ============================================================================
	// Globe Initialization (Svelte 5 $effect - HMR-friendly)
	// ============================================================================

	// Track if initialization has been started to prevent re-initialization
	let initializationStarted = $state(false);

	/**
	 * Check if WebGL is available and working
	 * Returns true if WebGL context can be created, false otherwise
	 */
	function isWebGLAvailable(): boolean {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) {
				console.warn('⚠️ WebGL is not available');
				return false;
			}
			// Check if context is lost
			if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
				if (gl.isContextLost()) {
					console.warn('⚠️ WebGL context is lost');
					return false;
				}
			}
			return true;
		} catch (e) {
			console.warn('⚠️ WebGL check failed:', e);
			return false;
		}
	}

	// Initialize globe once when container and locations are ready
	// Polygons are optional - globe will render without them
	$effect(() => {
		// Globe must be loaded before we can initialize
		if (!Globe) return;

		// If WebGL has permanently failed, don't try again
		if (webGLFailed) return;

		// Get data from config to check what's expected
		const cfg = untrack(() => mergedConfig);
		const polygonUrl = cfg.data?.polygons;

		// Determine if we're waiting for polygon data to load
		// Only wait if polygons were requested as a URL (string) and haven't loaded yet
		const waitingForPolygons = polygonUrl && typeof polygonUrl === 'string' && !polygonData;

		// Wait for required data before creating globe
		if (
			!globeContainer ||
			effectiveLocations.length === 0 ||
			waitingForPolygons ||
			globeInstance ||
			initializationStarted
		) {
			return;
		}

		// Check retry limit before attempting initialization
		if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
			console.error(`❌ Globe initialization failed after ${MAX_INITIALIZATION_ATTEMPTS} attempts. Giving up.`);
			webGLFailed = true;
			// Show fallback UI
			if (globeContainer) {
				globeContainer.innerHTML = `
					<div class="flex items-center justify-center h-full text-white text-center p-4">
						<div>
							<h3 class="text-lg font-semibold mb-2">Unable to load 3D Globe</h3>
							<p class="text-sm opacity-75">Your browser or device may not support WebGL, or GPU resources are unavailable.</p>
						</div>
					</div>
				`;
			}
			return;
		}

		// Check WebGL availability before attempting to create context
		if (!isWebGLAvailable()) {
			console.warn('⚠️ WebGL not available, skipping globe initialization');
			initializationAttempts++;
			// Don't retry immediately - wait a bit in case it's a temporary issue
			setTimeout(() => {
				initializationStarted = false;
			}, 2000);
			return;
		}

		// Mark initialization as started to prevent re-runs
		initializationStarted = true;
		initializationAttempts++;

		// Use requestIdleCallback to defer heavy work, fallback to setTimeout
		const scheduleInit = (callback: () => void) => {
			if ('requestIdleCallback' in window) {
				requestIdleCallback(callback, { timeout: 1000 });
			} else {
				setTimeout(callback, 0);
			}
		};

		scheduleInit(() => {
			// Double-check container exists
			if (!globeContainer) {
				console.error('Globe container is undefined');
				initializationStarted = false;
				return;
			}

			// Double-check WebGL is still available (could have changed)
			if (!isWebGLAvailable()) {
				console.warn('⚠️ WebGL became unavailable before initialization');
				initializationStarted = false;
				return;
			}

			let globe: GlobeInstance | null = null;

			// Initialize Globe.gl (safe to instantiate in browser)
			// Use untrack to prevent re-initialization on config changes
			const cfg = untrack(() => mergedConfig);
			const altitude = cfg.globe?.altitude ?? 0.5;

			try {
				const imageUrl = cfg.globe?.image ?? '';
				const isSVG = imageUrl.toLowerCase().endsWith('.svg');

				globe = new Globe(globeContainer)
					.backgroundColor('rgba(0,0,0,0)')
					.globeOffset([cfg.globe?.left ?? 0, cfg.globe?.top ?? 0])
					.pointOfView({ lat: 0, lng: 0, altitude })
					.showGlobe(true) // Explicitly show the globe
					.showAtmosphere(cfg.atmosphere?.show ?? true)
					.atmosphereColor(cfg.atmosphere?.color ?? 'lightskyblue')
					.atmosphereAltitude(cfg.atmosphere?.altitude ?? 0.15);

				// For SVG, convert to high-res PNG data URL for Globe.gl
				if (imageUrl && isSVG) {
					// Load SVG and convert to ultra-high quality canvas texture (16K resolution!)
					loadSVGAsCanvasTexture(imageUrl)
						.then((canvasTexture) => {
							if (!globe) {
								console.error('❌ Globe instance not available');
								return;
							}

							// Convert the canvas to a data URL that Globe.gl can use
							const canvas = canvasTexture.image as HTMLCanvasElement;
							const dataUrl = canvas.toDataURL('image/png', 1.0); // Maximum quality, no compression

							// Apply using Globe.gl's standard texture loading system
							globe.globeImageUrl(dataUrl);

							// Wait a moment for Globe.gl to apply the texture, then customize material
							setTimeout(() => {
								if (!globe) return;

								// Get SVG-specific options from config
								const svgConfig = cfg.globe?.svg ?? {};
								const color = svgConfig.color ?? 0xffffff;
								const emissive = svgConfig.emissive ?? 0x000000;
								const emissiveIntensity = svgConfig.emissiveIntensity ?? 0;

								// Access and customize the material after Globe.gl sets it up
								const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial;

								// Apply custom material properties for SVG styling
								if (color !== 0xffffff) {
									globeMaterial.color = new THREE.Color(color);
								}
								if (emissive !== 0x000000) {
									globeMaterial.emissive = new THREE.Color(emissive);
									globeMaterial.emissiveIntensity = emissiveIntensity;
								}

								globeMaterial.needsUpdate = true;
							}, 200);
						})
						.catch((error) => {
							console.error('❌ Failed to load SVG texture:', error);
							// Fallback to direct URL loading
							if (globe) {
								globe.globeImageUrl(imageUrl);
							}
						});
				} else if (imageUrl) {
					// For non-SVG images, use standard texture approach

					globe.globeImageUrl(imageUrl);
				} // Set a single, moderately bright ambient light to make rings/labels visible
				const ambientLight = new THREE.AmbientLight(0xffffff, 2);
				globe.lights([ambientLight]);

				// Disable bloom/glow post-processing effect
				const composer = globe.postProcessingComposer();
				if (composer && composer.passes) {
					const bloomPass = composer.passes.find(
						(pass: any) => pass.name === 'UnrealBloomPass' || pass.name === 'BloomPass'
					);
					if (bloomPass) {
						bloomPass.enabled = false;
					}
				}

				// COUNTRY OUTLINES - Use pre-loaded polygon data
				// Data is already loaded before globe initialization
				const data = untrack(() => polygonData);

				if (data && (data.features || data.length > 0)) {
					// HEXAGONS: Base solid countries (low altitude)
					// Check if hexPolygon is enabled (default to true if not specified)
					if (cfg.hexPolygon && cfg.hexPolygon.enabled !== false) {
						globe
							.hexPolygonsData(data.features || data)
							.hexPolygonGeoJsonGeometry('geometry')
							.hexPolygonResolution(cfg.hexPolygon?.resolution ?? 4)
							.hexPolygonMargin(cfg.hexPolygon?.margin ?? 0.15)
							.hexPolygonAltitude(cfg.hexPolygon?.altitude ?? 0)
							.hexPolygonColor(
								typeof cfg.hexPolygon?.color === 'function'
									? cfg.hexPolygon.color
									: () => cfg.hexPolygon?.color ?? '#181e2b'
							)
							.hexPolygonsTransitionDuration(cfg.hexPolygon?.transitionDuration ?? 0);
					} else if (cfg.hexPolygon && cfg.hexPolygon.enabled === false) {
						globe.hexPolygonsData([]); // Clear any existing hexagons
					}

					// POLYGONS: Blue glow effect (higher altitude, transparent cap, glowing sides)
					// Check if polygon is enabled (default to true if not specified)
					if (cfg.polygon && cfg.polygon.enabled !== false) {
						const sideColor = cfg.polygon.sideColor ?? 'rgba(21, 93, 252, 0.6)'; // Blue with 60% opacity
						const capColor = cfg.polygon.capColor ?? 'rgba(0, 0, 0, 0)'; // Fully transparent

						globe
							.polygonsData(data.features || data)
							.polygonCapColor(typeof capColor === 'function' ? capColor : () => capColor)
							.polygonSideColor(typeof sideColor === 'function' ? sideColor : () => sideColor)
							.polygonStrokeColor(() => 'rgba(0,0,0,0)') // No stroke
							.polygonAltitude(cfg.polygon.altitude ?? 0.01)
							.polygonsTransitionDuration(cfg.polygon.transitionDuration ?? 0);
					} else if (cfg.polygon && cfg.polygon.enabled === false) {
						globe.polygonsData([]); // Clear any existing polygons
					}
				}

				// POINTS LAYER RENDERING
				// Support both single layer (backward compatible) and multiple layers
				const pointLayers = cfg.points?.layers || [
					{
						altitude: cfg.points?.altitude ?? 0.003,
						base: cfg.points?.base ?? cfg.points?.base ?? 0, // Support both property names
						color: cfg.points?.color ?? '#0066ff',
						radius: cfg.points?.radius ?? 0.25,
						zOffset: 0
					}
				];

				// Check if any layer needs base or if we have multiple layers
				const needsCustomObjects =
					pointLayers.some((layer) => {
						const baseAlt = layer.base ?? layer.base ?? 0;
						return baseAlt > 0;
					}) || pointLayers.length > 1;

				if (needsCustomObjects) {
					// Use 3D Objects Layer for elevated points or multi-layer points
					// Create a separate object for each layer at each location
					const layeredLocations = locationsToShow.flatMap((loc: Location) =>
						pointLayers.map((layer, layerIndex) => ({
							...loc,
							__layerIndex: layerIndex,
							__layerConfig: layer
						}))
					);

					globe
						.objectsData(layeredLocations)
						.objectLat((d: any) => d.lat)
						.objectLng((d: any) => d.lng)
						.objectAltitude((d: any) => {
							// Support both base and base property names
							const base = d.__layerConfig.base ?? d.__layerConfig.base ?? 0;
							return base;
						})
						.objectThreeObject((d: any) => {
							const layer = d.__layerConfig;
							const pointAltitude = layer.altitude ?? 0.003;
							const pointColor = layer.color ?? '#0066ff';
							const pointRadius = layer.radius ?? 0.25;
							const zOffset = layer.zOffset ?? 0;

							// Create cylinder geometry
							const geometry = new THREE.CylinderGeometry(
								pointRadius, // radiusTop
								pointRadius, // radiusBottom
								pointAltitude * 100, // height (scaled to match globe radius)
								12, // radialSegments
								1, // heightSegments
								false // openEnded
							);

							// Rotate to align with globe surface normal
							geometry.rotateX(Math.PI / 2);

							// Apply z-offset for layering (smaller z renders behind)
							if (zOffset !== 0) {
								geometry.translate(0, 0, zOffset);
							}

							// Create material
							const material = new THREE.MeshBasicMaterial({
								color: pointColor,
								transparent: false,
								depthTest: true,
								depthWrite: true
							});

							const mesh = new THREE.Mesh(geometry, material);

							// Set render order based on layer index (lower index = rendered first = behind)
							mesh.renderOrder = d.__layerIndex;

							return mesh;
						});
				} else {
					// Use standard Points Layer when no base and single layer
					const singleLayer = pointLayers[0];
					globe
						.pointsData(locationsToShow)
						.pointAltitude(() => singleLayer.altitude ?? 0.003)
						.pointColor(() => singleLayer.color ?? '#0066ff')
						.pointRadius(singleLayer.radius ?? 0.25);
				}

				globe
					// HTML - Location markers with click handlers
					.htmlElementsData(effectiveLocations)
					.htmlElement((d: any) => {
						// Check if this is the currently active location (based on currentIndex, not first in array)
						const isActiveLocation =
							currentLocation &&
							parseFloat(String(d.lat)) === parseFloat(String(currentLocation.lat)) &&
							parseFloat(String(d.lng)) === parseFloat(String(currentLocation.lng));

						const wrapper = document.createElement('div');

						// <img
						// 	src="/video/wind-blast.webp" alt="Wind Blast"
						// 	class="absolute none inset-0 w-full h-full object-cover pointer-events-none"
						// >

						wrapper.innerHTML = `
						<div class="globe-marker relative flex flex-col items-center justify-center pointer-events-none ${isActiveLocation ? 'active' : ''}">

							<div class="wind-blast ${isActiveLocation ? 'active' : ''}">
								<i class="absolute block bg-blue-400 inset-0 w-full h-full object-cover pointer-events-none"></i>
							</div>

							<i class="globe-marker-icon pointer-events-auto cursor-pointer block" 
							     data-lat="${d.lat}" 
							     data-lng="${d.lng}">
								
									 <svg xmlns="http://www.w3.org/2000/svg" class="${isActiveLocation ? 'active' : ''} svg svg-marker" fill="none" viewBox="0 0 87 122">
										<path class="stroke" stroke-width="4" d="m43.0833 115.667-1.4842 1.34 1.4842 1.643 1.4842-1.643-1.4842-1.34Zm0 0c1.4842 1.34 1.4846 1.34 1.4851 1.339l.0018-.002.0062-.007.023-.025.0875-.098c.0764-.085.1886-.211.3343-.376.2914-.33.7167-.816 1.2567-1.442 1.0799-1.254 2.6193-3.074 4.4651-5.348 3.6898-4.546 8.6129-10.9197 13.5399-18.2222 4.9232-7.2969 9.8751-15.5579 13.6022-23.8774 3.7154-8.2933 6.2816-16.7923 6.2816-24.5251A41.0836 41.0836 0 0 0 14.033 14.033 41.0835 41.0835 0 0 0 2 43.0833c0 7.7328 2.5662 16.2318 6.2816 24.5251 3.7271 8.3195 8.679 16.5805 13.6021 23.8774 4.9271 7.3025 9.8501 13.6762 13.5399 18.2222 1.8458 2.274 3.3852 4.094 4.4652 5.348.54.626.9652 1.112 1.2566 1.442.1457.165.258.291.3344.376l.0874.098.023.025.0063.007.0017.002c.0006.001.0009.001 1.4851-1.339Z"/>
										<path class="bg fill-white" d="M60 44c0 9.3888-7.6112 17-17 17s-17-7.6112-17-17 7.6112-17 17-17 17 7.6112 17 17Z"/>
										<path class="fg fill-blue-600" d="M43.0833 57.0417a13.9584 13.9584 0 1 1 .0001-27.9168 13.9584 13.9584 0 0 1-.0001 27.9168Zm0-53.0417a39.0837 39.0837 0 0 0-27.6361 11.4472A39.0837 39.0837 0 0 0 4 43.0833c0 29.3125 39.0833 72.5837 39.0833 72.5837s39.0834-43.2712 39.0834-72.5837A39.0834 39.0834 0 0 0 43.0833 4Z"/>
									</svg>
							</i>
							<h4 class="location-label transition-all duration-300 mt-6 lg:mt-4 ${isActiveLocation ? 'opacity-100' : 'translate-y-full opacity-0'}">
								<i class="text-sm md:text-xl icon-${d.flag}"></i>
								<span>${d.location || 'Unknown Location'}</span>
							</h4>
						</div>
					`;

						const marker = wrapper.querySelector('.globe-marker-icon') as HTMLElement;

						// Apply attachment for lifecycle tracking
						const markerKey = createMarkerAttachment(
							parseFloat(String(d.lat)),
							parseFloat(String(d.lng))
						);
						markerKey(marker);

						marker.onclick = () => {
							const idx = effectiveLocations.findIndex(
								(loc) =>
									parseFloat(String(loc.lat)) === parseFloat(String(d.lat)) &&
									parseFloat(String(loc.lng)) === parseFloat(String(d.lng))
							);

							if (idx >= 0) {
								// Set flag to bypass arc delay for immediate activation
								wasClickNavigation = true;
								setActiveLocation(idx);

								// Handle pause on interaction
								const autoplayConfig = mergedConfig.autoplay;

								if (autoplayConfig?.pauseOnInteraction && isAutoPlaying) {
									pauseAutoPlay();
									if (autoplayConfig.resumeDelay) {
										scheduleResumeAutoPlay(
											autoplayConfig.interval ?? 3000,
											autoplayConfig.resumeDelay
										);
									}
								}
							}
						};

						return wrapper.firstElementChild as HTMLElement;
					})
					.htmlLat((d: any) => d.lat)
					.htmlLng((d: any) => d.lng)
					.htmlAltitude(cfg.html?.altitude ?? 0.02);

				// LABELS - Configure labels layer with opacity-based visibility
				const labelsConfig = cfg.labels;
				if (labelsConfig) {
					globe
						.labelsData([]) // Start with no labels (will be populated by effect)
						.labelLat((d: any) => d.lat)
						.labelLng((d: any) => d.lng)
						.labelText((d: any) => d.city || d.port || 'Unknown')
						.labelSize((d: any) => labelsConfig.size ?? 0.5)
						.labelDotRadius((d: any) => labelsConfig.dotRadius ?? 0.2)
						.labelColor((d: any) => {
							// Use opacity from labelOpacityMap to control visibility
							const key = `${d.lat},${d.lng}`;
							const opacity = labelOpacityMap.get(key) ?? 0;
							const baseColor = labelsConfig.textColor ?? '#ffffff';

							// Convert hex/named color to rgba with opacity
							if (baseColor.startsWith('#')) {
								// Hex color
								const r = parseInt(baseColor.slice(1, 3), 16);
								const g = parseInt(baseColor.slice(3, 5), 16);
								const b = parseInt(baseColor.slice(5, 7), 16);
								return `rgba(${r}, ${g}, ${b}, ${opacity})`;
							} else if (baseColor.startsWith('rgb')) {
								// Already rgb/rgba - replace opacity
								return baseColor.replace(/rgba?\([^)]+\)/, (match) => {
									const values = match.match(/\d+/g);
									if (values && values.length >= 3) {
										return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${opacity})`;
									}
									return match;
								});
							} else {
								// Named color - default to white with opacity
								return `rgba(255, 255, 255, ${opacity})`;
							}
						})
						.labelDotOrientation((d: any) => d.orientation || labelsConfig.orientation || 'bottom')
						.labelAltitude(labelsConfig.altitude ?? 0.01)
						.labelResolution(labelsConfig.resolution ?? 20);
				}

				// Set globeInstance BEFORE onGlobeReady so location-centering effect can access it
				globe.controls().enableZoom = false;
				globeInstance = globe;

				// Reset attempt counter on successful initialization
				initializationAttempts = 0;

				// Force a render to make sure the globe is visible
				setTimeout(() => {
					if (globe) {
						globe.renderer().render(globe.scene(), globe.camera());
					}
				}, 100);
			} catch (error) {
				console.error('❌ GLOBE ERROR: Failed to initialize Globe.gl:', error);
				
				// Check if this is a WebGL context error
				const errorMessage = error instanceof Error ? error.message : String(error);
				const isWebGLError = errorMessage.toLowerCase().includes('webgl') || 
				                     errorMessage.toLowerCase().includes('context');
				
				// If we've hit the retry limit or it's definitely a WebGL issue, give up
				if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS || isWebGLError) {
					webGLFailed = true;
					console.error(`❌ Globe permanently disabled after ${initializationAttempts} attempts`);
					
					// Display user-friendly error message
					if (globeContainer) {
						globeContainer.innerHTML = `
						<div class="flex items-center justify-center h-full text-white text-center p-4">
							<div>
								<h3 class="text-lg font-semibold mb-2">Unable to load 3D Globe</h3>
								<p class="text-sm opacity-75">WebGL is not available or has been blocked by your browser.</p>
							</div>
						</div>
					`;
					}
				} else {
					// Allow retry with exponential backoff
					const retryDelay = Math.min(1000 * Math.pow(2, initializationAttempts), 10000);
					console.warn(`⚠️ Globe initialization failed, retrying in ${retryDelay}ms (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`);
					setTimeout(() => {
						initializationStarted = false;
					}, retryDelay);
				}
			}
		}); // End of scheduleInit callback
	});

	// ============================================================================
	// Data Loading Effect - Runs when data needs to be fetched/refetched
	// ============================================================================
	$effect(() => {
		// Get data from config
		const cfg = mergedConfig;
		const locs = cfg.data?.locations;
		const polygonUrl = cfg.data?.polygons;
		const ports = cfg.data?.ports;

		// Check if data is already provided as objects (pre-loaded via props)
		const locationsNeedLoading =
			Array.isArray(locs) && locs.length > 0 && processedLocations.length === 0;
		const polygonsNeedLoading = polygonUrl && typeof polygonUrl === 'object' && !polygonData;
		const portsNeedLoading =
			Array.isArray(ports) && ports.length > 0 && processedPorts.length === 0;

		// Set pre-loaded data immediately (e.g., when globe is recreated after being destroyed)
		if (locationsNeedLoading) {
			processedLocations = locs;
		}
		if (polygonsNeedLoading) {
			polygonData = polygonUrl;
		}
		if (portsNeedLoading) {
			processedPorts = ports;
		}

		// Fetch data from URLs if needed
		const shouldFetchLocations =
			locs && typeof locs === 'string' && processedLocations.length === 0;
		const shouldFetchPolygons = polygonUrl && typeof polygonUrl === 'string' && !polygonData;
		const shouldFetchPorts = ports && typeof ports === 'string' && processedPorts.length === 0;

		if (shouldFetchLocations) {
			fetch(locs as string)
				.then((res) => res.json())
				.then((data) => {
					processedLocations = data;
				})
				.catch((err) => {
					console.error('Failed to fetch locations:', err);
					processedLocations = [];
				});
		}

		if (shouldFetchPolygons) {
			fetch(polygonUrl as string)
				.then((res) => res.json())
				.then((data) => {
					polygonData = data;
				})
				.catch((err) => {
					console.error('Failed to load polygon data:', err);
					polygonData = { features: [] };
				});
		}

		if (shouldFetchPorts) {
			fetch(ports as string)
				.then((res) => res.json())
				.then((data) => {
					processedPorts = data;
				})
				.catch((err) => {
					console.error('Failed to fetch ports:', err);
					processedPorts = [];
				});
		}
	});

	// Load Globe.gl dynamically and setup keyboard navigation
	onMount(async () => {
		// Dynamically import globe.gl (browser-only library)
		// This prevents SSR errors since onMount only runs client-side
		try {
			const GlobeModule = await import('globe.gl');
			Globe = GlobeModule.default;
			console.log('✅ Globe.gl loaded successfully');
		} catch (error) {
			console.error('❌ Failed to load Globe.gl:', error);
			return;
		}

		// Setup keyboard event listener
		window.addEventListener('keydown', handleKeyboard);
	});

	// Cleanup on component unmount
	onDestroy(() => {
		// Remove event listener
		window.removeEventListener('keydown', handleKeyboard);

		// Stop auto-play
		stopAutoPlay();

		// Clear all arc cleanup timeouts
		arcCleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
		arcCleanupTimeouts.clear();
		activeArcs = [];

		// Clear all rings
		activeRings = [];

		// Cleanup globe on component unmount
		if (globeInstance) {
			globeInstance._destructor();
			globeInstance = null;
		}
	});
</script>

<svelte:window
	bind:innerWidth={windowWidth}
	bind:innerHeight={windowHeight}
/>

<div
	class="bleed"
	style="display: contents;"
>
	<div
		class="globe-wrapper absolute inset-0 h-svh w-svw overflow-clip {className}"
		class:fade-in={isGlobeReady}
		class:opacity-0={!isGlobeReady}
	>
		<Image
			bg
			class="globe-atmosphere -z-1 pointer-events-none h-svh w-svw overflow-clip"
			overlay="bg-radial from-primary to-transparent from-30% to-60% translate-y-1/2 scale-x-250 scale-y-95 md:scale-y-100 md:scale-x-125 absolute bottom-0 origin-bottom opacity-60 block"
		/>
		<div
			class="globe-container absolute inset-0 h-full w-full"
			class:pointer-events-auto={isGlobeReady}
			class:pointer-events-none={!isGlobeReady}
			{@attach attachGlobeContainer}
		></div>
	</div>
</div>

<style lang="postcss">
	@reference "@layerd/ui/ui.css";

	/* Content fade-in animation */
	.fade-in {
		opacity: 0;
		transform: translateY(10px);
		animation: fadeInUp 0.8s ease-in-out forwards;
	}

	@keyframes fadeInUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* SVG Marker (active) */
	:global {
		/* wind blast */
		.wind-blast {
			@apply mask-y aspect-2/3 -z-1 scale-x-200 lg:scale-x-175 absolute w-8 origin-bottom translate-y-4 scale-y-0 overflow-clip opacity-0 transition-all duration-300 lg:w-14 lg:translate-y-0;
		}
		.wind-blast.active {
			@apply scale-y-200 lg:scale-y-200 opacity-70;
		}
		.wind-blast.active img {
			@apply hue-rotate-110;
		}
		.globe-marker {
			@apply relative;
		}
		.globe-marker.active {
			@apply !isolate !z-10;
		}

		/* svg marker */
		.svg-marker {
			@apply size-7.5 origin-bottom translate-y-2 cursor-pointer duration-300 lg:size-11 lg:translate-y-0;
		}
		.svg-marker.active {
			@apply inline-block size-14 -translate-y-2 lg:size-24 lg:-translate-y-8;
			animation: float 4s ease-in-out infinite;
		}
		.svg-marker.active .stroke {
			@apply stroke-white;
		}
		.svg-marker.active .bg {
			@apply fill-white;
		}
		.svg-marker.active .fg {
			@apply fill-blue-600;
		}
		.svg-marker:not(.active):hover {
			@apply scale-105;
		}

		/* location label */
		.location-label {
			@apply pointer-events-none absolute top-full flex items-center justify-center gap-2 whitespace-nowrap rounded bg-black/60 p-2 text-xs font-normal font-semibold uppercase text-white md:text-sm;
		}
	}
	/* ---------------------------------------- */
	/* ANIMATIONS                          */
	/* ---------------------------------------- */
	@keyframes float {
		0% {
			transform: translatey(0px);
		}
		50% {
			transform: translatey(-4px);
		}
		100% {
			transform: translatey(0px);
		}
	}

	@keyframes blink {
		0% {
			fill: var(--color-primary);
		}
		50% {
			fill: var(--color-primary);
			opacity: 0.75;
		}
		100% {
			fill: var(--color-primary);
		}
	}
</style>
