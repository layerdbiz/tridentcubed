<script lang="ts">
	// Email Signature (#354; Justin, 2026-11-26: "a way for team members to log in to the app and copy and paste their
	// email signatures into their Microsoft Outlook"). Anyone opens their own from the menu on their profile picture;
	// an Admin picks anyone on the Team page or a shared mailbox. It is the website's signature (`/company/emails`,
	// #62) moved into the app: the library's Email draws it and the library's Preview shows it in a frame of its own
	// and copies it, styling and all, for Outlook. The details come from the Team record; the server copies every
	// picture to the app's public signature address (#lib/server/signature.ts), since a pasted signature's pictures
	// are loaded by every reader's mail app, signed out. Under it, the person picks or uploads their signature's photo,
	// always a circle and never their profile picture, and the banner at the bottom (Justin, 2026-11-27). Built like
	// the Activity: a dark top with a white sheet under it and the one page header.
	import {
		Avatar,
		Button,
		Email,
		Image,
		ListRow,
		Menu,
		Preview,
		type MenuOptionType
	} from '@layerd/ui';
	import { toFittedSize } from '#lib/files/files.utils.js';
	import {
		SHEET_EDIT_URL,
		SIGNATURE_API,
		UPLOAD_SIDE
	} from '#lib/signature/signature.constants.js';
	import type {
		SignatureAnswerType,
		SignatureAskType,
		SignaturePickType,
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

	// The answer after a pick or an upload, for the signature it was made for; a pick that was refused says why.
	const askKey = $derived(JSON.stringify(ask));
	let changed = $state<{ key: string; answer: SignatureAnswerType }>();
	let busy = $state('');
	let problem = $state('');
	// Drawn again after a refused pick, so the picked circle goes back to the one the signature shows.
	let round = $state(0);

	function toShown(found: SignatureAnswerType) {
		return changed?.key === askKey ? changed.answer : found;
	}

	async function send(body: BodyInit, query: string, type: string) {
		const key = askKey;
		problem = '';
		try {
			const response = await fetch(`${SIGNATURE_API}${query}`, {
				method: 'POST',
				body,
				headers: { 'content-type': type }
			});
			const found = (await response.json().catch(() => undefined)) as
				| SignatureAnswerType
				| undefined;
			if (!found) throw new Error(`The signature answered ${response.status}.`);
			if (found.isAllowed) changed = { key, answer: found };
			else problem = found.reason;
		} catch {
			problem = 'That did not save. Check the connection and try again.';
		}
		if (problem) round += 1;
		busy = '';
	}

	function pick(person: string, kind: 'photo' | 'banner', source: string) {
		busy = `${kind}:${source}`;
		const body: SignaturePickType = { person, [kind]: source };
		void send(JSON.stringify(body), '', 'application/json');
	}

	// A picture shrunk on the device before it goes, its long side at most `UPLOAD_SIDE`: a JPEG, or a PNG for a
	// banner that came as one. One the browser cannot draw goes as it is, for the server to try.
	async function shrink(file: File, kind: 'photo' | 'banner'): Promise<Blob> {
		try {
			const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
			const { width, height } = toFittedSize(bitmap.width, bitmap.height, UPLOAD_SIDE);
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
			bitmap.close();
			const type = kind === 'banner' && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
			const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.9));
			if (blob) return blob;
		} catch {
			// Sent as it is below.
		}
		return file;
	}

	async function upload(person: string, kind: 'photo' | 'banner', input: HTMLInputElement) {
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = `${kind}:upload`;
		const blob = await shrink(file, kind);
		const query = `?${new URLSearchParams({ kind, person })}`;
		await send(blob, query, blob.type || file.type);
	}

	let photoInput = $state<HTMLInputElement>();
	let bannerInput = $state<HTMLInputElement>();

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
				Pick its photo and banner, then press Copy and paste it into Outlook’s signature settings on
				a computer. The rest comes from {look.isAdmin ? 'each Team record' : 'your Team record'}, so
				a change there shows here.
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
				{:then loaded}
					{@const found = toShown(loaded)}
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
						{#if found.choices}
							{@const choices = found.choices}
							{@const person = found.signature.id}
							{#key round}
								<section aria-busy={busy.startsWith('photo')}>
									<h3 class="mb-1 px-1 text-sm font-semibold text-slate-900">Photo</h3>
									<p class="mb-3 px-1 text-xs text-slate-500">
										Always shown in a circle. It is the signature’s own, not your profile picture.
									</p>
									<div class="flex flex-wrap gap-3 px-1">
										{#each choices.photos as choice (choice.source)}
											{#if choice.preview}
												<Button
													type="radio"
													name="signature-photo"
													value={choice.source}
													checked={choice.source === choices.photo}
													padding="none"
													unstyled
													class="relative cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
													onToggle={(isOn) => isOn && pick(person, 'photo', choice.source)}
												>
													<Avatar
														src={choice.preview}
														alt={choice.label}
														size={64}
														ring={choice.source === choices.photo
															? 'ring-3 ring-primary ring-offset-2'
															: 'ring-1 ring-slate-900/10'}
													/>
													{#if busy === `photo:${choice.source}`}
														<span
															class="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"
															><span class="icon-[svg-spinners--ring-resize] size-6 text-slate-500"
															></span></span
														>
													{/if}
												</Button>
											{/if}
										{/each}
										<Button
											unstyled
											class="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-900/[0.05] text-slate-600 ring-1 ring-slate-900/10 transition hover:bg-slate-900/[0.09]"
											aria-label="Upload a photo"
											title="Upload a photo"
											onclick={() => photoInput?.click()}
										>
											<span
												class="{busy === 'photo:upload'
													? 'icon-[svg-spinners--ring-resize]'
													: 'icon-[mdi--camera-plus-outline]'} size-6"
											></span>
										</Button>
										<input
											bind:this={photoInput}
											type="file"
											accept="image/*"
											class="hidden"
											onchange={(event) => upload(person, 'photo', event.currentTarget)}
										/>
									</div>
								</section>
								<section aria-busy={busy.startsWith('banner')}>
									<h3 class="mb-1 px-1 text-sm font-semibold text-slate-900">Banner</h3>
									<p class="mb-3 px-1 text-xs text-slate-500">
										The picture under the signature. The Email Banners folder in Google Drive holds
										the company’s.
									</p>
									<div class="grid grid-cols-2 gap-3 px-1 sm:grid-cols-3">
										{#each [...choices.banners, { source: '', label: 'No banner', preview: '' }] as choice (choice.source)}
											{@const isPicked = choice.source === choices.banner}
											<Button
												type="radio"
												name="signature-banner"
												value={choice.source}
												checked={isPicked}
												padding="none"
												unstyled
												class="relative flex cursor-pointer flex-col gap-1.5 rounded-2xl p-1 text-left transition has-focus-visible:outline-2 has-focus-visible:outline-primary {isPicked
													? 'bg-primary/[0.06] ring-2 ring-primary'
													: 'ring-1 ring-slate-900/[0.06] hover:bg-slate-900/[0.03]'}"
												onToggle={(isOn) => isOn && pick(person, 'banner', choice.source)}
											>
												{#if choice.preview}
													<Image
														src={choice.preview}
														alt={choice.label}
														class="aspect-[24/7] w-full overflow-hidden rounded-xl bg-slate-900"
													/>
												{:else}
													<span
														class="flex aspect-[24/7] w-full items-center justify-center rounded-xl bg-slate-900/[0.04] text-slate-400"
														><span class="icon-[mdi--image-off-outline] size-6"></span></span
													>
												{/if}
												<span class="truncate px-1 pb-0.5 text-xs text-slate-600"
													>{choice.label}</span
												>
												{#if busy === `banner:${choice.source}`}
													<span
														class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70"
														><span class="icon-[svg-spinners--ring-resize] size-6 text-slate-500"
														></span></span
													>
												{/if}
											</Button>
										{/each}
										<Button
											unstyled
											class="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-900/[0.04] p-1 text-xs text-slate-600 ring-1 ring-slate-900/[0.06] transition hover:bg-slate-900/[0.08]"
											onclick={() => bannerInput?.click()}
										>
											<span
												class="{busy === 'banner:upload'
													? 'icon-[svg-spinners--ring-resize]'
													: 'icon-[mdi--image-plus-outline]'} size-6"
											></span>
											<span>Upload a banner</span>
										</Button>
										<input
											bind:this={bannerInput}
											type="file"
											accept="image/*"
											class="hidden"
											onchange={(event) => upload(person, 'banner', event.currentTarget)}
										/>
									</div>
									<p class="mt-2 px-1 text-xs text-slate-500">
										Banners are made 1200 by 350 pixels; one of another size is shown whole.
									</p>
								</section>
							{/key}
							{#if problem}
								<p
									class="px-1 text-sm text-red-600"
									role="alert"
								>
									{problem}
								</p>
							{/if}
						{/if}
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
