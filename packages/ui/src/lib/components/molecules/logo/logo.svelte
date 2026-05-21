<script lang="ts">
	/**
	 * @tags branding, logo, navigation
	 */
	import { Link, Image, Text, type ComponentProps } from '@layerd/ui';

	export interface LogoProps extends Omit<ComponentProps, 'type'> {
		/** Link destination URL */
		href?: string;
		/** Logo image source URL */
		src?: string;
		/** Company/brand name */
		name?: string;
		/** Color scheme */
		variant?: 'color' | 'dark' | 'light';
		/** Logo display type */
		type?: 'icon' | 'logo' | 'both';
		/** Logo color mode - controls SVG colors/gradients */
		mode?: 'light' | 'dark' | 'white' | 'black' | 'current';

		/** Boolean shortcuts for color schemes */
		dark?: boolean;
		light?: boolean;

		/** Boolean shortcuts for types */
		icon?: boolean;
		logo?: boolean;
		both?: boolean;

		/** Content children */
		children?: any;
	}

	let {
		href = '/',
		src,
		name = undefined,
		variant = 'color',
		type = 'both',
		mode = 'dark',
		dark = false,
		light = false,
		icon = false,
		logo = false,
		both = false,
		children,
		...props
	}: LogoProps = $props();

	// Determine final color scheme
	const finalColor = $derived(dark ? 'dark' : light ? 'light' : variant);

	// Determine final type
	const finalType = $derived(icon ? 'icon' : logo ? 'logo' : both ? 'both' : type);

	// Show icon when type is 'icon' or 'both'
	const showIcon = $derived(finalType === 'icon' || finalType === 'both');

	// Show text when type is 'logo' or 'both' AND there's a name to display
	const showText = $derived((finalType === 'logo' || finalType === 'both') && name);

	// Simple logic: if no explicit boolean shortcuts are used, use the type
	const finalShowIcon = $derived(showIcon);
	const finalShowText = $derived(showText);

	// Color classes based on color scheme
	const colorClasses = $derived(
		finalColor === 'dark' ? 'text-black' : finalColor === 'light' ? 'text-white' : 'text-current'
	);

	// Extract class for the icon/image (size classes should apply to the icon, not the wrapper)
	const iconClasses = $derived(props.class || 'size-10');
	const wrapperClasses = $derived('flex items-center gap-3');

	// SVG color configuration based on mode
	const svgColors = $derived.by(() => {
		switch (mode) {
			case 'light':
				return {
					// Bottom piece (base) - light blue gradient
					baseFill: 'url(#gradient-base-light)',
					baseGradient: {
						id: 'gradient-base-light',
						type: 'radial',
						cx: '0',
						cy: '0',
						r: '1',
						gradientUnits: 'userSpaceOnUse',
						gradientTransform: 'translate(175.051 270.396) rotate(90) scale(70.4309 175.051)',
						stops: [
							{ offset: '0', color: '#2A90C7' },
							{ offset: '1', color: '#225487' }
						]
					},
					// Side pieces - light gray
					sideFill: '#A8B2B7',
					// Center piece (trident) - light gray gradient
					centerFill: 'url(#gradient-center-light)',
					centerGradient: {
						id: 'gradient-center-light',
						type: 'linear',
						x1: '171.135',
						y1: '0',
						x2: '171.135',
						y2: '220.945',
						gradientUnits: 'userSpaceOnUse',
						stops: [
							{ offset: '0.503096', color: '#A8B2B7' },
							{ offset: '1', color: '#C8D3D9' }
						]
					}
				};
			case 'dark':
				return {
					// Bottom piece (base) - bright blue gradient
					baseFill: 'url(#gradient-base-dark)',
					baseGradient: {
						id: 'gradient-base-dark',
						type: 'radial',
						cx: '0',
						cy: '0',
						r: '1',
						gradientUnits: 'userSpaceOnUse',
						gradientTransform: 'translate(175.051 251.58) rotate(90) scale(111.415 111.415)',
						stops: [
							{ offset: '0', color: '#84D6FF' },
							{ offset: '1', color: '#176FFF' }
						]
					},
					// Side pieces - medium gray
					sideFill: '#8998AE',
					// Center piece (trident) - white
					centerFill: 'white',
					centerGradient: null
				};
			case 'white':
				return {
					baseFill: 'white',
					baseGradient: null,
					sideFill: 'white',
					centerFill: 'white',
					centerGradient: null
				};
			case 'black':
				return {
					baseFill: 'black',
					baseGradient: null,
					sideFill: 'black',
					centerFill: 'black',
					centerGradient: null
				};
			case 'current':
				return {
					baseFill: 'currentColor',
					baseGradient: null,
					sideFill: 'currentColor',
					centerFill: 'currentColor',
					centerGradient: null
				};
			default:
				return {
					// Default to dark mode
					baseFill: 'url(#gradient-base-dark)',
					baseGradient: {
						id: 'gradient-base-dark',
						type: 'radial',
						cx: '0',
						cy: '0',
						r: '1',
						gradientUnits: 'userSpaceOnUse',
						gradientTransform: 'translate(175.051 251.58) rotate(90) scale(111.415 111.415)',
						stops: [
							{ offset: '0', color: '#84D6FF' },
							{ offset: '1', color: '#176FFF' }
						]
					},
					sideFill: '#8998AE',
					centerFill: 'white',
					centerGradient: null
				};
		}
	});
