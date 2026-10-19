<script lang="ts">
	// PROTOTYPE (#161): A's phone bar, now floating with round corners (Justin's first run-3 note). Three finishes:
	// 'raised' (D) white with the blue + lifted out of it; 'dark' (E) a dark pill; 'glass' (F) frosted.
	import { NAV } from './look.data';
	import type { LookState } from './look.state.svelte';

	let { look, style = 'raised' }: { look: LookState; style?: 'raised' | 'dark' | 'glass' } =
		$props();

	const ME = {
		id: 'me',
		label: 'Me',
		icon: 'icon-[mdi--account-circle-outline]',
		active: 'icon-[mdi--account-circle]'
	};
	const LEFT = [NAV[0], NAV[1]];
	const RIGHT = [NAV[2], ME];

	function go(id: string) {
		look.navSection = id;
		if (id === 'projects') look.pick('projects');
	}

	const shell = $derived(
		style === 'dark'
			? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/40'
			: style === 'glass'
				? 'bg-white/70 shadow-xl shadow-slate-900/10 ring-1 ring-white/70 backdrop-blur-xl'
				: 'bg-white shadow-[0_2px_6px_rgb(15_23_42/0.06),0_18px_40px_-14px_rgb(15_23_42/0.3)]'
	);
</script>

{#snippet item(entry: (typeof NAV)[number] | typeof ME)}
	{@const isOn = look.navSection === entry.id}
	<button
		class="flex flex-col items-center gap-0.5 transition {isOn
			? style === 'dark'
				? 'text-white'
				: 'text-primary'
			: style === 'dark'
				? 'text-white/45'
				: 'text-slate-400'}"
		aria-current={isOn ? 'page' : undefined}
		onclick={() => go(entry.id)}
	>
		<span class="{isOn ? entry.active : entry.icon} size-6"></span>
		<span class="text-[10px] font-semibold">{entry.label}</span>
		{#if style === 'dark'}
			<span class="size-1 rounded-full {isOn ? 'bg-primary' : 'bg-transparent'}"></span>
		{/if}
	</button>
{/snippet}

<nav
	class="fixed inset-x-4 z-40 grid h-[68px] grid-cols-5 items-center rounded-[28px] md:hidden {shell}"
	style="bottom: calc(env(safe-area-inset-bottom) + 14px)"
>
	{#each LEFT as entry (entry.id)}{@render item(entry)}{/each}
	<button
		class="mx-auto flex items-center justify-center bg-primary text-white transition active:scale-95 {style ===
		'raised'
			? 'size-14 -translate-y-4 rounded-full shadow-lg ring-[6px] shadow-primary/40 ring-slate-100'
			: style === 'dark'
				? 'size-12 rounded-full shadow-lg shadow-primary/40'
				: 'size-12 rounded-2xl shadow-lg shadow-primary/30'}"
		aria-label="New project"
		onclick={() => (look.isNewOpen = true)}
	>
		<span class="icon-[mdi--plus] size-7"></span>
	</button>
	{#each RIGHT as entry (entry.id)}{@render item(entry)}{/each}
</nav>
