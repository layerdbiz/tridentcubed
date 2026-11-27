<script lang="ts">
	// Email Signature (#354; Justin, 2026-11-26: "a way for team members to log in to the app and copy and paste their
	// email signatures into their Microsoft Outlook"). Anyone opens their own from the menu on their profile picture;
	// an Admin picks anyone on the Team page or a shared mailbox. It is the website's signature (`/company/emails`,
	// #62) moved into the app: the library's Email draws it and the library's Preview shows it in a frame of its own
	// and copies it, styling and all, for Outlook. The details come from the Team record; the server copies every
	// picture to the app's public signature address (#lib/server/signature.ts), since a pasted signature's pictures
	// are loaded by every reader's mail app, signed out. Built like the Activity: a dark top with a white sheet under
	// it and the one page header.
	import { Avatar, Email, ListRow, Menu, Preview, type MenuOptionType } from '@layerd/ui';
	import { SHEET_EDIT_URL, SIGNATURE_API } from '#lib/signature/signature.constants.js';
	import type {
		SignatureAnswerType,
		SignatureAskType,
		SignatureType
	} from '#lib/signature/signature.types.js';
	import type { LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import PageHeader from './page-header.svelte';

	let { look }: { look: LookState } = $props();

	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	const MAILBOX = 'mailbox:';

	// Whose signature: the User's own first, then whoever an Admin picks.
	let picked = $state('');
	const ask = $derived<SignatureAskType>(
		picked.startsWith(MAILBOX)
			? { mailbox: picked.slice(MAILBOX.length) }
			: picked
				? { person: picked }
				: {}
	);

	async function load(asked: SignatureAskType): Promise<SignatureAnswerType> {
		const query = new URLSearchParams();
		if (asked.person) query.set('person', asked.person);
		if (asked.mailbox) query.set('mailbox', asked.mailbox);
		const response = await fetch(`${SIGNATURE_API}?${query}`, { cache: 'no-store' });
		const found = (await response.json().catch(() => undefined)) as SignatureAnswerType | undefined;
		if (!found) throw new Error(`The signature answered ${response.status}.`);
		return found;
	}
	const answer = $derived(load(ask));

	// The shared mailboxes the last answer named, for an Admin's picker.
	let mailboxes = $state<{ slug: string; name: string }[]>([]);
	$effect(() => {
		answer.then(
			(found) => {
				if (found.isAllowed && found.mailboxes.length) mailboxes = found.mailboxes;
			},
			() => undefined
		);
	});

	// An Admin's picker: everyone on the Team page in its order, then the shared mailboxes.
	const people = $derived(
		look.members
			.filter((member) => member.id)
			.toSorted((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
	);
	const options = $derived<MenuOptionType[]>([
		...people.map((member) => {
			const image = faceOf(member.name, { hasPresence: false }).src || undefined;
			return {
				id: member.id ?? '',
				label: member.name,
				note: member.title || undefined,
				image,
				icon: image ? undefined : 'icon-[mdi--account-circle-outline]'
			};
		}),
		...mailboxes.map((mailbox) => ({
			id: `${MAILBOX}${mailbox.slug}`,
			label: mailbox.name,
			note: 'Shared mailbox',
			icon: 'icon-[mdi--email-multiple-outline]'
		}))
	]);
	const shownId = $derived(picked || look.me?.id || '');

	// The library Email hands over its HTML once drawn; the Preview shows and copies it.
	let email = $state<{ getHTML: () => string }>();

	// Edit opens what the signature is made from: the person's Team page, or the Sheet a mailbox lives in.
	function editOf(signature: SignatureType) {
		if (signature.type !== 'person') return { edit: SHEET_EDIT_URL };
		const member = look.members.find((each) => each.id === signature.id);
		if (!member || !(look.isAdmin || member.id === look.me?.id)) return {};
		return { onedit: () => look.openRecord('team', member.name, 'edit') };
	}

	// The page header shows its bar once the dark top has scrolled away.
	let reveal = $state(0);
	function onscroll(event: Event) {
		const top = (event.currentTarget as HTMLElement).scrollTop;
		reveal = Math.min(1, Math.max(0, (top - 80) / 60));
	}

	const STEPS = [
		{
			app: 'New Outlook and Outlook on the web',
			how: 'Settings, then Account, then Signatures. Make a new signature, paste into the box and Save. Choose it for new messages and replies.'
		},
		{
			app: 'Classic Outlook for Windows',
			how: 'File, then Options, then Mail, then Signatures. Press New, paste into the box, press OK.'
		},
		{
			app: 'Outlook for Mac',
			how: 'Outlook, then Settings, then Signatures. Press +, paste into the box and close it to save.'
		}
	];
</script>

<div class="relative h-dvh overflow-clip bg-white">
	<PageHeader
		{look}
		title="Email Signature"
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
				><span class="icon-[mdi--card-account-mail-outline] size-9"></span></span
			>
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Email Signature</h1>
			<p class="mt-1.5 max-w-md text-sm text-white/75">
				Press Copy, then paste it into Outlook’s signature settings on a computer. It is made from {look.isAdmin
					? 'each Team record'
					: 'your Team record'}, so a change there shows here.
			</p>
		</div>
		<div
			class="relative -mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+112px)]"
		>
			<div class="mx-auto max-w-3xl space-y-6">
				{#if look.isAdmin && options.length}
					<section>
						<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Whose Signature</h3>
						<Menu
							class="block"
							label="Whose signature"
							value={shownId}
							{options}
							isWide
							isSearchable
							align="left"
							onpick={(id) => (picked = id)}
						>
							{#snippet trigger(current, isOpen)}
								<ListRow
									class="w-full gap-3 px-4 py-2.5 text-left transition hover:bg-slate-900/[0.03] {CARD}"
									label={current?.label ?? 'Pick someone'}
									labelClass="text-sm font-medium text-slate-900"
									note={current?.note}
									noteClass="text-xs text-slate-500"
								>
									{#snippet start()}
										{#if current?.image}
											<Avatar
												src={current.image}
												alt={current.label}
												size={36}
												ring="ring-2 ring-slate-200"
											/>
										{:else}
											<span
												class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-500"
												><span
													class="{current?.icon ?? 'icon-[mdi--account-circle-outline]'} size-5"
												></span></span
											>
										{/if}
									{/snippet}
									{#snippet end()}
										<span
											class="icon-[mdi--chevron-down] size-5 text-slate-400 transition {isOpen
												? 'rotate-180'
												: ''}"
										></span>
									{/snippet}
								</ListRow>
							{/snippet}
						</Menu>
					</section>
				{/if}
				{#await answer}
					<div
						class="flex justify-center py-16"
						role="status"
					>
						<span class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"></span>
						<span class="sr-only">Loading</span>
					</div>
				{:then found}
					{#if !found.isAllowed}
						<p class="px-1 py-10 text-center text-sm text-slate-500">{found.reason}</p>
					{:else}
						<section class="min-w-0">
							<div class="hidden">
								<Email
									data={found.signature}
									onMount={(instance) => (email = instance)}
								/>
							</div>
							<Preview
								componentRef={email}
								{...editOf(found.signature)}
							/>
						</section>
						<section>
							<h3 class="mb-2 px-1 text-sm font-semibold text-slate-900">Add It to Outlook</h3>
							<ol class="divide-y divide-slate-900/[0.05] overflow-hidden {CARD}">
								{#each STEPS as step, index (step.app)}
									<li class="flex gap-3 px-4 py-3">
										<span
											class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-xs font-semibold text-slate-600"
											>{index + 1}</span
										>
										<span class="min-w-0 text-sm">
											<span class="block font-medium text-slate-900">{step.app}</span>
											<span class="block text-slate-500">{step.how}</span>
										</span>
									</li>
								{/each}
							</ol>
							<p class="mt-2 px-1 text-xs text-slate-500">
								Outlook keeps the signature with your mailbox, so pasting it once on a computer
								brings it to Outlook on the web too. Outlook on a phone cannot use it.
							</p>
						</section>
					{/if}
				{:catch}
					<p class="px-1 py-10 text-center text-sm text-slate-500">
						The signature could not load. Check the connection and open it again.
					</p>
				{/await}
			</div>
		</div>
	</div>
</div>
