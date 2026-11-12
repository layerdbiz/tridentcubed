<script lang="ts">
	// PROTOTYPE (#161) run 15: the organization's own details and the report's standard wording, kept once and
	// printed on every report (the glossary's Organization): its logo, name, address, phone, email, group email and
	// website, then the disclaimer and the sign-off.
	// Run 33 (Justin, 2026-11-12: "it doesn't really fit with our other designs. Like the page, edit, and
	// preview"). It is the Organization now, opened from the menu on the profile picture, and built like every
	// other page: a Page that reads it and an Edit that changes it, swiped between or picked on the bottom bar,
	// under the same header (page-header.svelte). Edit is the Project panel's own sections (group.svelte) with its
	// soft fields: Details, Disclaimer, Sign-off. The signed-in person's profile is their Team page, reached from
	// the same menu. On a desktop Edit keeps its floating column and the report it changes shows beside it.
	import Group from './group.svelte';
	import ImageField from './image-field.svelte';
	import type { LookState } from './look.state.svelte';
	import PageHeader from './page-header.svelte';
	import ReportPreview from './report-preview.svelte';

	let { look, isWide }: { look: LookState; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	// The panels' soft field (panel-body.svelte).
	const FIELD =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/40';
	const LABEL = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const BUTTON =
		'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition';
	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';

	const organization = $derived(look.organization);
	// #184: only an Admin changes the organization. Manager and Team see the same Edit, read-only; the server refuses
	// their changes too.
	const isAdmin = $derived(look.isAdmin);
	// The section last touched, which picks the report page shown beside the form on a desktop.
	let part = $state<'organization' | 'wording'>('organization');
	let open = $state<string[]>(['details']);
	let top = $state(0);

	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	function addPoint() {
		// A point is a saved row (#184), so its id is a UUID made here.
		organization.disclaimer.points.push({ id: crypto.randomUUID(), title: '', text: '' });
		look.flash();
	}

	function removePoint(id: string) {
		look.confirm({
			title: 'Delete point?',
			note: 'It comes off the disclaimer of every report that has not been sent.',
			onyes: () => {
				organization.disclaimer.points = organization.disclaimer.points.filter(
					(item) => item.id !== id
				);
				look.flash();
			}
		});
	}

	let swiper: HTMLDivElement | undefined = $state();
	let isLanded = false;

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = look.tabProgress > 0.5 ? 'edit' : 'page';
	}

	// The bar's Page and Edit: the panes slide to the one picked; the first time they are simply there.
	$effect(() => {
		if (!swiper) return;
		const left = look.tab === 'edit' ? swiper.clientWidth : 0;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});
</script>