</script>

<Link
	{href}
	{...props}
	class="logo {colorClasses} {wrapperClasses}"
>
	{#if finalShowIcon}
		{#if src}
			<Image
				{src}
				alt="{name} Logo"
				class={iconClasses}
			/>
		{:else}
			<!-- Trident Cubed SVG Logo -->
			<svg
				class="current-color {iconClasses}"
				id="logo"
				viewBox="0 0 351 341"
				xmlns="http://www.w3.org/2000/svg"
			>
				<!-- Bottom piece (base) -->
				<path
					id="trident-base"
					fill={svgColors.baseFill}
					d="M350.088 199.965C328.864 235.873 286.78 249.415 256.853 252.089C226.949 254.763 198.383 248.078 171.105 234.609C143.828 221.14 112.077 209.762 66.3951 223.255C20.7378 236.724 0 269.788 0 269.788C8.48477 264.585 16.5562 260.063 24.3116 256.173L171.105 340.827L310.727 260.331C313.304 258.969 315.784 257.535 318.142 256.052C351.765 234.876 350.088 199.989 350.088 199.989V199.965ZM160.36 252.916V307.325L51.6136 244.625C90.7554 231.424 122.579 236.384 160.36 252.916ZM181.875 307.325V262.616C201.082 270.42 219.802 274.359 237.379 275.331L181.875 307.35V307.325Z"
				/>

				<!-- Side pieces (4 paths) -->
				<path
					fill={svgColors.sideFill}
					d="M262.591 137.243L294.513 125.378V225.445C302.535 222.042 310.728 217.471 318.168 211.369V82.5656L262.591 137.243Z"
				/>
				<path
					fill={svgColors.sideFill}
					d="M47.7251 211.831V125.378L79.6463 137.243L24.0698 82.5656V224.108C25.3827 223.257 26.7198 222.431 28.0569 221.628C34.3293 217.884 40.9178 214.602 47.7251 211.831Z"
				/>
				<path
					fill={svgColors.sideFill}
					d="M41.9379 72.1334L59.418 89.3218L137.629 43.7131L148.253 10.1387L41.9379 72.1334Z"
				/>
				<path
					fill={svgColors.sideFill}
					d="M300.298 72.1334L193.983 10.1387L204.607 43.7131L282.818 89.3218L300.298 72.1334Z"
				/>

				<!-- Center piece (trident) -->
				<path
					fill={svgColors.centerFill}
					d="M195.591 190.579L181.879 176.867V97.9031H182.949L210.445 124.257L171.133 0L131.821 124.257L159.318 97.9031H160.387V176.867L146.676 190.579L160.387 204.291V211.171C167.195 213.87 173.321 216.739 178.67 219.389C179.74 219.923 180.834 220.434 181.903 220.945V204.291L195.615 190.579H195.591Z"
				/>

				<defs>
					<!-- Base gradient (bottom piece) -->
					{#if svgColors.baseGradient}
						{#if svgColors.baseGradient.type === 'radial'}
							<radialGradient
								id={svgColors.baseGradient.id}
								cx={svgColors.baseGradient.cx}
								cy={svgColors.baseGradient.cy}
								r={svgColors.baseGradient.r}
								gradientUnits={svgColors.baseGradient.gradientUnits}
								gradientTransform={svgColors.baseGradient.gradientTransform}
							>
								{#each svgColors.baseGradient.stops as stop (`${stop.offset}-${stop.color}`)}
									<stop
										offset={stop.offset}
										stop-color={stop.color}
									/>
								{/each}
							</radialGradient>
						{/if}
					{/if}

					<!-- Center gradient (trident) -->
					{#if svgColors.centerGradient}
						<linearGradient
							id={svgColors.centerGradient.id}
							x1={svgColors.centerGradient.x1}
							y1={svgColors.centerGradient.y1}
							x2={svgColors.centerGradient.x2}
							y2={svgColors.centerGradient.y2}
							gradientUnits={svgColors.centerGradient.gradientUnits}
						>
							{#each svgColors.centerGradient.stops as stop (`${stop.offset}-${stop.color}`)}
								<stop
									offset={stop.offset}
									stop-color={stop.color}
								/>
							{/each}
						</linearGradient>
					{/if}
				</defs>
			</svg>
		{/if}
	{/if}

	{#if finalShowText}
		<Text
			disabled
			h1={name}
			class="text-lg font-black uppercase tracking-tight lg:text-xl"
		/>
	{/if}

	{children}
</Link>
