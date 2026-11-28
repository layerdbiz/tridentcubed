<script lang="ts">
	// Settings (#403; Justin, 2026-11-27: "a full-blown settings type page that houses activity log, profile,
	// organization", like Discord's or the Claude and ChatGPT desktop apps'; the hub he picked for its first version):
	// everything that is the person's own rather than a project's, in three groups. You: Profile, Notifications and
	// Email Signature. Organization: the Organization and the Activity Log. App: What's New and
	// Install App. Then Log Out and the version.
	//
	// A desktop shows the groups down the left and the Activity Log or what the bell shows on the right; a phone shows
	// the groups as rows, and those two open on a page of their own with a back arrow. Profile and the Organization open
	// the pages they have always had, and Email Signature one's Team page at its Preview (#354), whose back comes back
	// here; What's New opens its window.
	import { Avatar, Button, Chip, ListRow, Scroller } from '@layerd/ui';
	import { signOut } from '#lib/auth/auth.remote.js';
	import HowTo from '#lib/install/how-to.svelte';
	import { install } from '#lib/install/install.state.svelte.js';
	import { VERSION_LABEL } from '#lib/releases/releases.constants.js';
	import { whatsNew } from '#lib/releases/releases.state.svelte.js';
	import { HEADING, HEADING_HEIGHT } from './activity-list.svelte';
	import ActivityLog from './activity-log.svelte';
	import Back from './back.svelte';
	import type { AccountSectionType, LookState } from './look.state.svelte';
	import { faceOf } from './marks';
	import { NEW_DAYS } from './seen';
	import { ROLE_LABELS } from './team.data';

	let { look, isWide }: { look: LookState; isWide: boolean } = $props();

	type ItemType = { id: string; label: string; icon: string; note?: string };
	type GroupType = { label: string; items: ItemType[] };

	const groups = $derived<GroupType[]>([
		{
			label: 'You',
			items: [
				{ id: 'profile', label: 'Profile', icon: 'icon-[mdi--account-circle-outline]' },
				{ id: 'notifications', label: 'Notifications', icon: 'icon-[mdi--bell-outline]' },
				{ id: 'signature', label: 'Email Signature', icon: 'icon-[mdi--card-account-mail-outline]' }
			]
		},
		{
			label: 'Organization',
			items: [
				{ id: 'organization', label: 'Organization', icon: 'icon-[mdi--domain]' },
				{ id: 'activity', label: 'Activity Log', icon: 'icon-[mdi--timeline-clock-outline]' }
			]
		},
		{
			label: 'App',
			items: [
				{
					id: 'whats-new',
					label: "What's New",
					icon: 'icon-[mdi--gift-outline]',
					note: VERSION_LABEL
				},
				...(install.isShown
					? [{ id: 'install', label: 'Install App', icon: 'icon-[mdi--cellphone-arrow-down]' }]
					: [])
			]
		}
	]);

	const titles = $derived<Record<AccountSectionType, [string, string]>>({
		activity: [
			'Activity Log',
			look.isAdmin
				? 'Everything everyone does, newest first.'
				: 'Everything in your projects and your own doing, newest first.'
		],
		notifications: ['Notifications', 'What rings your bell. Your own doing never does.']
	});

	const me = $derived(look.me);
	const name = $derived(me?.name ?? look.organization.name);
	const role = $derived(look.isSuperAdmin ? 'Super admin' : me?.role ? ROLE_LABELS[me.role] : '');
	// The part open on a phone ('' is the menu).
	const part = $derived(look.accountSection);
	// A desktop always shows a part beside the menu: the Activity Log, until Notifications is picked. Everyone has an
	// Activity Log (#403, Justin, 2026-11-28): an Admin's is everyone's, anyone else's what they are privy to.
	const shown = $derived<AccountSectionType>(
		look.accountSection === 'notifications' ? 'notifications' : 'activity'
	);

	let isHowToOpen = $state(false);

	async function installApp() {
		if ((await install.tap()) === 'how-to') isHowToOpen = true;
	}

	// Log Out (#181) ends the session on the server, then loads the login page afresh.
	async function logOut() {
		await signOut();
		location.assign('/login');
	}

	function pick(id: string) {
		if (id === 'notifications' || id === 'activity') look.accountSection = id;
		else if (id === 'whats-new') whatsNew.openAll();
		else if (id === 'install') void installApp();
		else if (id === 'organization') look.openFromAccount(() => look.openSettings());
		else if (id === 'signature') look.openFromAccount(() => look.openSignature());
		else if (id === 'profile' && me)
			look.openFromAccount(() => look.openRecord('team', me.name, 'page'));
	}

	// What the bell shows, and what it never does (bell.svelte.ts and the server's `readNotifications`).
	const RINGS: [string, string][] = [
		[
			'Changes in your projects',
			'What others change in a project you are on: on its Team Assigned, its Team Lead, or one you started'
		],
		[
			'When you are added or taken off',
			"Someone puts you on, or takes you off, a project's Team Assigned"
		],
		['Changes to your Team record', 'Someone else changes your details or your role'],
		['New versions', "What's New's last 3 days; a tap opens What's New"]
	];
