<script lang="ts">
	// The how-to behind Install App (#203), for a browser that offers no one-tap install: three short steps for an
	// iPhone and three for an Android phone, in the sheet every other one is (it slides up on a phone and is a
	// centred pop-up from tablet width up). It opens on the tab of the phone it is read on (Justin, 2026-11-17: no
	// extra tap to reach your own steps), and on iPhone when the browser names neither; the other tab is one tap away.
	import Sheet from '#lib/components/sheet/sheet.svelte';
	import { toPhone, type PhoneType } from './install.utils';

	let { onclose }: { onclose: () => void } = $props();
	const uid = $props.id();

	const PHONES = [
		{
			id: 'iphone',
			label: 'iPhone',
			icon: 'icon-[mdi--apple]',
			steps: [
				{ text: 'Tap Share', icon: 'icon-[mdi--export-variant]' },
				{ text: 'Tap “Add to Home Screen”', icon: 'icon-[mdi--plus-box-outline]' },
				{ text: 'Tap Add', icon: '' }
			]
		},
		{
			id: 'android',
			label: 'Android',
			icon: 'icon-[mdi--android]',
			steps: [
				{ text: 'Open the browser menu', icon: 'icon-[mdi--dots-vertical]' },
				{ text: 'Tap “Install app” or “Add to Home screen”', icon: '' },
				{ text: 'Tap Install', icon: '' }
			]
		}
	] as const satisfies { id: PhoneType; label: string; icon: string; steps: unknown[] }[];

	// The how-to is only ever drawn after a tap, so the browser is there to ask.
	let picked = $state<PhoneType>(toPhone(navigator.userAgent) ?? 'iphone');
	const phone = $derived(PHONES.find((item) => item.id === picked) ?? PHONES[0]);
</script>

<Sheet
	label="Install App"
	{onclose}
>
	<div class="flex items-center gap-3">
		<span
			class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
			><span class="icon-[mdi--cellphone-arrow-down] size-6"></span></span
		>
		<p>
			<b class="block text-lg leading-snug text-slate-900">Install App</b>
			<span class="text-sm text-slate-500">Three steps to your home screen.</span>
		</p>
	</div>

	<div
		class="mt-5 grid grid-cols-2 rounded-full bg-slate-900/[0.05] p-1"
		role="tablist"
		aria-label="Your phone"
	>
		{#each PHONES as item (item.id)}
			<button
				type="button"
				class="flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition {picked ===
				item.id
					? 'bg-white text-slate-900 shadow-sm'
					: 'text-slate-500'}"
				role="tab"
				id="{uid}-{item.id}"
				aria-selected={picked === item.id}
				aria-controls="{uid}-steps"
				onclick={() => (picked = item.id)}
				><span class="{item.icon} size-[18px]"></span>{item.label}</button
			>
		{/each}
	</div>

	<!-- Three lines for either phone, each tall enough for two rows of words, so a change of tab moves nothing. -->
	<div
		role="tabpanel"
		id="{uid}-steps"
		aria-labelledby="{uid}-{phone.id}"
	>
		<ol class="mt-4 space-y-1">
			{#each phone.steps as step, index (step.text)}
				<li class="flex min-h-12 items-center gap-3 text-[15px] leading-snug text-slate-700">
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums"
						>{index + 1}</span
					>
					<span class="min-w-0 flex-1">{step.text}</span>
					{#if step.icon}<span class="{step.icon} size-5 shrink-0 text-slate-400"></span>{/if}
				</li>
			{/each}
		</ol>
	</div>
</Sheet>
