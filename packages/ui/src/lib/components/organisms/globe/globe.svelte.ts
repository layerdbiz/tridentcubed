/**
 * @fileoverview Globe component utilities and types
 * Provides type-safe utilities for the 3D globe visualization component
 */

import type Globe from "globe.gl";
import { mq } from "@layerd/ui";

// ============================================================================
// Types
// ============================================================================

export interface Location {
	id?: string | number;
	location: string;
	lat: number | string;
	lng: number | string;
	flag?: string;
	continent?: string;
	phone?: string;
	email?: string;
}

export interface Port {
	id: string;
	location: string;
	port: string;
	city: string;
	admin_division?: string;
	country: string;
	lat: number | string;
	lng: number | string;
}

// ============================================================================
// New Nested Configuration Interfaces
// ============================================================================

export interface GlobeDataConfig {
	locations?: Location[] | string;
	ports?: Port[] | string;
	hexPolygons?: string | any;
	polygons?: string | any;
}

export interface GlobeAppearanceConfig {
	image?: string;
	width?: number;
	height?: number;
	left?: number;
	top?: number;
	altitude?: number;
	latitude?: number;
	// SVG-specific texture options (only used when image ends with .svg)
	svg?: {
		color?: number; // Hex color tint for SVG texture (e.g., 0x1a1a2e)
		opacity?: number; // Opacity (0-1)
		emissive?: number; // Emissive color for glow effect
		emissiveIntensity?: number; // Intensity of emissive glow (0-1)
	};
}

export interface GlobeAtmosphereConfig {
	show?: boolean;
	color?: string;
	altitude?: number;
}

export interface GlobeHexPolygonConfig {
	enabled?: boolean; // Set to false to completely disable hexagon rendering (performance boost)
	resolution?: number;
	margin?: number;
	color?: string | ((properties: any) => string);
	altitude?: number;
	curvatureResolution?: number;
	transitionDuration?: number;
}

export interface GlobePolygonConfig {
	enabled?: boolean; // Set to false to completely disable polygon glow rendering (performance boost)
	capColor?: string | ((properties: any) => string);
	sideColor?: string | ((properties: any) => string);
	strokeColor?: string | ((properties: any) => string);
	altitude?: number;
	capCurvatureResolution?: number;
	sideResolution?: number;
	transitionDuration?: number;
}

export interface GlobePointLayerConfig {
	altitude?: number; // Height of the point cylinder
	base?: number; // Altitude where the point base starts (raises points from globe surface)
	color?: string;
	radius?: number;
	zOffset?: number; // Small z-axis offset to ensure proper layering (smaller values render behind)
}

export interface GlobePointsConfig {
	altitude?: number; // Height of the point cylinder (default for single layer)
	base?: number; // Altitude where the point base starts (default for single layer)
	color?: string; // Color (default for single layer)
	radius?: number; // Radius (default for single layer)
	layers?: GlobePointLayerConfig[]; // Array of point layers (back to front) - allows multiple points per location
}

export interface GlobeAnimationConfig {
	duration?: number;
}

export interface GlobeHtmlConfig {
	altitude?: number;
}

export interface GlobeAutoplayConfig {
	enabled?: boolean;
	interval?: number;
	pauseOnInteraction?: boolean;
	resumeDelay?: number;
	startDelay?: number; // Delay before first location switch (ms)
}

export interface GlobeArcsConfig {
	color?: string;
	stroke?: number;
	duration?: number;
	dashRelativeLength?: number;
	dashLength?: number;
	dashGap?: number;
	dashInitialGap?: number;
	altitude?: number | null;
	altitudeAutoscale?: number;
	startAltitude?: number;
	endAltitude?: number;
}

export interface GlobeRingsConfig {
	color?: string | ((t: number) => string);
	rings?: number;
	stroke?: number; // NOTE: Not supported by globe.gl API - rings are rendered with constant line width
	radius?: number;
	speed?: number;
	altitude?: number;
	duration?: number;
	repeat?: number;
}

export interface GlobeLabelsConfig {
	size?: number;
	dotRadius?: number;
	textColor?: string;
	dotColor?: string;
	altitude?: number;
	resolution?: number;
	orientation?: string;
}

