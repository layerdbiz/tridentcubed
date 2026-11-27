<script lang="ts">
	// Email Signature (#354; Justin, 2026-11-26: "a way for team members to log in to the app and copy and paste their
	// email signatures into their Microsoft Outlook"). Anyone opens their own from the menu on their profile picture;
	// an Admin picks anyone on the Team page or a shared mailbox. It is the website's signature (`/company/emails`,
	// #62) moved into the app: the library's Email writes it, and the server copies every picture to the app's public
	// signature address (#lib/server/signature.ts), since a pasted signature's pictures are loaded by every reader's
	// mail app, signed out. The person picks or uploads their signature's photo, always a circle and never their
	// profile picture, and the banner at the bottom (Justin, 2026-11-27).
	// Round 3 (Justin, 2026-11-27: "we should be using the way that we've already built the app with the ... edit
	// panels and the preview"): built like the Organization and a project, with Page, Edit and Preview on the bottom
	// bar. Page says what it is and how to add it to Outlook. Edit is the Project panel's sections (group.svelte):
	// Details, the Team record's own fields, which the signature shows as they are typed, then Photo and Banner. On
	// a desktop Edit keeps its floating column with the signature beside it. Preview is the signature alone on the
	// report's canvas (signature-canvas.svelte), with Copy in the zoom bar where Download is.
	import {
		Avatar,
		Button,
		Email,
		Image,
		Input,
		ListRow,
		Menu,
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
		SignaturePickType
	} from '#lib/signature/signature.types.js';
	import { toLiveSignature } from '#lib/signature/signature.utils.js';
	import Group from './group.svelte';
	import { PROJECT_TABS, type LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import PageHeader from './page-header.svelte';
	import SignatureCanvas from './signature-canvas.svelte';

	let { look, isWide }: { look: LookState; isWide: boolean } = $props();

	const FLOAT =
		'rounded-[28px] bg-white/85 shadow-[0_2px_6px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.35)] ring-1 ring-white/70 backdrop-blur-xl';
	const CARD = 'rounded-3xl bg-slate-50 ring-1 ring-slate-900/[0.04]';
	const MAILBOX = 'mailbox:';
	// Words people type in sentences keep the phone's own help, as in the panels.
	const TYPING = { autocapitalize: 'sentences', autocorrect: 'on', spellcheck: true } as const;

	// Whose signature: the User's own first, then whoever an Admin picks.
	let picked = $state('');
	const ask = $derived<SignatureAskType>(
		picked.startsWith(MAILBOX)
			? { mailbox: picked.slice(MAILBOX.length) }
			: picked
				? { person: picked }
				: {}
	);
	const askKey = $derived(JSON.stringify(ask));

	async function load(asked: SignatureAskType): Promise<SignatureAnswerType> {
		const query = new URLSearchParams();
		if (asked.person) query.set('person', asked.person);
		if (asked.mailbox) query.set('mailbox', asked.mailbox);
		const response = await fetch(`${SIGNATURE_API}?${query}`, { cache: 'no-store' });
		const found = (await response.json().catch(() => undefined)) as SignatureAnswerType | undefined;
		if (!found) throw new Error(`The signature answered ${response.status}.`);
		return found;
	}

	// The answer for the signature asked for; no `answer` when it could not load.
	let loaded = $state<{ key: string; answer?: SignatureAnswerType }>();
	$effect(() => {
		const key = askKey;
		let isAsked = true;
		load(ask).then(
			(answer) => isAsked && (loaded = { key, answer }),
			() => isAsked && (loaded = { key })
		);
		return () => (isAsked = false);
	});
	const isLoading = $derived(loaded?.key !== askKey);

	// The answer after a pick or an upload, for the signature it was made for; a pick that was refused says why.
	let changed = $state<{ key: string; answer: SignatureAnswerType }>();
	let busy = $state('');
	let problem = $state('');
	// Drawn again after a refused pick, so the picked circle goes back to the one the signature shows.
	let round = $state(0);

	const found = $derived(
		isLoading || !loaded?.answer
			? undefined
			: changed?.key === askKey
				? changed.answer
				: loaded.answer
	);
	const allowed = $derived(found?.isAllowed ? found : undefined);

	// A person's Team record, which Details changes; the signature shows it as it is typed, the Sheet still filling in
	// what it leaves empty, as the server does.
	const member = $derived(
		allowed?.signature.type === 'person'
			? look.members.find((each) => each.id === allowed.signature.id)
			: undefined
	);
	// The Name is kept when it is left, as on the Team page; until then the signature shows it as typed.
	let typedName = $state<string>();
	const signature = $derived(
		allowed && member && allowed.sheet
			? toLiveSignature(
					allowed.signature,
					{ ...member, name: typedName ?? member.name },
					allowed.sheet
				)
			: allowed?.signature
	);

	// The library Email writes the signature's HTML once drawn; the canvas shows and copies it.
	let email = $state<{ getHTML: () => string }>();
	const html = $derived(signature && email ? email.getHTML() : '');

	async function send(body: BodyInit, query: string, type: string) {
		const key = askKey;
		problem = '';
		try {
			const response = await fetch(`${SIGNATURE_API}${query}`, {
				method: 'POST',
				body,
				headers: { 'content-type': type }
			});
			const answer = (await response.json().catch(() => undefined)) as
				| SignatureAnswerType
				| undefined;
			if (!answer) throw new Error(`The signature answered ${response.status}.`);
			if (answer.isAllowed) changed = { key, answer };
			else problem = answer.reason;
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
		if (allowed?.mailboxes.length) mailboxes = allowed.mailboxes;
	});

	// An Admin's picker: everyone on the Team page in its order, then the shared mailboxes.
	const people = $derived(
		look.members
			.filter((each) => each.id)
			.toSorted((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
	);
	const options = $derived<MenuOptionType[]>([
		...people.map((each) => {
			const image = faceOf(each.name, { hasPresence: false }).src || undefined;
			return {
				id: each.id ?? '',
				label: each.name,
				note: each.title || undefined,
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
	const whose = $derived(
		signature?.name || options.find((option) => option.id === shownId)?.label || ''
	);

	// Edit's sections, as a Project panel's open and close; all three start open, there being only these.
	let open = $state<string[]>(['details', 'photo', 'banner']);
	function toggle(id: string) {
		open = open.includes(id) ? open.filter((item) => item !== id) : [...open, id];
	}

	// What an input holds, as text: the library's Input may hand back no value at all.
	function toText(value: unknown) {
		return String(value ?? '');
	}

	// The Name is left: the Team record takes the name typed; turned down, it shows its own name again.
	function rename() {
		const name = typedName;
		typedName = undefined;
		if (name !== undefined && member) look.rename('team', member.name, name);
	}

	function leaveOnEnter(event: KeyboardEvent) {
		if (event.key === 'Enter') (event.target as HTMLElement).blur();
	}

	function setDetail(change: Record<string, string>) {
		if (member) look.patch('team', member.name, change);
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

	// The phone's three panes, swiped between or picked on the bottom bar, as a project's are.
	let swiper: HTMLDivElement | undefined = $state();
	let top = $state(0);
	let isLanded = false;

	function onscroll() {
		if (!swiper?.clientWidth) return;
		look.tabProgress = swiper.scrollLeft / swiper.clientWidth;
		look.tab = PROJECT_TABS[Math.round(look.tabProgress)] ?? 'page';
	}

	$effect(() => {
		if (!swiper) return;
		const left = Math.max(0, PROJECT_TABS.indexOf(look.tab)) * swiper.clientWidth;
		if (!isLanded) {
			isLanded = true;
			swiper.scrollLeft = left;
			look.tabProgress = Math.max(0, PROJECT_TABS.indexOf(look.tab));
		} else if (Math.abs(swiper.scrollLeft - left) > swiper.clientWidth / 2)
			swiper.scrollTo({ left, behavior: 'smooth' });
	});

	// On Preview the canvas takes every drag, so a strip on the left edge swipes back to Edit, as on a project.
	let edge: { x: number; left: number } | undefined;

	function edgeDown(event: PointerEvent) {
		if (!swiper) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		edge = { x: event.clientX, left: swiper.scrollLeft };
		swiper.style.scrollSnapType = 'none';
	}

	function edgeMove(event: PointerEvent) {
		if (!edge || !swiper) return;
		swiper.scrollLeft = edge.left - Math.max(0, event.clientX - edge.x);
	}

	function edgeUp(event: PointerEvent) {
		if (!edge || !swiper) return;
		const isBack = event.clientX - edge.x > swiper.clientWidth * 0.2;
		edge = undefined;
		swiper.style.scrollSnapType = '';
		look.tab = isBack ? 'edit' : 'preview';
		swiper.scrollTo({
			left: PROJECT_TABS.indexOf(look.tab) * swiper.clientWidth,
			behavior: 'smooth'
		});
	}
</script>

<!-- Drawn out of sight: the library Email writes the HTML the canvas shows. -->
{#if signature}
	<div class="hidden">
		<Email
			data={signature}
			onMount={(instance) => (email = instance)}
		/>
	</div>
{/if}

<!-- Loading, or why there is nothing to show. -->
{#snippet status()}
	{#if isLoading}
		<div
			class="flex justify-center py-16"
			role="status"
		>
			<span class="icon-[svg-spinners--ring-resize] size-8 text-slate-400"></span>
			<span class="sr-only">Loading</span>
		</div>
	{:else if found && !found.isAllowed}
		<p class="px-1 py-10 text-center text-sm text-slate-500">{found.reason}</p>
	{:else if !found}
		<p class="px-1 py-10 text-center text-sm text-slate-500">
			The signature could not load. Check the connection and open it again.
		</p>
	{/if}
{/snippet}

<!-- An Admin's picker of whose signature it is. -->
{#snippet whoseMenu()}
	<Menu
		class="block"
		label="Whose signature"
		value={shownId}
		{options}
		isWide
		isSearchable
		align="left"
		onpick={(id) => {
			typedName = undefined;
			picked = id;
		}}
	>
		{#snippet trigger(current, isOpen)}
			<ListRow
				class="w-full gap-3 px-4 py-2.5 text-left transition hover:bg-slate-900/[0.03] {CARD}"
				label={current?.label ?? 'Pick someone'}
				labelClass="text-sm font-medium text-slate-900"
				note={current?.note ?? 'Whose signature'}
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
							><span class="{current?.icon ?? 'icon-[mdi--account-circle-outline]'} size-5"
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
{/snippet}

<!-- Edit: the same sections a Project panel has, each opening and closing. -->
{#snippet form()}
	<div class="space-y-3">
		{#if look.isAdmin && options.length}{@render whoseMenu()}{/if}
		{#if !allowed || !signature}
			{@render status()}
		{:else}
			<Group
				title="Details"
				values={member
					? [member.name, member.title, member.phone, member.email]
					: [signature.name, signature.title, signature.phone, signature.email]}
				icon="icon-[mdi--card-account-details-outline]"
				isOpen={open.includes('details')}
				ontoggle={() => toggle('details')}
			>
				{#if member}
					<!-- The Team record itself: a change here is a change there, and saves as it is typed. -->
					<div class="min-w-0 space-y-3">
						<Input
							label="Name"
							{...TYPING}
							bind:value={() => typedName ?? member.name, (name) => (typedName = toText(name))}
							onchange={rename}
							onfocusout={() => (typedName = undefined)}
							onkeydown={leaveOnEnter}
							help={look.helpOf('team.name')}
						/>
						<Input
							label="Title"
							{...TYPING}
							bind:value={() => member.title, (title) => setDetail({ title: toText(title) })}
							help={look.helpOf('team.title')}
						/>
						<Input
							label="Phone"
							type="tel"
							inputmode="tel"
							autocomplete="off"
							bind:value={() => member.phone, (phone) => setDetail({ phone: toText(phone) })}
							help={look.helpOf('team.phone')}
						/>
						<Input
							label="Email"
							type="email"
							inputmode="email"
							autocomplete="off"
							bind:value={() => member.email, (value) => setDetail({ email: toText(value) })}
							help={look.helpOf('team.email')}
						/>
						<p class="px-1 text-xs text-slate-500">
							These are the Team record’s. A field left empty shows the website’s signature Sheet.
						</p>
					</div>
				{:else}
					<!-- A shared mailbox lives in the website's signature Sheet. -->
					<dl class="divide-y divide-slate-900/[0.05] {CARD}">
						{#each [['Name', signature.name], ['Title', signature.title], ['Phone', signature.phone], ['Email', signature.email]] as [label, value] (label)}
							<div class="flex justify-between gap-3 px-4 py-2.5 text-sm">
								<dt class="shrink-0 text-slate-500">{label}</dt>
								<dd class="min-w-0 text-right font-medium break-words text-slate-900">
									{value || '—'}
								</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#snippet actions()}
					{#if !member}
						<Button
							primary
							lite
							xs
							icon="icon-[mdi--open-in-new]"
							label="Change in the Sheet"
							href={SHEET_EDIT_URL}
							target="_blank"
							rel="noopener"
						/>
					{/if}
				{/snippet}
			</Group>
			{#if allowed.choices}
				{@const choices = allowed.choices}
				{@const person = allowed.signature.id}
				{@const photo = choices.photos.find((choice) => choice.source === choices.photo)}
				{@const banner = choices.banners.find((choice) => choice.source === choices.banner)}
				{#key round}
					<Group
						title="Photo"
						meta={photo?.label ?? ''}
						image={photo?.preview || undefined}
						icon="icon-[mdi--account-circle-outline]"
						isOpen={open.includes('photo')}
						ontoggle={() => toggle('photo')}
					>
						<div aria-busy={busy.startsWith('photo')}>
							<p class="mb-3 px-1 text-xs text-slate-500">
								Always shown in a circle. It is the signature’s own, not the profile picture.
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
											title={choice.label}
											onToggle={(isOn) => isOn && pick(person, 'photo', choice.source)}
										>
											<Avatar
												src={choice.preview}
												alt={choice.label}
												size={56}
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
									class="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-900/[0.05] text-slate-600 ring-1 ring-slate-900/10 transition hover:bg-slate-900/[0.09]"
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
						</div>
					</Group>
					<Group
						title="Banner"
						meta={choices.banner ? (banner?.label ?? '') : 'None'}
						icon="icon-[mdi--image-outline]"
						isOpen={open.includes('banner')}
						ontoggle={() => toggle('banner')}
					>
						<div aria-busy={busy.startsWith('banner')}>
							<p class="mb-3 px-1 text-xs text-slate-500">
								The picture under the signature. The Email Banners folder in Google Drive holds the
								company’s.
							</p>
							<div class="grid grid-cols-2 gap-3 px-1">
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
										<span class="truncate px-1 pb-0.5 text-xs text-slate-600">{choice.label}</span>
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
						</div>
					</Group>
				{/key}
			{/if}
			{#if problem}
				<p
					class="px-1 text-sm text-red-600"
					role="alert"
				>
					{problem}
				</p>
			{/if}
		{/if}
	</div>
{/snippet}

<!-- Page: what the signature is and how it goes into Outlook, on a dark top with a white sheet under it. -->
{#snippet page()}
	<div class="h-full overflow-y-auto overscroll-y-contain bg-white">
		<div
			class="flex flex-col items-center bg-linear-to-br from-slate-700 to-slate-950 px-6 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16 text-center text-white"
		>
			{#if signature?.src}
				<Avatar
					src={signature.src}
					alt={signature.name}
					size={96}
					ring="ring-4 ring-white/15"
				/>
			{:else}
				<span class="flex size-24 items-center justify-center rounded-full bg-white/10"
					><span class="icon-[mdi--card-account-mail-outline] size-11"></span></span
				>
			{/if}
			<h1 class="mt-4 text-2xl leading-tight font-semibold">Email Signature</h1>
			{#if whose}<p class="mt-1 text-sm font-medium text-white/85">{whose}</p>{/if}
			<p class="mt-2 max-w-md text-sm text-white/70">
				Edit changes its details, photo and banner. Preview shows it: press Copy there, then paste
				it into Outlook’s signature settings on a computer.
			</p>
		</div>
		<div
			class="-mt-8 rounded-t-[40px] bg-white px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+96px)]"
		>
			<section class="mx-auto max-w-2xl">
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
					Outlook keeps the signature with your mailbox, so pasting it once on a computer brings it
					to Outlook on the web too. Outlook on a phone cannot use it.
				</p>
			</section>
		</div>
	</div>
{/snippet}

<!-- Preview: the signature on the canvas, or why there is none yet. -->
{#snippet preview(room: { left?: number; top?: number; isLeft?: boolean })}
	{#if html}
		<SignatureCanvas
			{look}
			{html}
			{...room}
		/>
	{:else}
		<div
			class="flex h-full items-center justify-center bg-slate-100"
			style:padding-left="{room.left ?? 0}px"
		>
			{@render status()}
		</div>
	{/if}
{/snippet}

{#if isWide && look.tab === 'page'}
	<!-- A desktop's Page: what it is, alone (Page, Edit and Preview are three views), its back arrow over the top. -->
	<div class="fixed inset-0 bg-slate-100">
		<PageHeader
			{look}
			title="Email Signature"
			kind={whose}
			reveal={0}
			isLight
			hasChevron={look.variant('header') === 'C'}
		/>
		{@render page()}
	</div>
{:else if isWide && look.tab === 'preview'}
	<div class="fixed inset-0">{@render preview({})}</div>
{:else if isWide}
	<div class="fixed inset-0">{@render preview({ left: 444, isLeft: true })}</div>
	<aside class="fixed top-3 bottom-3 left-3 z-40 flex w-[420px] flex-col overflow-hidden {FLOAT}">
		<div class="relative h-[72px] shrink-0">
			<PageHeader
				{look}
				title="Email Signature"
				kind={whose}
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
			title="Email Signature"
			kind={whose}
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
			<div class="relative h-full w-full shrink-0 snap-start">
				{@render preview({ top })}
				<div
					class="absolute bottom-0 left-0 z-10 w-6 touch-none"
					style="top: {top}px"
					aria-hidden="true"
					onpointerdown={edgeDown}
					onpointermove={edgeMove}
					onpointerup={edgeUp}
					onpointercancel={edgeUp}
				></div>
			</div>
		</div>
	</div>
{/if}
