<script lang="ts">
	// The menu's Online panel (#212; Justin, 2026-11-18): the team members in the app right now, the signed-in person
	// first. It reads the same stamp as the green dot on a face (`onlineOf`, look.data.ts), which the server sets when
	// someone uses the app (#185), so nobody here is made up. A tap opens their Team record.
	import Avatar from './avatar.svelte';
	import { onlineOf } from './look.data';
	import type { LookState } from './look.state.svelte';
	import type { TeamMemberType } from './team.data';

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

	function open(member: TeamMemberType) {
		onpick?.();
		look.openRecord('team', member.name);
	}
</script>

{#each onlineOf(look.members) as member (member.name)}
	<button
		type="button"
		class="flex w-full min-w-0 items-center gap-2 rounded-2xl py-1.5 text-left hover:bg-slate-900/[0.04]"
		title={member.name}
		onclick={() => open(member)}
	>
		<span
			class="flex shrink-0 justify-center"
			style="width: {width}px"
		>
			<Avatar
				name={member.name}
				{size}
				ring="ring-slate-200"
			/>
		</span>
		<span class="min-w-0 flex-1 {words}">
			<span class="block truncate text-sm text-slate-800">{member.name}</span>
			{#if member.title}<span class="block truncate text-xs text-slate-400">{member.title}</span
				>{/if}
		</span>
	</button>
{/each}