export interface GlobeConfig {
	data?: GlobeDataConfig;
	globe?: GlobeAppearanceConfig;
	atmosphere?: GlobeAtmosphereConfig;
	hexPolygon?: GlobeHexPolygonConfig;
	polygon?: GlobePolygonConfig;
	points?: GlobePointsConfig;
	animation?: GlobeAnimationConfig;
	html?: GlobeHtmlConfig;
	autoplay?: GlobeAutoplayConfig;
	arcs?: GlobeArcsConfig;
	rings?: GlobeRingsConfig;
	labels?: GlobeLabelsConfig;
}

export interface GlobeProps {
	startLocationId?: string | number;
	config?: GlobeConfig;
	class?: string;

	// Direct prop overrides for convenience
	data?: GlobeDataConfig;
	globe?: GlobeAppearanceConfig;
	atmosphere?: GlobeAtmosphereConfig;
	hexPolygon?: GlobeHexPolygonConfig;
	polygon?: GlobePolygonConfig;
	points?: GlobePointsConfig;
	animation?: GlobeAnimationConfig;
	html?: GlobeHtmlConfig;
	autoplay?: GlobeAutoplayConfig;
	arcs?: GlobeArcsConfig;
	rings?: GlobeRingsConfig;
	labels?: GlobeLabelsConfig;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Creates default globe configuration with responsive values
 * Uses mq.sm to determine if we're on a small screen (< 768px)
 */
export function createDefaultConfig(
	width: number = typeof window !== "undefined" ? window.innerWidth : 1920,
	height: number = typeof window !== "undefined" ? window.innerHeight : 1080,
): GlobeConfig {
	// Responsive values based on screen size
	const globeWidth = width;
	const globeHeight = height;
	const globeLeft = 0;
	const globeTop = mq.sm ? height * 0.9 : height * 1.72;

	// Camera settings
	const povAltitude = mq.sm ? 0.8 : 0.2;
	const povLatitude = mq.sm ? 36 : 21;

	// Atmosphere settings
	const atmosphereAltitude = mq.sm ? 0 : 0.15;

	// Polygon settings
	const polygonAltitude = 0.005;

	// HTML marker settings
	const htmlAltitude = 0.02;

	return {
		globe: {
			// image: "/images/skins/earth-blue-marble.jpg",
			width: globeWidth,
			height: globeHeight,
			left: globeLeft,
			top: globeTop,
			altitude: povAltitude,
			latitude: povLatitude,
		},
		atmosphere: {
			show: true,
			color: "lightskyblue",
			altitude: atmosphereAltitude,
		},
		points: {
			altitude: 0.003,
			color: "rgba(0, 0, 255, 1)",
		},
		polygon: {
			altitude: polygonAltitude,
		},
		animation: {
			duration: 1000,
		},
		html: {
			altitude: htmlAltitude,
		},
	};
}

/**
 * Deep merge multiple globe configurations.
 * The last object in the array has the highest precedence.
 */
export function mergeConfigs(
	...configs: (GlobeConfig | undefined)[]
): GlobeConfig {
	const result: GlobeConfig = {};
	for (const config of configs) {
		if (!config) continue;
		result.data = { ...result.data, ...config.data };
		result.globe = { ...result.globe, ...config.globe };
		result.atmosphere = { ...result.atmosphere, ...config.atmosphere };
		result.hexPolygon = { ...result.hexPolygon, ...config.hexPolygon };
		result.polygon = { ...result.polygon, ...config.polygon };
		result.points = { ...result.points, ...config.points };
		result.animation = { ...result.animation, ...config.animation };
		result.html = { ...result.html, ...config.html };
		result.labels = { ...result.labels, ...config.labels };
		result.autoplay = { ...result.autoplay, ...config.autoplay };
		result.arcs = { ...result.arcs, ...config.arcs };
		result.rings = { ...result.rings, ...config.rings };
	}
	return result;
}

/**
 * Easing functions for animations
 */
export const easing = {
	inQuad: (t: number) => t * t,
	inCubic: (t: number) => t * t * t,
	inPower: (t: number, power = 2) => Math.pow(t, power),
	outQuad: (t: number) => t * (2 - t),
	outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
	inOutQuad: (
		t: number,
	) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
	inOutCubic: (
		t: number,
	) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
	inOutPower: (t: number, power = 3) =>
		t < 0.5 ? Math.pow(2 * t, power) / 2 : 1 - Math.pow(-2 * t + 2, power) / 2,
};

/**
 * Format number with appropriate notation
 */
export function formatNumber(num: number): string {
	return new Intl.NumberFormat("en-US", { notation: "compact" }).format(num);
}

/**
 * Animate counter with easing
 */
export function animateCounter(
	element: HTMLElement,
	start = 0,
	end: number,
	duration = 2000,
	easingFn = easing.inOutCubic,
	thresholds = { early: 0.85, display: 0.95 },
) {
	let startTime: number | null = null;
	let lastValue = start;

	const step = (timestamp: number) => {
		if (!startTime) startTime = timestamp;
		const linearProgress = Math.min((timestamp - startTime) / duration, 1);

		let currentValue: number;

		if (linearProgress >= thresholds.display) {
			currentValue = end;
			element.textContent = formatNumber(currentValue);
			return;
		} else if (linearProgress >= thresholds.early) {
			const remainingFraction = (linearProgress - thresholds.early) /
				(thresholds.display - thresholds.early);
			const smoothApproach = easing.outCubic(remainingFraction);
			const valueAtEarlyThreshold = Math.floor(
				easing.inOutCubic(thresholds.early) * (end - start) + start,
			);
			const gap = end - valueAtEarlyThreshold;
			currentValue = Math.floor(valueAtEarlyThreshold + gap * smoothApproach);
		} else {
			const easedProgress = easingFn(linearProgress);
			currentValue = Math.floor(easedProgress * (end - start) + start);
		}

		currentValue = Math.min(Math.max(lastValue, currentValue), end);
		lastValue = currentValue;

		element.textContent = formatNumber(currentValue);

		if (linearProgress < 1) {
			requestAnimationFrame(step);
		}
	};

	requestAnimationFrame(step);
}

/**
 * SVG marker template
 */
export const markerSVG =
	`<svg xmlns="http://www.w3.org/2000/svg" class="svg svg-marker" fill="none" viewBox="0 0 87 122">
	<path class="stroke" stroke-width="4" d="m43.0833 115.667-1.4842 1.34 1.4842 1.643 1.4842-1.643-1.4842-1.34Zm0 0c1.4842 1.34 1.4846 1.34 1.4851 1.339l.0018-.002.0062-.007.023-.025.0875-.098c.0764-.085.1886-.211.3343-.376.2914-.33.7167-.816 1.2567-1.442 1.0799-1.254 2.6193-3.074 4.4651-5.348 3.6898-4.546 8.6129-10.9197 13.5399-18.2222 4.9232-7.2969 9.8751-15.5579 13.6022-23.8774 3.7154-8.2933 6.2816-16.7923 6.2816-24.5251A41.0836 41.0836 0 0 0 14.033 14.033 41.0835 41.0835 0 0 0 2 43.0833c0 7.7328 2.5662 16.2318 6.2816 24.5251 3.7271 8.3195 8.679 16.5805 13.6021 23.8774 4.9271 7.3025 9.8501 13.6762 13.5399 18.2222 1.8458 2.274 3.3852 4.094 4.4652 5.348.54.626.9652 1.112 1.2566 1.442.1457.165.258.291.3344.376l.0874.098.023.025.0063.007.0017.002c.0006.001.0009.001 1.4851-1.339Z"/>
	<path class="bg" d="M60 44c0 9.3888-7.6112 17-17 17s-17-7.6112-17-17 7.6112-17 17-17 17 7.6112 17 17Z"/>
	<path class="fg" d="M43.0833 57.0417a13.9584 13.9584 0 1 1 .0001-27.9168 13.9584 13.9584 0 0 1-.0001 27.9168Zm0-53.0417a39.0837 39.0837 0 0 0-27.6361 11.4472A39.0837 39.0837 0 0 0 4 43.0833c0 29.3125 39.0833 72.5837 39.0833 72.5837s39.0834-43.2712 39.0834-72.5837A39.0834 39.0834 0 0 0 43.0833 4Z"/>
</svg>`;
