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
		'rounded-2xl border border-slate-300/60 p-4 shadow-sm active:ring-2 active:ring-emerald-400/50 active:ring-offset-2';
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
	<Component tag="section" class={shellClass}>
		<Component mode={featureMode} gap="1rem">
			{#snippet left()}
				<div class="space-y-3">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">
						Helper feature lab
					</p>
					<div class="space-y-2">
						<h1 class="text-3xl font-black tracking-tight text-slate-950">
							Component helper parity tests
						</h1>
						<p class="text-sm leading-6 text-slate-600">
							This page keeps the same feature sections, but the layout is now built with
							the play component runtime itself: rails, layout snippets, theme props,
							and the shared mq helper.
						</p>
					</div>
				</div>
			{/snippet}

			{#snippet right()}
				<Component color={mqComponentColor} appearance={mqComponentAppearance} class={cardClass}>
					mq-driven theme preview: {screenModeLabel}
				</Component>
			{/snippet}
		</Component>
	</Component>

	<Component tag="section" class={shellClass}>
		<Component mode={featureMode} gap="1rem">
			{#snippet top()}
				<div class="space-y-2">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">01</p>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Total</h2>
					<p class="text-sm leading-6 text-slate-600">
						Verify repeat counts for plain rendering and a rails-driven example using the
						actual layout snippets.
					</p>
				</div>
			{/snippet}

			{#snippet left()}
				<div class="space-y-3">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">plain repeat</p>
					<div class="space-y-3">
						<Component total="4" class={cardClass}>repeat me</Component>
					</div>
				</div>
			{/snippet}

			{#snippet right()}
				<div class="space-y-3">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">rails + snippets</p>
					<Component grid="rails" rails="content-lg" class="rounded-3xl border border-slate-300/60 p-3 shadow-sm">
						{#snippet bg()}
							<div class="rounded-2xl bg-slate-100/75"></div>
						{/snippet}

						{#snippet center()}
							<Component mode={featureMode} gap="0.75rem">
								{#snippet left()}
									<Component color="primary" appearance="lite" class={cardClass}>left</Component>
								{/snippet}
								{#snippet center()}
									<Component color="secondary" appearance="outline" class={cardClass}>center</Component>
								{/snippet}
								{#snippet right()}
									<Component color="accent" appearance="ghost" class={cardClass}>right</Component>
								{/snippet}
							</Component>
						{/snippet}
					</Component>
				</div>
			{/snippet}
		</Component>
	</Component>

	<Component tag="section" class={shellClass}>
		<Component gap="0.85rem">
			{#snippet top()}
				<div class="space-y-2">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">02</p>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Theme and disabled</h2>
					<p class="text-sm leading-6 text-slate-600">
						These examples rely on the wrapper theme props directly, with only local skinning
						classes layered on top.
					</p>
				</div>
			{/snippet}

			{#snippet a1()}
				<Component
					tag="button"
					disabled
					class={joinClasses(cardClass, '[[disabled]]:cursor-not-allowed [[disabled]]:opacity-60 [[disabled]]:saturate-50')}
				>
					disabled button
				</Component>
			{/snippet}
			{#snippet b1()}
				<Component color="primary" appearance="heavy" class={cardClass}>heavy primary</Component>
			{/snippet}
			{#snippet c1()}
				<Component color="secondary" appearance="outline" class={cardClass}>outline secondary</Component>
			{/snippet}
			{#snippet a2()}
				<Component accent appearance="ghost" position="right" class={cardClass}>ghost accent right</Component>
			{/snippet}
			{#snippet b2()}
				<Component base invert appearance="heavy" class={cardClass}>heavy invert</Component>
			{/snippet}
			{#snippet c2()}
				<Component color="neutral" appearance="glass" class={cardClass}>glass neutral</Component>
			{/snippet}
			{#snippet a3()}
				<Component color="accent" appearance="gradient" class={cardClass}>gradient accent</Component>
			{/snippet}
			{#snippet b3()}
				<Component class={joinClasses(cardClass, 'rounded-3xl border-2 border-dashed border-slate-400 shadow-none')}>
					manual classes still win
				</Component>
			{/snippet}
		</Component>
	</Component>

	<Component tag="section" class={shellClass}>
		<Component mode={featureMode} gap="1rem">
			{#snippet top()}
				<div class="space-y-2">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">03</p>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Position and tag passthrough</h2>
					<p class="text-sm leading-6 text-slate-600">
						Use the layout snippets for the section structure while still verifying text
						alignment props and element passthrough.
					</p>
				</div>
			{/snippet}

			{#snippet left()}
				<Component color="primary" appearance="outline" position="left" class={cardClass}>left aligned</Component>
			{/snippet}
			{#snippet center()}
				<Component color="secondary" appearance="outline" position="center" class={cardClass}>center aligned</Component>
			{/snippet}
			{#snippet right()}
				<Component color="accent" appearance="outline" position="right" class={cardClass}>right aligned</Component>
			{/snippet}
			{#snippet bottom()}
				<Component tag="a" href="/demo" color="neutral" appearance="outline" class={joinClasses(cardClass, 'no-underline')}>
					anchor passthrough
				</Component>
			{/snippet}
		</Component>
	</Component>

	<Component tag="section" class={joinClasses(shellClass, 'overflow-clip')}>
		<Component gap="1rem">
			{#snippet top()}
				<div class="space-y-2">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">04</p>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">Observe</h2>
					<p class="text-sm leading-6 text-slate-600">
						Scroll through this section and watch the active states update on both the default
						wrapper path and the custom snippet renderer path.
					</p>
				</div>
			{/snippet}

			{#snippet center()}
				<Component gap="1rem">
					{#snippet top()}
						<Component color="neutral" appearance="outline" class="rounded-2xl border-dashed px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-none">
							scroll into the cards
						</Component>
					{/snippet}
					{#snippet left()}
						<Component observe class={observeCardClass}>default wrapper observe</Component>
					{/snippet}
					{#snippet center()}
						<Component
							observe={{ threshold: 0.5, rootMargin: '0px 0px -20% 0px' }}
							component={featureRenderer}
							class={cardClass}
						>
							custom snippet path
						</Component>
					{/snippet}
					{#snippet right()}
						<Component observe total="2" class={observeCardClass}>total + observe</Component>
					{/snippet}
					{#snippet bottom()}
						<Component color="neutral" appearance="outline" class="rounded-2xl border-dashed px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-none">
							keep scrolling
						</Component>
					{/snippet}
				</Component>
			{/snippet}
		</Component>
	</Component>

	<Component tag="section" class={shellClass}>
		<Component gap="1rem">
			{#snippet top()}
				<div class="space-y-2">
					<p class="text-xs font-black uppercase tracking-[0.24em] text-sky-700">05</p>
					<h2 class="text-2xl font-black tracking-tight text-slate-950">MQ utility</h2>
					<p class="text-sm leading-6 text-slate-600">
						The indicator cards, the layout mode, and the theme preview all use the shared
						mq helper directly.
					</p>
				</div>
			{/snippet}

			{#snippet center()}
				<Component gap="0.75rem">
					{#snippet a1()}
						<Component color={mqCards[0].active ? 'primary' : 'neutral'} appearance={mqCards[0].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[0].label}: {mqCards[0].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet b1()}
						<Component color={mqCards[1].active ? 'primary' : 'neutral'} appearance={mqCards[1].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[1].label}: {mqCards[1].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet c1()}
						<Component color={mqCards[2].active ? 'primary' : 'neutral'} appearance={mqCards[2].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[2].label}: {mqCards[2].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet a2()}
						<Component color={mqCards[3].active ? 'primary' : 'neutral'} appearance={mqCards[3].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[3].label}: {mqCards[3].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet b2()}
						<Component color={mqCards[4].active ? 'primary' : 'neutral'} appearance={mqCards[4].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[4].label}: {mqCards[4].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet c2()}
						<Component color={mqCards[5].active ? 'primary' : 'neutral'} appearance={mqCards[5].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[5].label}: {mqCards[5].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet a3()}
						<Component color={mqCards[6].active ? 'primary' : 'neutral'} appearance={mqCards[6].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[6].label}: {mqCards[6].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet b3()}
						<Component color={mqCards[7].active ? 'primary' : 'neutral'} appearance={mqCards[7].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[7].label}: {mqCards[7].active ? 'true' : 'false'}
						</Component>
					{/snippet}
					{#snippet c3()}
						<Component color={mqCards[8].active ? 'primary' : 'neutral'} appearance={mqCards[8].active ? 'lite' : 'outline'} class="rounded-full px-4 py-3 text-sm font-semibold shadow-none">
							{mqCards[8].label}: {mqCards[8].active ? 'true' : 'false'}
						</Component>
					{/snippet}
				</Component>
			{/snippet}

			{#snippet bottom()}
				<Component mode={featureMode} gap="1rem">
					{#snippet left()}
						<Component color={mqComponentColor} appearance={mqComponentAppearance} class={cardClass}>
							mq reactive card: {screenModeLabel}
						</Component>
					{/snippet}
					{#snippet right()}
						<Component color={mq.landscape ? 'accent' : 'neutral'} appearance={mq.landscape ? 'glass' : 'outline'} class={cardClass}>
							orientation: {mq.landscape ? 'landscape' : 'portrait'}
						</Component>
					{/snippet}
				</Component>
			{/snippet}
		</Component>
	</Component>
</Component>