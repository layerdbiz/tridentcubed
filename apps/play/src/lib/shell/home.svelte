<!-- play.tridentcubed.com's first page (#342): everything on play by kind, and how to add one. Library pieces only. -->
<script lang="ts">
	import { Button, Component } from '@layerd/ui';
	import Bar from './bar.svelte';
	import { SECTIONS } from './entries';

	function countOf(kind: string, count: number): string {
		if (kind === 'library') return 'page';
		const word = kind === 'component' ? 'variant' : 'option';
		return `${count} ${word}${count === 1 ? '' : 's'}`;
	}
</script>

<svelte:head>
	<title>Trident Cubed Play</title>
</svelte:head>

<Bar title="Trident Cubed Play" />

<Component
	tag="main"
	class="theme-heavy min-h-0 flex-1 overflow-y-auto px-4 pt-6"
	style="padding-bottom: max(3rem, env(safe-area-inset-bottom, 0px))"
>
	<div class="mx-auto grid max-w-[880px] gap-7">
		<p class="m-0 text-[15px] text-base-600-300">
			Ideas to try before they are built. Open one to see it on every device at its real size,
			compare its options, and say which works best.
		</p>

		{#each SECTIONS as section (section.kind)}
			<section class="grid gap-2">
				<div>
					<h2 class="m-0 text-lg font-bold">{section.label}</h2>
					<p class="m-0 text-sm text-base-600-300">{section.about}</p>
				</div>
				{#if section.entries.length}
					<ul class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2 p-0">
						{#each section.entries as entry (entry.href)}
							<li>
								<Button
									href={entry.href}
									base
									lite
									width="full"
									align="between"
									label={entry.label}
									iconEnd="icon-[mdi--chevron-right]"
									title="{entry.label}, {countOf(entry.kind, entry.options.length)}"
									class="font-semibold"
								/>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="m-0 text-sm text-base-600-300">None yet.</p>
				{/if}
			</section>
		{/each}

		<p class="m-0 text-[13px] leading-normal text-base-600-300">
			Adding one is adding a file, and the menu finds it: <code
				>src/prototypes/&lt;topic&gt;/&lt;option&gt;.html</code
			>
			or <code>src/components/&lt;name&gt;/&lt;variant&gt;.html</code> in <code>apps/play</code>, in
			folders as deep as you like. Made-up data only: anyone with the link can open play.
		</p>
	</div>
</Component>