</script>

<!-- ---------- Pieces ---------- -->

{#snippet heading(label: string)}
	<h3
		class="px-1 pt-5 pb-2 text-xs font-semibold tracking-[0.08em] text-slate-400 uppercase first:pt-0"
	>
		{label}
	</h3>
{/snippet}

<!-- A rule of the bell: a tick (or a cross for what never rings), its name and what it means, wrapping on a phone. -->
{#snippet rule(label: string, note: string, isOn: boolean)}
	{#snippet mark()}<span
			class="mr-3 size-5 shrink-0 {isOn
				? 'icon-[mdi--check-circle] text-emerald-500'
				: 'icon-[mdi--close-circle-outline] text-slate-400'}"
			aria-hidden="true"
		></span>{/snippet}
	<li>
		<ListRow
			class="min-h-14 px-4 py-2.5"
			labelClass="text-sm font-medium text-slate-900"
			start={mark}
			{label}><p class="text-xs leading-5 text-slate-500">{note}</p></ListRow
		>
	</li>
{/snippet}

{#snippet notifications()}
	{@render heading('The bell shows')}
	<ul
		class="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]"
	>
		{#each RINGS as [label, note] (label)}{@render rule(label, note, true)}{/each}
	</ul>
	{@render heading('Never')}
	<ul class="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]">
		{@render rule(
			'Your own doing',
			'Your changes, sign-ins and sign-outs, projects opened, PDFs downloaded',
			false
		)}
	</ul>
	<p class="px-1 pt-3 text-xs text-slate-500">
		A line stays light blue, and counts on the bell, until you tap it, for up to {NEW_DAYS} days.
	</p>
{/snippet}

{#snippet section(id: AccountSectionType)}
	{#if id === 'activity'}<ActivityLog {look} />{:else}{@render notifications()}{/if}
{/snippet}

<!-- A row of the menu: its icon on a soft square, its name, a note (the version), and a chevron on a phone. -->
{#snippet item(each: ItemType, isOn: boolean)}
	{#snippet icon()}<span
			class="mr-3 flex shrink-0 items-center justify-center {isWide
				? ''
				: 'size-8 rounded-xl bg-slate-100'} {isOn ? 'text-primary' : 'text-slate-500'}"
			><span class="{each.icon} size-[18px]"></span></span
		>{/snippet}
	{#snippet end()}{#if each.note}<span class="ml-2 text-xs text-slate-400">{each.note}</span
			>{/if}{#if !isWide}<span class="ml-1 icon-[mdi--chevron-right] size-5 text-slate-300"
			></span>{/if}{/snippet}
	<li>
		<ListRow
			tag="button"
			type="button"
			class="w-full transition {isWide
				? `rounded-xl px-2 py-1.5 text-sm ${isOn ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/[0.06]' : 'text-slate-600 hover:bg-slate-900/[0.04]'}`
				: 'min-h-13 px-3 py-2.5 text-[15px] font-medium text-slate-900'}"
			aria-current={isOn ? 'page' : undefined}
			start={icon}
			label={each.label}
			{end}
			onclick={() => pick(each.id)}
		/>
	</li>
{/snippet}

<!-- ---------- Phone ---------- -->

{#if !isWide}
	<div class="flex h-dvh flex-col bg-slate-100">
		<header
			class="flex shrink-0 items-center gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2"
		>
			<Back
				label={part ? 'Back to Settings' : 'Back'}
				onclick={() => (part ? (look.accountSection = '') : look.home())}
			/>
			<h1 class="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
				{part ? titles[part][0] : 'Settings'}
			</h1>
		</header>
		{#if part === 'activity'}
			<Scroller
				fade="y"
				inset={{ top: HEADING_HEIGHT }}
				keep={HEADING}
				class="min-h-0 flex-1 overscroll-y-contain bg-white px-3 pt-3 pb-10"
			>
				<ActivityLog {look} />
			</Scroller>
		{:else}
			<Scroller
				fade="y"
				class="min-h-0 flex-1 overscroll-y-contain px-4 pb-10"
			>
				{#if part}
					<p class="px-1 pb-3 text-sm text-slate-500">{titles[part][1]}</p>
					{@render section(part)}
				{:else}
					{#snippet face()}<Avatar
							{...faceOf(name, { hasPresence: false })}
							size={52}
							class="mr-3"
						/>{/snippet}
					{#snippet faceEnd()}{#if role}<Chip
								label={role}
								class="bg-primary/10 text-primary"
							/>{/if}<span class="ml-1 icon-[mdi--chevron-right] size-5 text-slate-300"
						></span>{/snippet}
					<ListRow
						tag="button"
						type="button"
						class="mb-5 w-full rounded-2xl bg-white p-3 ring-1 ring-slate-900/[0.06]"
						labelClass="text-base font-semibold text-slate-900"
						noteClass="text-sm text-slate-500"
						start={face}
						label={name}
						note={me?.title || look.organization.name}
						end={faceEnd}
						onclick={() => pick('profile')}
					/>
					<nav aria-label="Settings">
						{#each groups as group (group.label)}
							{@render heading(group.label)}
							<ul
								class="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/[0.06]"
							>
								{#each group.items as each (each.id)}{@render item(each, false)}{/each}
							</ul>
						{/each}
					</nav>
					<Button
						danger
						lite
						lg
						icon="icon-[mdi--logout]"
						label="Log Out"
						class="mt-6 w-full"
						onclick={logOut}
					/>
					<p class="pt-6 text-center text-xs text-slate-400">
						{look.organization.name} · {VERSION_LABEL}
					</p>
				{/if}
			</Scroller>
		{/if}
	</div>

	<!-- ---------- Desktop ---------- -->
{:else}
	<div class="flex h-dvh bg-white">
		<nav
			class="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 px-3 py-4"
			aria-label="Settings"
		>
			<div class="mb-3 flex items-center gap-1">
				<Back
					label="Back to the app"
					onclick={() => look.home()}
				/>
				<h1 class="text-lg font-semibold text-slate-900">Settings</h1>
			</div>
			{#snippet face()}<Avatar
					{...faceOf(name, { hasPresence: false })}
					size={40}
					class="mr-3"
				/>{/snippet}
			<ListRow
				tag="button"
				type="button"
				class="mb-2 w-full rounded-xl px-2 py-1.5 hover:bg-slate-900/[0.04]"
				labelClass="text-sm font-semibold text-slate-900"
				noteClass="text-xs text-slate-500"
				start={face}
				label={name}
				note={[role, look.organization.name].filter(Boolean).join(' · ')}
				onclick={() => pick('profile')}
			/>
			<Scroller
				fade="y"
				class="min-h-0 flex-1"
			>
				{#each groups as group (group.label)}
					<p
						class="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase"
					>
						{group.label}
					</p>
					<ul>
						{#each group.items as each (each.id)}{@render item(each, shown === each.id)}{/each}
					</ul>
				{/each}
			</Scroller>
			<Button
				danger
				ghost
				sm
				icon="icon-[mdi--logout]"
				label="Log Out"
				class="justify-start"
				onclick={logOut}
			/>
		</nav>
		<!-- The part beside the menu scrolls in the library Scroller, the Activity Log's day headings sticking to its
		     top above the fade. -->
		<main class="flex min-w-0 flex-1 flex-col">
			<Scroller
				fade="y"
				inset={shown === 'activity' ? { top: HEADING_HEIGHT } : {}}
				keep={HEADING}
				class="min-h-0 flex-1 overscroll-y-contain"
			>
				<div class="mx-auto w-full max-w-3xl px-10 pt-8 pb-16">
					<h2 class="text-2xl font-semibold text-slate-900">{titles[shown][0]}</h2>
					<p class="mt-1 mb-6 text-sm text-slate-500">{titles[shown][1]}</p>
					{@render section(shown)}
				</div>
			</Scroller>
		</main>
	</div>
{/if}

{#if isHowToOpen}<HowTo onclose={() => (isHowToOpen = false)} />{/if}
