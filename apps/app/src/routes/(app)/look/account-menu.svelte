<script lang="ts">
	// The menu on a profile picture (run 33): your own Team page, the Organization, Install App and Log Out. One menu
	// for the two places a profile picture opens it (Justin, 2026-11-16): the bottom of the sidebar and the top right
	// of the phone's dashboard. Whoever uses it draws the picture (`picture`, told whether the menu is open). Install
	// App (#203) is there only while the app is not installed; a tap installs where the browser offered that, and
	// otherwise opens the how-to. The Activity Log (#306) is everyone's since #403, each of only what they are privy
	// to. What's New (#363) shows every release, with the app's version under it. Email Signature (#354) opens one's
	// own Team page at its Preview. Settings (#403) holds them all on one page, and the Activity Log and what rings
	// the bell; the rest stay here too.
	import type { Snippet } from 'svelte';
	import { signOut } from '#lib/auth/auth.remote.js';
	import HowTo from '#lib/install/how-to.svelte';
	import { install } from '#lib/install/install.state.svelte.js';
	import { VERSION_LABEL } from '#lib/releases/releases.constants.js';
	import { whatsNew } from '#lib/releases/releases.state.svelte.js';
	import type { LookState } from './look.state.svelte';
	import { Menu } from '@layerd/ui';

	let {
		look,
		picture,
		align = 'left',
		isWide = false,
		onnavigate
	}: {
		look: LookState;
		picture: Snippet<[boolean]>;
		align?: 'left' | 'right';
		isWide?: boolean;
		// After Profile, Organization, Activity or Email Signature opens, so a drawer can shut.
		onnavigate?: () => void;
	} = $props();

	const ACCOUNT = [
		{ id: 'account', label: 'Settings', icon: 'icon-[mdi--cog-outline]' },
		{ id: 'profile', label: 'Profile', icon: 'icon-[mdi--account-circle-outline]' },
		{ id: 'organization', label: 'Organization', icon: 'icon-[mdi--domain]' },
		{ id: 'activity', label: 'Activity Log', icon: 'icon-[mdi--timeline-clock-outline]' },
		{ id: 'signature', label: 'Email Signature', icon: 'icon-[mdi--card-account-mail-outline]' },
		{ id: 'install', label: 'Install App', icon: 'icon-[mdi--cellphone-arrow-down]' },
		{ id: 'whats-new', label: "What's New", note: VERSION_LABEL, icon: 'icon-[mdi--gift-outline]' },
		{ id: 'logout', label: 'Log Out', icon: 'icon-[mdi--logout]', isDanger: true }
	];
	const options = $derived(ACCOUNT.filter((option) => option.id !== 'install' || install.isShown));

	// Each menu opens its own how-to: the sidebar's and the phone dashboard's can both be on the page.
	let isHowToOpen = $state(false);

	async function installApp() {
		if ((await install.tap()) === 'how-to') isHowToOpen = true;
	}

	// Log Out (#181) ends the session on the server, then loads the login page afresh, so nothing of this User's
	// stays in the page for whoever has the device next.
	async function logOut() {
		await signOut();
		location.assign('/login');
	}

	function pick(id: string) {
		if (id === 'logout') return void logOut();
		if (id === 'install') return void installApp();
		if (id === 'whats-new') return whatsNew.openAll();
		if (id === 'account') look.openAccount();
		else if (id === 'organization') look.openSettings();
		else if (id === 'activity') look.openActivity();
		else if (id === 'signature') look.openSignature();
		else if (look.me) look.openRecord('team', look.me.name, 'page');
		onnavigate?.();
	}
</script>

<Menu
	label="Account"
	value=""
	{options}
	{align}
	{isWide}
	onpick={pick}
>
	{#snippet trigger(_, isOpen)}{@render picture(isOpen)}{/snippet}
</Menu>

{#if isHowToOpen}<HowTo onclose={() => (isHowToOpen = false)} />{/if}
