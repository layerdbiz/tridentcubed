<script lang="ts">
	// What's New (#363), drawn the way Discord shows its changelog (Justin's screenshot, 2026-11-26): the title and the
	// release's day with a close at the left, then for each release a banner with its version, a short word, and its
	// new features and fixes. It is the library's tall Dialog (#396), the same window as the new version window: a
	// phone's whole screen, a centred window from md up, the title and the button staying put while the list scrolls.
	// When and what it shows is whatsNew's (releases.state.svelte.ts); this only draws it.
	import { Dialog } from '@layerd/ui';
	import ChangeList from './change-list.svelte';
	import { whatsNew } from './releases.state.svelte';
	import { toAppChanges } from './releases.utils';
	import WindowHead from './window-head.svelte';

	// The release's day as people say it: November 26, 2026. Noon, so no time zone moves it to another day.
	function toDay(date: string) {
		return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const newest = $derived(whatsNew.shown[0]);
</script>

{#if whatsNew.isOpen}
	<Dialog
		label="What's New"
		variant="tall"
		onclose={() => whatsNew.close()}
	>
		{#snippet header()}
			<WindowHead
				title="What's New"
				note={newest ? toDay(newest.date) : ''}
				onclose={() => whatsNew.close()}
			/>
		{/snippet}

		<div class="pt-5 pb-6">
			{#each whatsNew.shown as release (release.version)}
				<article class="mb-8 last:mb-0">
					<div
						class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-5 py-6 text-white"
					>
						<span
							class="absolute -top-6 -right-6 icon-[mdi--star-four-points] size-28 text-white/10"
							aria-hidden="true"
						></span>
						<p class="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
							Trident Cubed
						</p>
						<p class="mt-1 text-4xl font-bold tracking-tight tabular-nums">v{release.version}</p>
						<p class="mt-1 text-sm text-slate-300">{toDay(release.date)}</p>
					</div>

					{#if release.summary}
						<p class="mt-4 text-[15px] leading-relaxed text-slate-600">{release.summary}</p>
					{/if}

					<ChangeList changes={toAppChanges(release)} />
				</article>
			{:else}
				<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
					Version numbers start with the next update. Its new features and fixes will show here.
				</p>
			{/each}
		</div>

		{#snippet footer()}
			<div class="-mx-5 border-t border-slate-200 px-5 pt-3">
				<button
					type="button"
					class="h-11 w-full rounded-full bg-slate-900 text-[15px] font-semibold text-white transition hover:bg-slate-800"
					onclick={() => whatsNew.close()}>Got it</button
				>
			</div>
		{/snippet}
	</Dialog>
{/if}
