<!-- RailsDemos.svelte -->
<script>
	import { Component } from '@layerd/ui';
	import Demo from './Demo.svelte';

	let {
		componentProps = {},
		modeViews = ['auto'],
		debugView = 'off',
		viewCols = '1',
		placeModifier = '',
		logMode = 'hide'
	} = $props();

	const railsComponentProps = $derived({
		...componentProps,
		grid: 'rails'
	});
	const sharedDemoProps = $derived({
		class: 'demo',
		gap: '0.5rem',
		componentProps: railsComponentProps,
		modeViews,
		debugView,
		viewCols,
		placeModifier,
		inspect: true,
		logMode
	});
	const railTokenClass =
		'rounded-xl bg-sky-100/50 p-3 font-black outline-1 outline-sky-400';
	const railTokenInnerClass =
		'inline-block rounded-md bg-white px-3 py-2 shadow-sm outline-1 outline-slate-300';
</script>

<section class="rails-demos">
	<details class="demo-section" open>
		<summary class="demo-summary">Rails 0. Rail props</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 0a. content rails"><Component rail="content-xs" class="demo" /><Component rail="content-sm" class="demo" /><Component rail="content" class="demo" /><Component rail="content-lg" class="demo" /><Component rail="content-xl" class="demo" /></Demo>
			<Demo {...sharedDemoProps} label="Rails 0b. full and bleed rails"><Component rail="full" class="demo" /><Component rail="bleed" class="demo" /><Component rail="popout" class="demo" /></Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 1. Bleed ranges</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 1a. left bleed rails"><Component rail="bleed-left" class="demo" /><Component rail="bleed-left-sm" class="demo" /><Component rail="bleed-left-lg" class="demo" /></Demo>
			<Demo {...sharedDemoProps} label="Rails 1b. right bleed rails"><Component rail="bleed-right" class="demo" /><Component rail="bleed-right-sm" class="demo" /><Component rail="bleed-right-lg" class="demo" /></Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 2. Nested layout inside rails</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 2a. full rail with friendly layout"><Component rail="full" class="demo min-h-0"><Component class="demo min-h-0" gap="0.5rem">{#snippet left()}{/snippet}{#snippet center()}{/snippet}{#snippet right()}{/snippet}</Component></Component></Demo>
			<Demo {...sharedDemoProps} label="Rails 2b. content rail with friendly layout"><Component rail="content" class="demo min-h-0"><Component class="demo min-h-0" gap="0.5rem">{#snippet left()}{/snippet}{#snippet center()}{/snippet}{#snippet right()}{/snippet}</Component></Component></Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 3. Shell rows</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 3a. row1 row2 row3 shell">
				{#snippet row1()}<Component rail="full" class="demo min-h-0"><Component class="demo min-h-0" gap="0.5rem">{#snippet left()}{/snippet}{#snippet center()}{/snippet}{#snippet right()}{/snippet}</Component></Component>{/snippet}
				{#snippet row2()}<Component rail="content" class="demo" /><Component rail="content-sm" class="demo" /><Component rail="popout" class="demo" /><Component rail="bleed-right" class="demo" /><Component rail="bleed" class="demo" />{/snippet}
				{#snippet row3()}<Component rail="content" class="demo" />{/snippet}
			</Demo>
			<Demo {...sharedDemoProps} label="Rails 3b. row1 only">{#snippet row1()}<Component rail="full" class="demo min-h-0"><Component class="demo min-h-0" gap="0.5rem">{#snippet left()}{/snippet}{#snippet center()}{/snippet}{#snippet right()}{/snippet}</Component></Component>{/snippet}</Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 4. Class utilities</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 4a. plain class rails"><section class="content-xs rounded-xl bg-sky-100/50 p-3 font-black outline-1 outline-sky-400">content-xs</section><section class="content-sm rounded-xl bg-violet-100/50 p-3 font-black outline-1 outline-violet-400">content-sm</section><section class="content rounded-xl bg-indigo-100/50 p-3 font-black outline-1 outline-indigo-400">content</section><section class="popout rounded-xl bg-emerald-100/50 p-3 font-black outline-1 outline-emerald-400">popout</section><section class="bleed rounded-xl bg-orange-100/50 p-3 font-black outline-1 outline-orange-400">bleed</section></Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 5. Real-world combinations</summary>
		<section class="demo-section-content">



			
			<Demo {...sharedDemoProps} label="Rails 5a. full bleed header with content nav">
				<Component tag="header" grid="rails" rail="full" rails="content-xl" class="bg-slate-950 py-4 text-white">
						{#snippet left()}<strong class="inline-flex rounded-full bg-white/10 px-3 py-2">Logo</strong>{/snippet}
						{#snippet center()}<span class="flex flex-wrap gap-3"><a href="/" class="font-black text-sky-300 no-underline">Reports</a><a href="/" class="font-black text-sky-300 no-underline">Photos</a><a href="/" class="font-black text-sky-300 no-underline">Settings</a></span>{/snippet}
						{#snippet right()}<button type="button" class="rounded-full bg-white px-4 py-2 font-black text-slate-950">Export</button>{/snippet}
				</Component>
			</Demo>




			<Demo {...sharedDemoProps} label="Rails 5b. bleed hero with content-lg split">
				<Component tag="section" grid="rails" rail="bleed" class="bg-blue-900 py-8 text-white">
					<Component rail="content-lg" gap="0.75rem" items="center" class="min-h-0">
						{#snippet left()}<section class="space-y-2"><h2 class="text-2xl font-black">Full bleed section</h2><p class="text-slate-200">Content stays aligned to the content-lg rail.</p></section>{/snippet}
						{#snippet right()}<section class="rounded-2xl bg-white/10 p-5 font-black outline-1 outline-white/20">Media / preview</section>{/snippet}
					</Component>
				</Component>
			</Demo>
			<Demo {...sharedDemoProps} label="Rails 5c. article flow with popout and bleed media"><Component tag="section" rail="content" class="rounded-xl bg-white p-4 outline-1 outline-slate-300"><h2 class="mb-1 font-black">Report intro</h2><p>Main copy defaults to the content rail.</p></Component><Component tag="aside" rail="popout" class="rounded-xl bg-amber-50 p-4 outline-1 outline-amber-300"><strong class="block mb-1">Popout note</strong><p>Useful for summaries, warnings, or metadata.</p></Component><Component tag="figure" rail="bleed-right" class="rounded-xl bg-cyan-100 p-4 font-black outline-1 outline-cyan-300"><span>bleed-right media</span></Component><Component tag="section" rail="bleed" class="bg-emerald-100 p-4 font-black">full bleed band</Component></Demo>
			<Demo {...sharedDemoProps} label="Rails 5d. content card inside full bleed band"><Component tag="section" grid="rails" rail="full" class="bg-slate-200 py-8"><Component tag="article" rail="content" class="rounded-2xl bg-white p-4 shadow-lg outline-1 outline-slate-300"><h2 class="mb-1 font-black">Content card</h2><p>The band spans full width, while this card sits on the content rail.</p></Component></Component></Demo>
		</section>
	</details>

	<details class="demo-section" open>
		<summary class="demo-summary">Rails 6. Parent rails defaults</summary>
		<section class="demo-section-content">
			<Demo {...sharedDemoProps} label="Rails 6a. full shell, children default to content"><Component tag="section" grid="rails" rail="full" rails="content" class="bg-sky-100 px-5 py-5"><section class={railTokenClass}><span class={railTokenInnerClass}>default child -&gt; content</span></section><section class={railTokenClass}><span class={railTokenInnerClass}>default child -&gt; content</span></section><section class="bleed rounded-xl bg-sky-100/50 p-3 font-black outline-1 outline-sky-400"><span class={railTokenInnerClass}>explicit child -&gt; bleed</span></section></Component></Demo>
			<Demo {...sharedDemoProps} label="Rails 6b. full shell, children default to popout"><Component tag="section" grid="rails" rail="full" rails="popout" class="bg-orange-100 px-5 py-5"><section class={railTokenClass}><span class={railTokenInnerClass}>default child -&gt; popout</span></section><section class={railTokenClass}><span class={railTokenInnerClass}>default child -&gt; popout</span></section><Component rail="content-sm" class={railTokenClass}><span class={railTokenInnerClass}>explicit component -&gt; content-sm</span></Component></Component></Demo>
			
			
			<Demo {...sharedDemoProps} label="Rails 6c. full header, nav defaults to content">
				<Component tag="header" grid="rails" rail="full" rails="content-xl" class="bg-slate-950 py-4 text-white">
					<Component tag="nav" gap="0.5rem" class=" text-white ">
						{#snippet left()}
							<strong class="inline-flex rounded-full bg-white/10 px-3 py-2">Logo</strong>
						{/snippet}
						{#snippet center()}
							<span class="flex flex-wrap gap-3">
								<a href="/" class="font-black text-sky-300 no-underline">Reports</a>
								<a href="/" class="font-black text-sky-300 no-underline">Photos</a>
								<a href="/" class="font-black text-sky-300 no-underline">Settings</a>
							</span>
						{/snippet}
						{#snippet right()}
							<button type="button" class="rounded-full bg-white px-4 py-2 font-black text-slate-950">Export</button>
						{/snippet}
					</Component>
				</Component>
			</Demo>
			
			
			
			<Demo {...sharedDemoProps} label="Rails 6d. bleed hero, direct snippets default to content-lg"><Component tag="section" grid="rails" rail="bleed" rails="content-lg" gap="0.75rem" class="bg-blue-900 px-5 py-8 text-white">{#snippet left()}<section class="space-y-2"><h2 class="text-2xl font-black">Bleed hero</h2><p class="text-slate-200">The section bleeds full width, but direct snippets should live inside content-lg.</p></section>{/snippet}{#snippet right()}<section class="rounded-2xl bg-white/10 p-5 font-black outline-1 outline-white/20">Preview</section>{/snippet}</Component></Demo>
		</section>
	</details>
</section>