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
	<div class="min-h-50 relative overflow-hidden px-4 py-3">
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
				class="card-title text-base-950-50 group-hover:text-primary text-balance text-xl font-semibold"
				h3={title}
			/>
			<Icon
				icon="icon-[mdi--arrow-right]"
				class="text-primary text-xl"
			/>
		</div>
		<Text
			class="card-description text-base-600-300 text-balance text-sm leading-relaxed"
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
		<figure class="-z-1 reflect absolute -bottom-px">
			<img
				class="w-full"
				src={imageSrc}
				alt={title}
			/>

			<div
				class="bg-linear-to-b pointer-events-none absolute inset-0 from-transparent from-60% to-black to-100%"
				style={maskStyle}
			></div>
			<div
				class="bg-linear-to-b to-primary/50 pointer-events-none absolute inset-0 from-transparent from-60% to-100% opacity-0 transition duration-200 will-change-auto group-hover:opacity-100"
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
				class="text-light-light text-xl"
			/>

			{#if subtitle}
				<Text
					class="text-base-300 group-hover:text-primary-100 text-sm"
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
			class="relative mb-6 inline-block text-pretty font-serif text-lg leading-[1.2] before:absolute before:-left-[1.25ch] before:content-['❝'] after:content-['❞'] md:text-xl lg:text-3xl"
		>
			{description}

			<b
				class="border-primary absolute -left-6 bottom-0 top-0 inline-block border-l-4 lg:-left-12 lg:bottom-2 lg:top-2"
			></b>
		</blockquote>
	{/if}

	<!-- Attribution section -->
	<div class="pt-4">
		{#if title}
			<p class="text-base-950-50 text-sm font-medium uppercase lg:text-lg">{title}</p>
		{/if}

		{#if subtitle}
			<p class="text-primary-500 text-sm uppercase lg:text-lg">{subtitle}</p>
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