{#snippet text(label: string, value: string, oninput: (value: string) => void, type = 'text')}
	<label class="block">
		<span class={LABEL}>{label}</span>
		<input
			class={FIELD}
			{type}
			{value}
			oninput={(event) => {
				oninput(event.currentTarget.value);
				look.flash();
			}}
		/>
	</label>
{/snippet}

{#snippet area(label: string, value: string, oninput: (value: string) => void, rows = 3)}
	<label class="block">
		<span class={LABEL}>{label}</span>
		<textarea
			class="{FIELD} resize-y leading-relaxed"
			{rows}
			{value}
			oninput={(event) => {
				oninput(event.currentTarget.value);
				look.flash();
			}}></textarea>
	</label>
{/snippet}

<!-- Edit: the same sections a Project panel has, each opening and closing. For Manager and Team every field inside is
	 disabled (a fieldset), while the sections still open and close. -->
{#snippet form()}
	<div class="space-y-3">
		{#if !isAdmin}
			<p
				class="flex items-center gap-2 rounded-2xl bg-slate-900/[0.04] px-3 py-2.5 text-xs text-slate-500"
				role="note"
			>
				<span class="icon-[mdi--lock-outline] size-4 shrink-0"></span>Only an Admin can change the
				organization.
			</p>
		{/if}
		<div onfocusin={() => (part = 'organization')}>
			<Group
				title="Details"
				note="At the top of every report page, and on the cover"
				icon="icon-[mdi--domain]"
				isOpen={open.includes('details')}
				ontoggle={() => toggle('details')}
			>
				<fieldset
					class="contents"
					disabled={!isAdmin}
				>
					<ImageField
						label="Logo"
						shape="logo"
						value={organization.logo}
						onpick={(url) => {
							organization.logo = url;
							part = 'organization';
							look.flash();
						}}
					/>
					{@render text('Name', organization.name, (value) => look.nameOrganization(value))}
					{@render text('Address', organization.address, (value) => (organization.address = value))}
					{@render text(
						'Phone',
						organization.phone,
						(value) => (organization.phone = value),
						'tel'
					)}
					{@render text(
						'Email',
						organization.email,
						(value) => (organization.email = value),
						'email'
					)}
					{@render text(
						'Group Email',
						organization.groupEmail,
						(value) => (organization.groupEmail = value),
						'email'
					)}
					{@render text(
						'Website',
						organization.website,
						(value) => (organization.website = value),
						'url'
					)}
				</fieldset>
			</Group>
		</div>
		<div onfocusin={() => (part = 'wording')}>
			<Group
				title="Disclaimer"
				note="The last page of every report, word for word"
				icon="icon-[mdi--shield-alert-outline]"
				isOpen={open.includes('disclaimer')}
				ontoggle={() => toggle('disclaimer')}
			>
				<fieldset
					class="contents"
					disabled={!isAdmin}
				>
					{@render area(
						'Opening',
						organization.disclaimer.opening,
						(value) => (organization.disclaimer.opening = value),
						4
					)}
					{#each organization.disclaimer.points as point, index (point.id)}
						<div class="space-y-2 rounded-2xl bg-white/80 p-2.5">
							<div class="flex items-center gap-2">
								<input
									class="{FIELD} font-semibold"
									value={point.title}
									placeholder="Title"
									aria-label="Point {index + 1} title"
									oninput={(event) => {
										point.title = event.currentTarget.value;
										look.flash();
									}}
								/>
								<button
									type="button"
									class="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-danger/10 hover:text-danger"
									aria-label="Delete point {index + 1}"
									onclick={() => removePoint(point.id)}
									><span class="icon-[mdi--trash-can-outline] size-5"></span></button
								>
							</div>
							<textarea
								class="{FIELD} resize-y leading-relaxed"
								rows="3"
								value={point.text}
								placeholder="What it says"
								aria-label="Point {index + 1} text"
								oninput={(event) => {
									point.text = event.currentTarget.value;
									look.flash();
								}}></textarea>
						</div>
					{/each}
					{@render area(
						'Closing Note',
						organization.disclaimer.note,
						(value) => (organization.disclaimer.note = value),
						2
					)}
				</fieldset>
				{#snippet actions()}
					{#if isAdmin}
						<button
							type="button"
							class="{BUTTON} bg-primary/10 text-primary hover:bg-primary/15"
							onclick={addPoint}><span class="icon-[mdi--plus] size-4"></span>Add Point</button
						>
					{/if}
				{/snippet}
			</Group>
		</div>
		<div onfocusin={() => (part = 'wording')}>
			<Group
				title="Sign-off"
				note="Under the disclaimer, over the team lead's name"
				icon="icon-[mdi--draw]"
				isOpen={open.includes('signoff')}
				ontoggle={() => toggle('signoff')}
			>
				<fieldset
					class="contents"
					disabled={!isAdmin}
				>
					{@render area(
						'Thank-you Line',
						organization.closing,
						(value) => (organization.closing = value),
						2
					)}
					{@render text(
						'Sign-off',
						organization.signoff,
						(value) => (organization.signoff = value)
					)}
				</fieldset>
			</Group>
		</div>
	</div>
{/snippet}

<!-- Page: the organization as it reads, on a dark top with a white sheet under it. -->
{#snippet page()}
	<div class="h-full overflow-y-auto overscroll-y-contain bg-white">
		<div
			class="flex flex-col items-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16 text-center text-white"
		>
			{#if organization.logo}
				<span class="flex size-24 items-center justify-center rounded-3xl bg-white"
					><img
						src={organization.logo}
						alt=""
						draggable="false"
						class="size-[72%] object-contain"
					/></span
				>
			{/if}
			<h1 class="mt-4 text-2xl leading-tight font-semibold">{organization.name}</h1>
			{#if organization.address}
				<p class="mt-1.5 flex items-center gap-1 text-sm text-white/75">
					<span class="icon-[mdi--map-marker] size-4 shrink-0"></span>{organization.address}
				</p>
			{/if}
		</div>
		<div
			class="-mt-8 space-y-5 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+96px)]"
		>
			<section>
				<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Details</h3>
				<dl class="divide-y divide-slate-900/[0.05] {CARD}">
					{#each [['Phone', organization.phone], ['Email', organization.email], ['Group Email', organization.groupEmail], ['Website', organization.website], ['Address', organization.address]] as [label, value] (label)}
						<div class="flex justify-between gap-3 px-4 py-2.5 text-sm">
							<dt class="shrink-0 text-slate-500">{label}</dt>
							<dd class="min-w-0 text-right font-medium break-words text-slate-900">
								{value || '—'}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
			<section>
				<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Disclaimer</h3>
				<div class="space-y-2 p-4 text-sm leading-relaxed text-slate-600 {CARD}">
					<p>{organization.disclaimer.opening || '—'}</p>
					{#each organization.disclaimer.points as point (point.id)}
						<p><b class="font-semibold text-slate-900">{point.title}:</b> {point.text}</p>
					{/each}
					{#if organization.disclaimer.note}<p>{organization.disclaimer.note}</p>{/if}
				</div>
			</section>
			<section>
				<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Sign-off</h3>
				<div class="space-y-1 p-4 text-sm text-slate-600 {CARD}">
					{#if organization.closing}<p class="italic">{organization.closing}</p>{/if}
					<p class="font-medium text-slate-900">{organization.signoff || '—'}</p>
				</div>
			</section>
		</div>
	</div>
{/snippet}

{#if isWide}
	<div class="fixed inset-0 bg-slate-100">
		{#if look.project}
			<ReportPreview
				{look}
				highlight={part}
				days="timeline"
				start="column"
				left={444}
			/>
		{:else}
			<!-- With no project yet there is no report to show the organization in (#180), so its Page shows. -->
			<div class="h-full pl-[444px]">{@render page()}</div>
		{/if}
	</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="relative h-[72px] shrink-0">
			<PageHeader
				{look}
				title="Organization"
				kind={organization.name}
				hasCloud
				hasChevron={look.variant('header') === 'C'}
			/>
		</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">{@render form()}</div>
	</aside>
{:else}
	<div class="relative h-dvh overflow-hidden bg-slate-100">
		<PageHeader
			{look}
			title="Organization"
			kind={organization.name}
			reveal={look.tabProgress}
			isLight
			hasCloud
			hasChevron={look.variant('header') === 'C'}
			bind:height={top}
		/>
		<div
			bind:this={swiper}
			class="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
			{onscroll}
		>
			<div class="h-full w-full shrink-0 snap-start">{@render page()}</div>
			<div
				class="h-full w-full shrink-0 snap-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)]"
				style:padding-top="{top + 12}px"
			>
				{@render form()}
			</div>
		</div>
	</div>
{/if}
