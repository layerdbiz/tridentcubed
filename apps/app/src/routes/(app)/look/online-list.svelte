<script lang="ts">
	// The menu's Online panel (#212, #226; #331 and #337, Justin, 2026-11-25): everyone who has used the app, and
	// nobody else. Green dots first, whoever came online last at the top, then the orange dots, then the grey ones,
	// whoever was in the app last at the top (`onlineOf`, look.data.ts). Two rows each: the name with the device they
	// last used right behind it, as small icons (its kind, its system and its browser, or the app's own icon for the
	// installed app), then how long they have been online or away ("Online 30 min"), in place of the job title this
	// list showed before. Everything comes from stamps the server sets when someone uses the app (#185), so nobody here
	// is made up. The list keeps time while it is open. A tap opens their Team record.
	import { ICON_192 } from '#lib/install/install.constants.js';
	import { toDeviceIcons } from '#lib/presence/presence.utils.js';
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

	const TEXT_TONES: Record<PresenceType, string> = {
		online: 'text-emerald-700',
		idle: 'text-amber-700',
		offline: 'text-slate-500'
	};

	// The time every dot and every "Online 25 min" here is read at, moved on twice a minute.
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
	{@const icons = toDeviceIcons(member.device, member.deviceName ?? '')}
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
			<span class="flex min-w-0 items-center gap-1.5">
				<span class="truncate text-sm text-slate-800">{member.name}</span>
				{#if member.deviceName}
					<span
						class="flex shrink-0 items-center gap-1"
						role="img"
						aria-label={member.deviceName}
					>
						{#if icons.kind}<span class="{icons.kind} size-3.5 text-slate-400"></span>{/if}
						{#if icons.system}<span class="{icons.system} size-3"></span>{/if}
						{#if icons.isApp}<img
								src={ICON_192}
								alt=""
								class="size-3 rounded-[3px]"
							/>{:else if icons.browser}<span class="{icons.browser} size-3"></span>{/if}
					</span>
				{/if}
			</span>
			<span class="block truncate text-xs {TEXT_TONES[presence]}">{text}</span>
		</span>
	</button>
{/each}
