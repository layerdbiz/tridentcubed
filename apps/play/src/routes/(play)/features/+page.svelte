<script lang="ts">
	import {
		Component,
		type ComponentAppearance,
		type ComponentColor,
		type ComponentRenderArgs
	} from '$lib';
	import { mq } from '@layerd/ui/utils/mq.svelte.ts';

	const featureMode = $derived(mq.sm || mq.md ? 'compact' : 'grid');

	const screenModeLabel = $derived(
		mq.xxl
			? 'xxl'
			: mq.xl
				? 'xl'
				: mq.lg
					? 'lg'
					: mq.md
						? 'md'
						: mq.sm
							? 'sm'
							: 'base'
	);

	const mqComponentColor = $derived<ComponentColor>(
		mq.xxl
			? 'primary'
			: mq.xl
				? 'neutral'
				: mq.lg
					? 'accent'
					: mq.md
						? 'secondary'
						: mq.sm
							? 'primary'
							: 'base'
	);

	const mqComponentAppearance = $derived<ComponentAppearance>(
		mq.xxl
			? 'gradient'
			: mq.xl
				? 'glass'
				: mq.lg
					? 'ghost'
					: mq.md
						? 'outline'
						: mq.sm
							? 'lite'
							: 'outline'
	);

	const shellClass =
		'rounded-3xl border border-slate-300/30 bg-white/85 p-5 shadow-xl shadow-slate-950/5';
	const cardClass = 'rounded-2xl border border-slate-300/60 p-4 shadow-sm';
	const observeCardClass =
		'rounded-2xl border border-slate-300/60 bg-white p-4 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 [&.active]:-translate-y-0.5 [&.active]:border-emerald-400/60 [&.active]:bg-emerald-50/60 [&.active]:ring-2 [&.active]:ring-emerald-400/50 [&.active]:ring-offset-2';
	const mqCards = $derived([
		{ label: 'sm', active: mq.sm },
		{ label: 'md', active: mq.md },
		{ label: 'lg', active: mq.lg },
		{ label: 'xl', active: mq.xl },
		{ label: 'xxl', active: mq.xxl },
		{ label: 'portrait', active: mq.portrait },
		{ label: 'landscape', active: mq.landscape },
		{ label: 'min lg', active: mq.lg || mq.xl || mq.xxl },
		{ label: 'between md/xl', active: mq.md || mq.lg }
	]);

	function joinClasses(...classNames: Array<string | false | null | undefined>): string {
		return classNames.filter(Boolean).join(' ');
	}

	function getRendererClassName(args: ComponentRenderArgs): string {
		const className = typeof args.props.class === 'string' ? args.props.class : '';
		return joinClasses(
			'rounded-2xl border border-emerald-400/40 p-4 text-left shadow-sm',
			className,
			args.observe?.isIntersecting && 'ring-2 ring-emerald-400/50 ring-offset-2'
		);
	}
</script>

