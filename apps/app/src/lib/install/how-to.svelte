<script lang="ts">
	// The how-to behind Install App (#203), for a browser that offers no one-tap install: three short steps for an
	// iPhone and three for an Android phone, in the sheet every other one is (it slides up on a phone and is a
	// centred pop-up from tablet width up). The User picks their phone; nothing here guesses it. iPhone comes first.
	import { Dialog, Tabs } from '@layerd/ui';

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
	] as const;

	// Raw, so the picked phone stays the very object in PHONES that the tabs compare it with.
	let phone = $state.raw<(typeof PHONES)[number]>(PHONES[0]);
</script>

<Dialog
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

	<Tabs
		class="mt-5 grid grid-cols-2 rounded-full bg-slate-900/[0.05] p-1"
		label="Your phone"
		options={PHONES}
		bind:value={phone}
	>
		{#snippet option({ value: item, isOn, props })}
			<button
				{...props}
				type="button"
				class="flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition {isOn
					? 'bg-white text-slate-900 shadow-sm'
					: 'text-slate-500'}"
				id="{uid}-{item.id}"
				aria-controls="{uid}-steps"
				><span class="{item.icon} size-[18px]"></span>{item.label}</button
			>
		{/snippet}
	</Tabs>

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
</Dialog>
