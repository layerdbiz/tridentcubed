<script lang="ts">
	/**
	 * @tags card, content, layout
	 */
	import {
		Component,
		Image,
		Text,
		Icon,
		Button,
		Content,
		Link,
		type ComponentProps,
		type ImageProps
	} from '@layerd/ui';

	export interface CardProps extends ComponentProps {
		variant?: 'service' | 'profile' | 'testimonial';

		// Generic props that work across variants
		title?: string;
		subtitle?: string;
		description?: string;
		label?: string;
		image?: string | Partial<ImageProps>;
		icon?: string;

		children?: any;
	}

	let {
		variant = 'service',
		title = 'Headline',
		subtitle = 'Subtitle',
		description = 'Please add your content here. Keep it short and simple. ',
		label = 'label',
		image = undefined,
		icon = undefined,
		children = undefined,
		...props
	}: CardProps = $props();

	// Extract image source from either string or ImageProps object
	let imageSrc = $derived(typeof image === 'string' ? image : image?.src || undefined);

	// Computed mask style with dynamic URL
	let maskStyle = $derived(
		imageSrc
			? `mask: url(${imageSrc}); -webkit-mask: url(${imageSrc}); mask-size: contain; -webkit-mask-size: contain;`
			: ''
	);
</script>

<!-- ⬜ default ⬛ prop 🟪 snippet 🟦 children -->

<!-- Variants 
::::::::::::::::::::::::::::::::::::::::::::: -->
<!-- Service -->
{#snippet service()}
	<!-- Header section with label -->
	<div class="relative min-h-50 overflow-hidden px-4 py-3">
		<Image
			bg
			src={imageSrc}
			class="card-service-class--img-gray opacity-100 transition duration-300 group-hover:opacity-0"
			image="card-service-image--img-gray grayscale-100 contrast-300 transition duration-300"
			overlay="bg-primary-600/50"
		/>

		<Image
			bg
			src={imageSrc}
			class="card-service-class--img-color opacity-0 transition duration-300 group-hover:opacity-100"
			image="card-service-image--img-color contrast-125 brightness-125 group-hover:scale-110 transition duration-300 will-change-transform"
			overlay="bg-linear-170 to-primary from-transparent from-60%"
		/>

		<!-- 
		<Text
			noprose
			p={label}
			class="card-label absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-sm text-white"
		/> -->
	</div>

	<!-- Content section -->
	<div class="card-content space-y-2 px-6 py-6">
		<div class="inline-flex items-center gap-1.5">
			<Text
				class="card-title text-xl font-semibold text-balance text-base-950-50 group-hover:text-primary"
				h3={title}
			/>
			<Icon
				icon="icon-[mdi--arrow-right]"
				class="text-xl text-primary"
			/>
		</div>
		<Text
			class="card-description text-sm leading-relaxed text-balance text-base-600-300"
			p={description}
		/>

		{#if children}
			{@render children()}
		{/if}
	</div>
{/snippet}

<!-- Profile -->
{#snippet profile()}
	<div
		class="image relative flex aspect-square flex-col items-center justify-end rounded-lg pb-2 md:pb-6 lg:pb-4"
	>
		<figure class="absolute -bottom-px -z-1 reflect">
			<img
				class="w-full"
				src={imageSrc}
				alt={title}
			/>

			<div
				class="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-60% to-black to-100%"
				style={maskStyle}
			></div>
			<div
				class="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-60% to-primary/50 to-100% opacity-0 transition duration-200 will-change-auto group-hover:opacity-100"
				style={maskStyle}
			></div>
		</figure>

		<Link
			href={icon}
			external
			class="group flex flex-col items-center justify-end px-0! pb-2 md:pb-6 lg:pb-4"
		>
			{#if icon}
				<Icon
					icon="icon-[devicon--linkedin] group-hover:brightness-120 transition duration-200 text-2xl"
					class=""
				/>
			{/if}

			<Text
				h4={title}
				class="text-xl text-light-light"
			/>

			{#if subtitle}
				<Text
					class="text-sm text-base-300 group-hover:text-primary-100"
					p={subtitle}
				/>
			{/if}
		</Link>
	</div>
{/snippet}

<!-- Testimonial -->
{#snippet testimonial()}
	<!-- Quote content -->
	{#if description}
		<blockquote
			class="relative mb-6 inline-block font-serif text-lg leading-[1.2] text-pretty before:absolute before:-left-[1.25ch] before:content-['❝'] after:content-['❞'] md:text-xl lg:text-3xl"
		>
			{description}

			<b
				class="absolute top-0 bottom-0 -left-6 inline-block border-l-4 border-primary lg:top-2 lg:bottom-2 lg:-left-12"
			></b>
		</blockquote>
	{/if}

	<!-- Attribution section -->
	<div class="pt-4">
		{#if title}
			<p class="text-sm font-medium text-base-950-50 uppercase lg:text-lg">{title}</p>
		{/if}

		{#if subtitle}
			<p class="text-sm text-primary-500 uppercase lg:text-lg">{subtitle}</p>
		{/if}
	</div>

	{#if children}
		{@render children()}
	{/if}
{/snippet}

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	observe={{
		threshold: 0.1,
		rootMargin: '-45% 0px -45% 0px'
	}}
	{...props}
	class="card card-{variant} group block rounded-xl {props.class}"
>
	{#snippet component({ props })}
		<div
			{...props}
			tabindex="0"
			role="button"
		>
			{#if children && !variant}
				{@render children()}
			{:else if variant === 'profile'}
				{@render profile()}
			{:else if variant === 'testimonial'}
				{@render testimonial()}
			{:else}
				{@render service()}
			{/if}
		</div>
	{/snippet}
</Component>

<style lang="postcss">
	@reference "#ui.css";

	:global {
		.card-service.active .card-service-class--img-gray {
			@apply max-sm:opacity-0;
		}
		.card-service.active .card-service-class--img-color {
			@apply max-sm:opacity-100;
		}
		.card-service.active .card-service-image--img-color {
			@apply max-sm:scale-110;
		}
	}
</style>
