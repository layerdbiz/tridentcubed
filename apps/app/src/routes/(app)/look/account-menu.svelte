<script lang="ts">
	// The menu on a profile picture (run 33): your own Team page, the Organization, Install App and Log Out. One menu
	// for the two places a profile picture opens it (Justin, 2026-11-16): the bottom of the sidebar and the top right
	// of the phone's dashboard. Whoever uses it draws the picture (`picture`, told whether the menu is open). Install
	// App (#203) is there only while the app is not installed; a tap installs where the browser offered that, and
	// otherwise opens the how-to.
	import type { Snippet } from 'svelte';
	import { signOut } from '#lib/auth/auth.remote.js';
	import HowTo from '#lib/install/how-to.svelte';
	import { install } from '#lib/install/install.state.svelte.js';
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
		// After Profile or Organization opens, so a drawer can shut.
		onnavigate?: () => void;
	} = $props();

	const ACCOUNT = [
		{ id: 'profile', label: 'Profile', icon: 'icon-[mdi--account-circle-outline]' },
		{ id: 'organization', label: 'Organization', icon: 'icon-[mdi--domain]' },
		{ id: 'install', label: 'Install App', icon: 'icon-[mdi--cellphone-arrow-down]' },
		{ id: 'logout', label: 'Log Out', icon: 'icon-[mdi--logout]', isDanger: true }
	];
	const options = $derived(
		install.isShown ? ACCOUNT : ACCOUNT.filter((option) => option.id !== 'install')
	);

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
		if (id === 'organization') look.openSettings();
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
