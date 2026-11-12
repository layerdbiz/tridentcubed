<script lang="ts">
	// PROTOTYPE (#161) run 15: Settings (Justin, 2026-11-10: "a way to edit the admin page for the organization ...
	// through the settings"). The organization's own details and the report's standard wording, kept once and printed
	// on every report (the glossary's Organization): its logo, name, address, phone, email, group email and website,
	// then the disclaimer and the sign-off. Opened from the menu's cog and from Admin. Built like a record's Edit
	// tab; on a desktop the form sits in the floating column and the report it changes shows beside it, on the page
	// the card being edited prints on. The signed-in person's own profile is their Team page, linked at the top.
	import Avatar from './avatar.svelte';
	import ImageField from './image-field.svelte';
	import { createId } from './look.data';
	import type { LookState } from './look.state.svelte';
	import ReportPreview from './report-preview.svelte';

	let { look, isWide, me }: { look: LookState; isWide: boolean; me: string } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const FIELD =
		'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-primary';
	const LABEL = 'mb-1 block text-xs font-medium text-slate-500';
	const CARD = 'space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-900/[0.05]';
	const HEADING = 'text-sm font-semibold text-slate-900';

	const organization = $derived(look.organization);
	const profile = $derived(look.members.find((member) => member.name === me));
	// The card last touched, which picks the report page shown beside the form.
	let part = $state<'organization' | 'wording'>('organization');

	function addPoint() {
		organization.disclaimer.points.push({ id: createId('point'), title: '', text: '' });
		look.flash();
	}

	function removePoint(id: string) {
		const point = organization.disclaimer.points.find((item) => item.id === id);
		look.confirm({
			title: `Delete ${point?.title || 'this point'}?`,
			note: 'It comes off the disclaimer of every report that has not been sent.',
			onyes: () => {
				organization.disclaimer.points = organization.disclaimer.points.filter(
					(item) => item.id !== id
				);
				look.flash();
			}
		});
	}
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
			class="{FIELD} resize-y text-sm leading-relaxed"
			{rows}
			{value}
			oninput={(event) => {
				oninput(event.currentTarget.value);
				look.flash();
			}}></textarea>
	</label>
{/snippet}

{#snippet header()}
	<div class="flex items-center gap-2">
		<button
			class="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-900/5"
			aria-label="Back"
			onclick={() => look.home()}><span class="icon-[mdi--arrow-left] size-6"></span></button
		>
		<span
			class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"
			><span class="icon-[mdi--cog] size-5"></span></span
		>
		<span class="min-w-0 flex-1">
			<span class="block truncate font-semibold text-slate-900">Settings</span>
			<span class="block truncate text-xs text-slate-500">{organization.name}</span>
		</span>
	</div>
{/snippet}

{#snippet form()}
	<div class="space-y-4">
		{#if profile}
			<button
				class="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-slate-900/[0.05] transition hover:bg-slate-50"
				onclick={() => look.openRecord('team', profile.name, 'edit')}
			>
				<Avatar
					name={profile.name}
					size={44}
					hasPresence={false}
				/>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold text-slate-900">Your profile</span>
					<span class="block truncate text-xs text-slate-500"
						>{profile.name} · photo, title, phone and email</span
					>
				</span>
				<span class="icon-[mdi--chevron-right] size-5 shrink-0 text-slate-400"></span>
			</button>
		{/if}

		<div
			class={CARD}
			onfocusin={() => (part = 'organization')}
		>
			<div>
				<p class={HEADING}>Organization</p>
				<p class="mt-0.5 text-xs text-slate-400">
					The logo, name, phone and email print at the top of every report page; the logo is on the
					cover too.
				</p>
			</div>
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
			{@render text('Phone', organization.phone, (value) => (organization.phone = value), 'tel')}
			{@render text('Email', organization.email, (value) => (organization.email = value), 'email')}
			{@render text(
				'Group email',
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
		</div>

		<div
			class={CARD}
			onfocusin={() => (part = 'wording')}
		>
			<div>
				<p class={HEADING}>Disclaimer</p>
				<p class="mt-0.5 text-xs text-slate-400">The last page of every report, word for word.</p>
			</div>
			{@render area(
				'Opening',
				organization.disclaimer.opening,
				(value) => (organization.disclaimer.opening = value),
				4
			)}
			{#each organization.disclaimer.points as point, index (point.id)}
				<div class="space-y-2 rounded-2xl bg-slate-50 p-3">
					<div class="flex items-center gap-2">
						<span class="w-5 shrink-0 text-center text-xs font-semibold text-slate-400 tabular-nums"
							>{index + 1}</span
						>
						<input
							class="{FIELD} py-2 text-sm font-semibold"
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
						class="{FIELD} resize-y text-sm leading-relaxed"
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
			<button
				type="button"
				class="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
				onclick={addPoint}><span class="icon-[mdi--plus] size-5"></span>Add a point</button
			>
			{@render area(
				'Closing note',
				organization.disclaimer.note,
				(value) => (organization.disclaimer.note = value),
				2
			)}
		</div>

		<div
			class={CARD}
			onfocusin={() => (part = 'wording')}
		>
			<div>
				<p class={HEADING}>Sign-off</p>
				<p class="mt-0.5 text-xs text-slate-400">
					Under the disclaimer, over the team lead's name, photo, phone and email.
				</p>
			</div>
			{@render area(
				'Thank-you line',
				organization.closing,
				(value) => (organization.closing = value),
				2
			)}
			{@render text('Sign-off', organization.signoff, (value) => (organization.signoff = value))}
		</div>
	</div>
{/snippet}

{#if isWide}
	<div class="fixed inset-0 bg-slate-100">
		<ReportPreview
			{look}
			highlight={part}
			days="timeline"
			start="column"
			left={444}
		/>
	</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="pt-4 pr-3 pb-4 pl-4">{@render header()}</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">{@render form()}</div>
	</aside>
{:else}
	<div class="h-dvh overflow-y-auto bg-slate-100 pb-[calc(env(safe-area-inset-bottom)+24px)]">
		<header
			class="sticky top-0 z-20 bg-white/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
		>
			<div class="px-1.5 py-2">{@render header()}</div>
		</header>
		<div class="px-4 pt-3">{@render form()}</div>
	</div>
{/if}
