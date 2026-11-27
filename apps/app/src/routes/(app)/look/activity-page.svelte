<script lang="ts">
	// The Activity Log (#306; #403, Justin, 2026-11-27): the organization's running list of what happens in the app,
	// newest first: sign-ins and sign-outs, projects opened, PDFs downloaded and every change in the history. An Admin
	// opens it from the menu on their profile picture or from Settings. It is built like the Organization's Page: a
	// dark top with a white sheet under it and the one page header. The list and how it loads are activity-log.svelte,
	// which Settings holds too, in the look Justin picked on the prototype.
	import ActivityLog from './activity-log.svelte';
	import type { LookState } from './look.state.svelte';
	import PageHeader from './page-header.svelte';

	let { look }: { look: LookState } = $props();

	// The page header shows its bar once the dark top has scrolled away.
	let reveal = $state(0);
	function onscroll(event: Event) {
		const top = (event.currentTarget as HTMLElement).scrollTop;
		reveal = Math.min(1, Math.max(0, (top - 80) / 60));
	}
</script>

<div class="relative h-dvh overflow-clip bg-white">
	<PageHeader
		{look}
		title="Activity Log"
		kind={look.organization.name}
		{reveal}
		isLight
		hasChevron={look.variant('header') === 'C'}
	/>
	<div
		class="h-full overflow-y-auto overscroll-y-contain"
		{onscroll}
	>
		<div
			class="flex flex-col items-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16 text-center text-white"
		>
			<span class="flex size-16 items-center justify-center rounded-3xl bg-white/10"
				><span class="icon-[mdi--timeline-clock-outline] size-9"></span></span
			>
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Activity Log</h1>
			<p class="mt-1.5 max-w-md text-sm text-white/75">
				Sign-ins and sign-outs, projects opened, PDFs downloaded and every change in {look
					.organization.name}, newest first.
			</p>
		</div>
		<div
			class="relative -mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+112px)]"
		>
			<div class="mx-auto max-w-3xl">
				<ActivityLog {look} />
			</div>
		</div>
	</div>
</div>
