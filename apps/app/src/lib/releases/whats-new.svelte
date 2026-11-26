<script lang="ts">
	// What's New (#363), drawn the way Discord shows its changelog (Justin's screenshot, 2026-11-26): a header with
	// the title and the release's day and a close at the left, then for each release a banner with its version, a
	// short word, and its new features and fixes under headings with a rule, each change with its pictures when it
	// has them. On a phone it fills the screen; from md up it is a centred window. It opens in the browser's top layer
	// (a popover), over the menus and the sheets, as the sheet does. When and what it shows is whatsNew's
	// (releases.state.svelte.ts); this only draws it.
	import type { Attachment } from 'svelte/attachments';
	import { fade, fly } from 'svelte/transition';
	import { whatsNew } from './releases.state.svelte';
	import type { ChangeKindType, ReleaseType } from './releases.utils';
	import { toAppChanges } from './releases.utils';

	const uid = $props.id();

	const SECTIONS: { kind: ChangeKindType; label: string; icon: string; tone: string }[] = [
		{
			kind: 'feature',
			label: 'New features',
			icon: 'icon-[mdi--star-four-points-outline]',
			tone: 'text-emerald-600 after:bg-emerald-500/60'
		},
		{
			kind: 'fix',
			label: 'Fixes',
			icon: 'icon-[mdi--wrench-outline]',
			tone: 'text-sky-600 after:bg-sky-500/60'
		}
	];

	// The release's day as people say it: November 26, 2026. Noon, so no time zone moves it to another day.
	function toDay(date: string) {
		return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function toSections(release: ReleaseType) {
		const changes = toAppChanges(release);
		return SECTIONS.map((section) => ({
			...section,
			changes: changes.filter((change) => change.kind === section.kind)
		})).filter((section) => section.changes.length > 0);
	}

	// Safari 16 and older has no popovers: there it is an ordinary fixed box, kept on top by its z-index.
	const lift: Attachment<HTMLElement> = (node) => {
		node.showPopover?.();
		// Focus moves into the window, so Tab and a screen reader start there, without lighting the close's ring.
		node.querySelector<HTMLElement>('[role="dialog"]')?.focus();
	};

	const newest = $derived(whatsNew.shown[0]);
</script>

<svelte:window
	onkeydown={(event) => event.key === 'Escape' && whatsNew.isOpen && whatsNew.close()}
/>

{#if whatsNew.isOpen}
	<div
		popover="manual"
		class="fixed z-[120] m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0"
		style="inset: 0"
		{@attach lift}
	>
		<button
			type="button"
			class="fixed inset-0 hidden bg-slate-950/40 md:block"
			aria-label="Close What's New"
			tabindex="-1"
			onclick={() => whatsNew.close()}
			transition:fade={{ duration: 180 }}
		></button>
		<div
			class="fixed inset-0 flex flex-col bg-white outline-none md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[min(52rem,88vh)] md:w-[34rem] md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-[28px] md:shadow-[0_24px_64px_rgb(15_23_42/0.28)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="{uid}-title"
			tabindex="-1"
			transition:fly={{ y: 48, duration: 240 }}
		>
			<header
				class="relative flex shrink-0 flex-col items-center border-b border-slate-200 px-14 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-3 text-center"
			>
				<button
					type="button"
					class="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] left-3 flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
					aria-label="Close"
					onclick={() => whatsNew.close()}
					><span
						class="icon-[mdi--close] size-6"
						aria-hidden="true"
					></span></button
				>
				<h2
					id="{uid}-title"
					class="text-xl font-bold text-slate-900"
				>
					What's New
				</h2>
				{#if newest}<p class="text-sm text-slate-500">{toDay(newest.date)}</p>{/if}
			</header>

			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-6">
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

						{#each toSections(release) as section (section.kind)}
							<h3
								class="mt-6 flex items-center gap-3 text-sm font-bold tracking-wide uppercase after:h-0.5 after:flex-1 after:rounded-full {section.tone}"
							>
								<span
									class="{section.icon} size-[18px] shrink-0"
									aria-hidden="true"
								></span>{section.label}
							</h3>
							<ul class="mt-3 space-y-3">
								{#each section.changes as change (change.text)}
									<li class="text-[15px] leading-snug text-slate-700">
										<p class="flex gap-2.5">
											<span
												class="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-slate-400"
												aria-hidden="true"
											></span>
											<span class="min-w-0 flex-1">{change.text}</span>
										</p>
										{#if change.pictures?.length}
											<div class="mt-2 grid gap-2 pl-4">
												{#each change.pictures as picture (picture)}
													<img
														class="w-full rounded-xl border border-slate-200"
														src={picture}
														alt="Before and after: {change.text}"
														loading="lazy"
													/>
												{/each}
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						{/each}
					</article>
				{:else}
					<p class="py-10 text-center text-[15px] leading-relaxed text-slate-500">
						Version numbers start with the next update. Its new features and fixes will show here.
					</p>
				{/each}
			</div>

			<footer
				class="shrink-0 border-t border-slate-200 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
			>
				<button
					type="button"
					class="h-11 w-full rounded-full bg-slate-900 text-[15px] font-semibold text-white transition hover:bg-slate-800"
					onclick={() => whatsNew.close()}>Got it</button
				>
			</footer>
		</div>
	</div>
{/if}
