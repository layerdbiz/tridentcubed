<script lang="ts">
	// The menu's Online panel (#212, #226; #331, Justin, 2026-11-25): everyone who has used the app, and nobody else.
	// Green dots first, whoever came online last at the top, then the orange dots, then the grey ones, whoever was in
	// the app last at the top (`onlineOf`, look.data.ts). Under each name, how long they have been online or away (in
	// place of their job title, which this list showed before), and the device they last used, as the server read it
	// from their browser. Everything comes from stamps the server
	// sets when someone uses the app (#185), so nobody here is made up. The list keeps time while it is open. A tap
	// opens their Team record.
	import type { DeviceKindType } from '#lib/presence/presence.utils.js';
	import Avatar from './avatar.svelte';
	import { onlineOf, presenceOf, toPresenceText } from './look.data';
	import type { LookState } from './look.state.svelte';
	import type { PresenceType, TeamMemberType } from './team.data';

	let {
		look,
		size = 36,
		width = 40,
		words = '',
		onpick
	}: {
		look: LookState;
		size?: number;
		// The width the face centres in, so the menu's icons line up in one column.
		width?: number;
		words?: string;
		onpick?: () => void;
	} = $props();

	const DEVICE_ICONS: Record<DeviceKindType, string> = {
		phone: 'icon-[mdi--cellphone]',
		tablet: 'icon-[mdi--tablet]',
		computer: 'icon-[mdi--laptop]'
	};

	const TEXT_TONES: Record<PresenceType, string> = {
		online: 'text-emerald-700',
		idle: 'text-amber-700',
		offline: 'text-slate-500'
	};

	// The time every dot and every "for 25 min" here is read at, moved on twice a minute.
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	function open(member: TeamMemberType) {
		onpick?.();
		look.openRecord('team', member.name);
	}
</script>

{#each onlineOf(look.members, now) as member (member.name)}
	{@const presence = presenceOf(member.name, now)}
	{@const text = toPresenceText(member, now)}
	<button
		type="button"
		class="flex w-full min-w-0 items-center gap-2 rounded-2xl py-1.5 text-left hover:bg-slate-900/[0.04]"
		title={[member.name, text, member.deviceName].filter(Boolean).join(' · ')}
		onclick={() => open(member)}
	>
		<span
			class="flex shrink-0 justify-center"
			style="width: {width}px"
		>
			<Avatar
				name={member.name}
				{size}
				{presence}
				ring="ring-slate-200"
			/>
		</span>
		<span class="min-w-0 flex-1 {words}">
			<span class="block truncate text-sm text-slate-800">{member.name}</span>
			<span class="block truncate text-xs {TEXT_TONES[presence]}">{text}</span>
			{#if member.deviceName}
				<span class="flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
					{#if member.device}<span
							class="{DEVICE_ICONS[member.device]} size-3.5 shrink-0"
							aria-hidden="true"
						></span>{/if}
					<span class="truncate">{member.deviceName}</span>
				</span>
			{/if}
		</span>
	</button>
{/each}