{#snippet featureRenderer(args: ComponentRenderArgs)}
	<button type="button" {...args.props} class={getRendererClassName(args)}>
		<span class="block text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
			custom snippet renderer
		</span>
		<span class="mt-2 block font-semibold text-slate-950">
			{#if args.content}
				{@render args.content('custom snippet path')}
			{:else}
				custom snippet path
			{/if}
		</span>
		<span class="mt-2 block text-sm text-slate-600">
			observe: {args.observe?.isIntersecting ? 'active' : 'idle'}
		</span>
	</button>
{/snippet}

<Component
	tag="main"
	grid="rails"
	rails="content-xl"
	gap="1.5rem"
	class="bg-linear-to-br from-sky-100/40 via-white to-slate-100/80 px-4 py-6 md:px-6"
>
	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={shellClass}>
		<header class="content space-y-3">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">Helper feature lab</p>
			<div class="space-y-2">
				<h1 class="text-3xl font-black tracking-tight text-slate-950">Component helper parity tests</h1>
				<p class="text-sm leading-6 text-slate-600">
					This route now lets rails do the page-level placement work. The feature blocks stay the
					same, but the section structure is plain flow plus rail spans instead of page-level
					layout snippets.
				</p>
			</div>
		</header>

		<Component rail="popout" color={mqComponentColor} appearance={mqComponentAppearance} class={cardClass}>
			mq-driven theme preview: {screenModeLabel} / layout mode: {featureMode}
		</Component>
	</Component>

	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={shellClass}>
		<header class="content space-y-2">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">01</p>
			<h2 class="text-2xl font-black tracking-tight text-slate-950">Total</h2>
			<p class="text-sm leading-6 text-slate-600">
				Verify repeat counts for plain rendering and a rails-led example where child spans fall
				into place without page-level snippets.
			</p>
		</header>

		<div class="content grid gap-4 xl:grid-cols-2">
			<div class="space-y-3">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">plain repeat</p>
				<div class="space-y-3">
					<Component total="4" class={cardClass}>repeat me</Component>
				</div>
			</div>

			<div class="space-y-3">
				<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">rails flow</p>
				<Component tag="div" grid="rails" rails="content-lg" gap="0.75rem" class="rounded-3xl border border-slate-300/60 p-3 shadow-sm">
					<Component rail="content-sm" color="primary" appearance="lite" class={cardClass}>content-sm</Component>
					<Component rail="content" color="secondary" appearance="outline" class={cardClass}>content</Component>
					<Component rail="popout" color="accent" appearance="ghost" class={cardClass}>popout</Component>
				</Component>
			</div>
		</div>
	</Component>

	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={shellClass}>
		<header class="content space-y-2">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">02</p>
			<h2 class="text-2xl font-black tracking-tight text-slate-950">Theme and disabled</h2>
			<p class="text-sm leading-6 text-slate-600">
				These examples rely on the wrapper theme props directly, with only local skinning classes
				layered on top.
			</p>
		</header>

		<div class="content grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Component tag="button" disabled class={joinClasses(cardClass, '[[disabled]]:cursor-not-allowed [[disabled]]:opacity-60 [[disabled]]:saturate-50')}>
				disabled button
			</Component>
			<Component color="primary" appearance="heavy" class={cardClass}>heavy primary</Component>
			<Component color="secondary" appearance="outline" class={cardClass}>outline secondary</Component>
			<Component accent appearance="ghost" position="right" class={cardClass}>ghost accent right</Component>
			<Component base invert appearance="heavy" class={cardClass}>heavy invert</Component>
			<Component color="neutral" appearance="glass" class={cardClass}>glass neutral</Component>
			<Component color="accent" appearance="gradient" class={cardClass}>gradient accent</Component>
			<Component class={joinClasses(cardClass, 'rounded-3xl border-2 border-dashed border-slate-400 shadow-none')}>
				manual classes still win
			</Component>
		</div>
	</Component>

	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={shellClass}>
		<header class="content space-y-2">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">03</p>
			<h2 class="text-2xl font-black tracking-tight text-slate-950">Position and tag passthrough</h2>
			<p class="text-sm leading-6 text-slate-600">
				Keep the section structure simple and use the wrapper props directly for alignment and
				element passthrough checks.
			</p>
		</header>

		<div class="content grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Component color="primary" appearance="outline" position="left" class={cardClass}>left aligned</Component>
			<Component color="secondary" appearance="outline" position="center" class={cardClass}>center aligned</Component>
			<Component color="accent" appearance="outline" position="right" class={cardClass}>right aligned</Component>
			<Component tag="a" href="/demo" color="neutral" appearance="outline" class={joinClasses(cardClass, 'no-underline')}>
				anchor passthrough
			</Component>
		</div>
	</Component>

	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={joinClasses(shellClass, 'overflow-clip')}>
		<header class="content space-y-2">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">04</p>
			<h2 class="text-2xl font-black tracking-tight text-slate-950">Observe</h2>
			<p class="text-sm leading-6 text-slate-600">
				Scroll through this section and watch the active states update on both the default wrapper
				path and the custom snippet renderer path.
			</p>
		</header>

		<Component rail="content" color="neutral" appearance="outline" class="rounded-2xl border-dashed px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-none">
			scroll into the cards
		</Component>

		<div class="content grid gap-4 lg:grid-cols-3">
			<Component observe class={observeCardClass}>default wrapper observe</Component>
			<Component observe={{ threshold: 0.5, rootMargin: '0px 0px -20% 0px' }} component={featureRenderer} class={cardClass}>
				custom snippet path
			</Component>
			<Component observe total="2" class={observeCardClass}>total + observe</Component>
		</div>

		<Component rail="content" color="neutral" appearance="outline" class="rounded-2xl border-dashed px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-none">
			keep scrolling
		</Component>
	</Component>

	<Component tag="section" rail="content-full" grid="rails" rails="content-lg" gap="1rem" class={shellClass}>
		<header class="content space-y-2">
			<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">05</p>
			<h2 class="text-2xl font-black tracking-tight text-slate-950">MQ utility</h2>
			<p class="text-sm leading-6 text-slate-600">
				The indicator cards, the layout mode label, and the theme preview all use the shared mq
				helper directly.
			</p>
		</header>

		<div class="content grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each mqCards as card (card.label)}
				<Component
					color={card.active ? 'primary' : 'neutral'}
					appearance={card.active ? 'lite' : 'outline'}
					class="rounded-full px-4 py-3 text-sm font-semibold shadow-none"
				>
					{card.label}: {card.active ? 'true' : 'false'}
				</Component>
			{/each}
		</div>

		<div class="popout grid gap-4 md:grid-cols-2">
			<Component color={mqComponentColor} appearance={mqComponentAppearance} class={cardClass}>
				mq reactive card: {screenModeLabel}
			</Component>
			<Component color={mq.landscape ? 'accent' : 'neutral'} appearance={mq.landscape ? 'glass' : 'outline'} class={cardClass}>
				orientation: {mq.landscape ? 'landscape' : 'portrait'}
			</Component>
		</div>
	</Component>
</Component>