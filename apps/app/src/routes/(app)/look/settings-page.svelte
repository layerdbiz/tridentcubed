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
	// #377: its text fields are the library's, the label on the border and the ? beside it, as the Project panel's are.
	import { Button, Input, Textarea } from '@layerd/ui';
	import Group from './group.svelte';
	import ImageField from './image-field.svelte';
	import type { LookState } from './look.state.svelte';
	import PageHeader from './page-header.svelte';
	import { cityStateOf } from './location';
	import PlaceField from './place-field.svelte';
	import ReportPreview from './report-preview.svelte';
	import { organizationSectionsOf, valuesOf } from './tally';

	let { look, isWide }: { look: LookState; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	// Words people type in sentences keep the phone's own help, as in the panels (panel-body.svelte): the library's
	// inputs switch capitals, autocorrect and spelling off, which suits the phone, emails and the website only.
	const TYPING = { autocapitalize: 'sentences', autocorrect: 'on', spellcheck: true } as const;
	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';

	const organization = $derived(look.organization);
	// What each section's line counts: the inputs tally.ts says it holds (#229).
	const sections = $derived(organizationSectionsOf(organization));
	// #184, #303: an Admin or a Manager changes the organization. Team sees the same Edit, read-only; the server
	// refuses its changes too.
	const isEditable = $derived(look.isOrganizationEditable);
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

<!-- Edit: the same sections a Project panel has, each opening and closing. For Team every field inside is disabled
	 (a fieldset), while the sections still open and close. -->
{#snippet form()}
	<div class="space-y-3">
		{#if !isEditable}
			<p
				class="flex items-center gap-2 rounded-2xl bg-slate-900/[0.04] px-3 py-2.5 text-xs text-slate-500"
				role="note"
			>
				<span class="icon-[mdi--lock-outline] size-4 shrink-0"></span>Only an Admin or a Manager can
				change the organization.
			</p>
		{/if}
		<div onfocusin={() => (part = 'organization')}>
			<Group
				title="Details"
				values={valuesOf(sections, 'details')}
				icon="icon-[mdi--domain]"
				isOpen={open.includes('details')}
				ontoggle={() => toggle('details')}
			>
				<!-- Every field below changes the organization as it is typed; the badge says it is saving. -->
				<fieldset
					class="contents"
					disabled={!isEditable}
					oninput={() => look.flash()}
				>
					<ImageField
						label="Logo"
						shape="logo"
						value={organization.logo}
						help={look.helpOf('organization.logo')}
						target={{
							table: 'organization_details',
							column: 'logo',
							id: organization.detailsId
						}}
						onpick={(url) => {
							organization.logo = url;
							part = 'organization';
							look.flash();
						}}
					/>
					<!-- The new name follows into every project's Organization drop-down (`nameOrganization`). -->
					<Input
						label="Name"
						{...TYPING}
						bind:value={() => organization.name, (name) => look.nameOrganization(name ?? '')}
						help={look.helpOf('organization.name')}
					/>
					<!-- Where it is (#320): the one location field every record has, typed once and picked. -->
					<PlaceField
						{look}
						label="Location"
						help={look.helpOf('organization.address')}
						value={organization.address}
						oninput={(value) => {
							organization.address = value;
							look.flash();
						}}
					/>
					<Input
						label="Phone"
						type="tel"
						inputmode="tel"
						autocomplete="off"
						bind:value={organization.phone}
						help={look.helpOf('organization.phone')}
					/>
					<Input
						label="Email"
						type="email"
						inputmode="email"
						autocomplete="off"
						bind:value={organization.email}
						help={look.helpOf('organization.email')}
					/>
					<Input
						label="Group Email"
						type="email"
						inputmode="email"
						autocomplete="off"
						bind:value={organization.groupEmail}
						help={look.helpOf('organization.groupEmail')}
					/>
					<Input
						label="Website"
						type="url"
						inputmode="url"
						autocomplete="off"
						bind:value={organization.website}
						help={look.helpOf('organization.website')}
					/>
				</fieldset>
			</Group>
		</div>
		<div onfocusin={() => (part = 'wording')}>
			<Group
				title="Disclaimer"
				values={valuesOf(sections, 'disclaimer')}
				icon="icon-[mdi--shield-alert-outline]"
				isOpen={open.includes('disclaimer')}
				ontoggle={() => toggle('disclaimer')}
			>
				<fieldset
					class="contents"
					disabled={!isEditable}
					oninput={() => look.flash()}
				>
					<Textarea
						label="Opening"
						autocapitalize={TYPING.autocapitalize}
						spellcheck={TYPING.spellcheck}
						bind:value={organization.disclaimer.opening}
						rows={4}
						help={look.helpOf('disclaimer.opening')}
					/>
					<!-- A point: its Title and its Text, a line keeping one point from the next, as the panels keep one person
					     from the next. -->
					{#if organization.disclaimer.points.length}
						<div class="mt-3 divide-y divide-slate-900/[0.06] border-y border-slate-900/[0.06]">
							{#each organization.disclaimer.points as point, index (point.id)}
								<!-- Named as a group, so a screen reader tells one point's Title and Text from the next. -->
								<div
									class="space-y-3 py-3"
									role="group"
									aria-label="Point {index + 1}"
								>
									<div class="flex items-start gap-2">
										<Input
											class="min-w-0 flex-1"
											label="Title"
											{...TYPING}
											bind:value={point.title}
											help={look.helpOf('disclaimer.pointTitle')}
										/>
										<button
											type="button"
											class="mt-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-danger/10 hover:text-danger"
											aria-label="Delete point {index + 1}"
											onclick={() => removePoint(point.id)}
											><span class="icon-[mdi--trash-can-outline] size-5"></span></button
										>
									</div>
									<Textarea
										label="Text"
										autocapitalize={TYPING.autocapitalize}
										spellcheck={TYPING.spellcheck}
										bind:value={point.text}
										rows={3}
										help={look.helpOf('disclaimer.pointText')}
									/>
								</div>
							{/each}
						</div>
					{/if}
					<Textarea
						label="Closing Note"
						autocapitalize={TYPING.autocapitalize}
						spellcheck={TYPING.spellcheck}
						bind:value={organization.disclaimer.note}
						rows={2}
						help={look.helpOf('disclaimer.note')}
					/>
				</fieldset>
				{#snippet actions()}
					{#if isEditable}
						<!-- The library Button is placed (`relative`), so it sits above the library text area over it, which
						     reaches a little below its own box (#394), and takes every tap. -->
						<Button
							primary
							lite
							xs
							icon="icon-[mdi--plus]"
							label="Add Point"
							onclick={addPoint}
						/>
					{/if}
				{/snippet}
			</Group>
		</div>
		<div onfocusin={() => (part = 'wording')}>
			<Group
				title="Sign-off"
				values={valuesOf(sections, 'signoff')}
				icon="icon-[mdi--draw]"
				isOpen={open.includes('signoff')}
				ontoggle={() => toggle('signoff')}
			>
				<fieldset
					class="contents"
					disabled={!isEditable}
					oninput={() => look.flash()}
				>
					<Textarea
						label="Thank-you Line"
						autocapitalize={TYPING.autocapitalize}
						spellcheck={TYPING.spellcheck}
						bind:value={organization.closing}
						rows={2}
						help={look.helpOf('organization.closing')}
					/>
					<Input
						label="Sign-off"
						{...TYPING}
						bind:value={organization.signoff}
						help={look.helpOf('organization.signoff')}
					/>
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
					<span class="icon-[mdi--map-marker] size-4 shrink-0"></span>{cityStateOf(
						organization.address
					)}
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

{#if isWide && look.tab !== 'edit'}
	<!-- A desktop's Page: the organization as it reads, alone (Justin, 2026-11-16: Page and Edit are two views). -->
	<div class="fixed inset-0 bg-slate-100">{@render page()}</div>
{:else if isWide}
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
	<!-- Clipped, not hidden: a clipped box can never be slid sideways by the browser. -->
	<div class="relative h-dvh overflow-clip bg-slate-100">
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
